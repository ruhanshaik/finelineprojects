const ENQUIRY_ENDPOINT = '/api/enquiries';

export function createRequestId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function submitEnquiry(enquiry, requestId) {
    const idempotencyKey = requestId || createRequestId();
    const response = await fetch(ENQUIRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...enquiry, requestId: idempotencyKey }),
        credentials: 'same-origin',
        redirect: 'error',
    });

    const responseText = await response.text();
    let result;
    try {
        result = JSON.parse(responseText);
    } catch (error) {
        if (response.status === 405) {
            throw new Error(
                'The website host rejected the POST request (HTTP 405). Deploy this site on Cloudflare Pages ' +
                'with its Pages Function at functions/api/enquiries.js enabled; static-only hosting cannot submit enquiries.',
                { cause: error }
            );
        }

        const contentType = response.headers.get('Content-Type') || '';
        const responseType = contentType.toLowerCase().includes('text/html')
            ? 'an HTML page'
            : 'a non-JSON response';
        throw new Error(`The website enquiry endpoint returned ${responseType} (HTTP ${response.status}).`, { cause: error });
    }

    if (!response.ok || result?.success !== true ||
        typeof result.enquiryId !== 'string' ||
        !/^FLP-\d{8}-[A-Z0-9]{6,12}$/.test(result.enquiryId)) {
        const message = typeof result?.message === 'string'
            ? result.message
            : 'The enquiry service could not confirm submission.';
        throw new Error(message);
    }

    return { enquiryId: result.enquiryId, requestId: idempotencyKey };
}
