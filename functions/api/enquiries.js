const MAX_BODY_BYTES = 32 * 1024;
const SCRIPT_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

export async function onRequestPost({ request, env }) {
    const requestOrigin = request.headers.get('Origin');
    if (requestOrigin !== new URL(request.url).origin) {
        return jsonResponse({ success: false, message: 'This request origin is not allowed.' }, 403);
    }

    const limiter = env.ENQUIRY_RATE_LIMIT;
    if (!limiter || typeof limiter.limit !== 'function') {
        return jsonResponse({ success: false, message: 'The enquiry service is not configured.' }, 503);
    }

    const clientIp = request.headers.get('CF-Connecting-IP');
    if (!clientIp) {
        return jsonResponse({ success: false, message: 'The request could not be verified.' }, 403);
    }

    const limitResult = await limiter.limit({ key: clientIp });
    if (!limitResult.success) {
        return jsonResponse({ success: false, message: 'Too many enquiries. Please try again later.' }, 429);
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
        return jsonResponse({ success: false, message: 'A JSON enquiry is required.' }, 415);
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
        return jsonResponse({ success: false, message: 'The enquiry is too large.' }, 413);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ success: false, message: 'The enquiry could not be read.' }, 400);
    }

    if (new TextEncoder().encode(JSON.stringify(body)).length > MAX_BODY_BYTES) {
        return jsonResponse({ success: false, message: 'The enquiry is too large.' }, 413);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.website !== 'string') {
        return jsonResponse({ success: false, message: 'The enquiry is incomplete.' }, 400);
    }
    if (body.website.trim()) {
        return jsonResponse({ success: false, message: 'The enquiry could not be accepted.' }, 400);
    }

    const scriptUrl = env.APPS_SCRIPT_URL;
    if (typeof scriptUrl !== 'string' || !SCRIPT_URL_PATTERN.test(scriptUrl)) {
        return jsonResponse({ success: false, message: 'The enquiry service is not configured.' }, 503);
    }

    try {
        const upstreamResponse = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: JSON.stringify(body),
            redirect: 'follow',
        });
        const upstreamText = await upstreamResponse.text();
        let upstreamResult;
        try {
            upstreamResult = JSON.parse(upstreamText);
        } catch {
            console.error('Apps Script returned a non-JSON response.', upstreamResponse.status);
            return jsonResponse({
                success: false,
                message: 'The Apps Script web app did not return JSON. Confirm the deployment is active and accessible to anyone.',
            }, 502);
        }

        if (upstreamResult?.success === true &&
            typeof upstreamResult.enquiryId === 'string' &&
            /^FLP-\d{8}-[A-Z0-9]{6,12}$/.test(upstreamResult.enquiryId)) {
            return jsonResponse({ success: true, enquiryId: upstreamResult.enquiryId }, 200);
        }

        const clientError = upstreamResult?.code === 'VALIDATION_ERROR' ||
            upstreamResult?.code === 'DUPLICATE_REQUEST';
        return jsonResponse({
            success: false,
            message: typeof upstreamResult?.message === 'string'
                ? upstreamResult.message
                : 'The enquiry could not be saved.',
        }, clientError ? 400 : 502);
    } catch (error) {
        console.error('Apps Script enquiry forwarding failed.', error);
        return jsonResponse({ success: false, message: 'The enquiry service could not be reached.' }, 502);
    }
}
