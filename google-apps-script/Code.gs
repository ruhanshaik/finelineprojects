const SPREADSHEET_ID = '1jjMMNX_0TmwtSWXMmUg2XlEvUqZ7aPAYDrUs6-pxk3M';
const SHEET_NAME = 'Customer Enquiries';
const TIME_ZONE = 'Asia/Kolkata';
const MAX_REQUEST_BYTES = 32768;
const MAX_REQUIREMENTS_LENGTH = 12000;
const MAX_IDEMPOTENCY_KEYS = 3000;
const IDEMPOTENCY_RETENTION_DAYS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 600;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;

const REQUIRED_HEADERS = [
    'Enquiry ID',
    'Submission Date',
    'Submission Time',
    'Customer Name',
    'Mobile Number',
    'Email Address',
    'Project Address / Location',
    'Selected Services',
    'Other Service Description',
    'Project Requirements',
    'Website Source Page',
    'Enquiry Status',
    'Customer Consent',
];

const ALLOWED_SERVICES = [
    'Conceptual Innovative Building Plans & Designs',
    'Site Visit & Supervision',
    'Project Management Consultants',
    'Vastu Consultants',
    'Turnkey Projects',
    'Layout Planners & Developers',
    'Architectural Service',
    'General Contracting',
    'Home Construction Packages',
    'Interior Design',
    'Other',
];

const ALLOWED_SOURCE_PAGES = [
    'index.html',
    'projects.html',
    'services.html',
    'about.html',
    'contact.html',
];

function doGet() {
    return jsonResponse({
        success: true,
        service: 'Fine Line Projects Enquiry API',
        method: 'POST',
    });
}

function doPost(event) {
    try {
        const requestBody = event && event.postData && event.postData.contents;
        if (typeof requestBody !== 'string' ||
            Utilities.newBlob(requestBody, 'text/plain').getBytes().length > MAX_REQUEST_BYTES) {
            return jsonResponse(failure('VALIDATION_ERROR', 'The enquiry is empty or too large.'));
        }

        let submitted;
        try {
            submitted = JSON.parse(requestBody);
        } catch (error) {
            return jsonResponse(failure('VALIDATION_ERROR', 'The enquiry could not be read.'));
        }

        const validation = validateEnquiry(submitted);
        if (!validation.success) return jsonResponse(validation);

        const lock = LockService.getScriptLock();
        if (!lock.tryLock(10000)) {
            return jsonResponse(failure('SERVICE_BUSY', 'The enquiry service is busy. Please retry.'));
        }

        try {
            const properties = PropertiesService.getScriptProperties();
            const idempotencyKey = submitted.requestId;
            const idempotencyProperty = getIdempotencyPropertyName(idempotencyKey);
            const previousResult = properties.getProperty(idempotencyProperty);
            if (previousResult) {
                const saved = JSON.parse(previousResult);
                return jsonResponse({
                    success: true,
                    enquiryId: saved.enquiryId,
                    duplicate: true,
                });
            }

            if (!takeRateLimitToken(validation.enquiry.mobile, validation.enquiry.email)) {
                return jsonResponse(failure('RATE_LIMITED', 'Too many enquiries. Please try again later.'));
            }

            const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
            const sheet = getOrCreateEnquirySheet(spreadsheet);
            const now = new Date();
            const enquiryId = createUniqueEnquiryId(now, spreadsheet);
            const row = [
                enquiryId,
                Utilities.formatDate(now, TIME_ZONE, 'yyyy-MM-dd'),
                Utilities.formatDate(now, TIME_ZONE, 'HH:mm:ss'),
                safeCellText(validation.enquiry.name),
                safeCellText(validation.enquiry.mobile),
                safeCellText(validation.enquiry.email),
                safeCellText(validation.enquiry.location),
                safeCellText(validation.enquiry.services.join(', ')),
                safeCellText(validation.enquiry.otherService),
                safeCellText(validation.enquiry.requirements),
                safeCellText(validation.enquiry.sourcePage),
                'NEW',
                'YES',
            ];

            sheet.appendRow(row);
            const result = { enquiryId: enquiryId, createdAt: now.getTime() };
            properties.setProperty(idempotencyProperty, JSON.stringify(result));
            pruneIdempotencyProperties(properties, now.getTime());

            return jsonResponse({ success: true, enquiryId: enquiryId });
        } finally {
            lock.releaseLock();
        }
    } catch (error) {
        console.error('Enquiry submission failed.', error && error.stack ? error.stack : error);
        return jsonResponse(failure('INTERNAL_ERROR', 'The enquiry could not be saved right now.'));
    }
}

function setupCustomerEnquiries() {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    spreadsheet.setSpreadsheetTimeZone(TIME_ZONE);

    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
        sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length)
            .setFontWeight('bold')
            .setBackground('#263C32')
            .setFontColor('#F5F1E9');
        sheet.autoResizeColumns(1, REQUIRED_HEADERS.length);
        return 'Created the Customer Enquiries tab and added the required headers.';
    }

    const existingHeaders = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).getDisplayValues()[0];
    const headersMatch = REQUIRED_HEADERS.every((header, index) => existingHeaders[index] === header);
    if (!headersMatch) {
        throw new Error(
            'The existing Customer Enquiries tab has different or incomplete headers. ' +
            'No sheet data was changed. Review the first row before running setup again.'
        );
    }

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#263C32')
        .setFontColor('#F5F1E9');
    return 'Customer Enquiries already exists with the required headers. Existing enquiries were preserved.';
}

function getOrCreateEnquirySheet(spreadsheet) {
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Run setupCustomerEnquiries() before accepting enquiries.');

    const headers = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).getDisplayValues()[0];
    if (!REQUIRED_HEADERS.every((header, index) => headers[index] === header)) {
        throw new Error('The Customer Enquiries headers do not match the required format.');
    }
    return sheet;
}

function validateEnquiry(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return failure('VALIDATION_ERROR', 'The enquiry must be a JSON object.');
    }

    const requestId = readText(input.requestId, 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
        return failure('VALIDATION_ERROR', 'A valid submission request ID is required.');
    }

    if (typeof input.website !== 'string' || input.website.length > 200 || input.website.trim()) {
        return failure('VALIDATION_ERROR', 'The enquiry could not be accepted.');
    }

    const name = readText(input.name, 100).replace(/\s+/g, ' ');
    if (name.length < 2 || !/^[\p{L}][\p{L}\p{M}]*(?:[ '\u2019-][\p{L}][\p{L}\p{M}]*)*$/u.test(name)) {
        return failure('VALIDATION_ERROR', 'Enter a valid customer name.');
    }

    const mobile = normalizeIndianMobile(input.mobile);
    if (!mobile) return failure('VALIDATION_ERROR', 'Enter a valid Indian mobile number.');

    const email = readText(input.email, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return failure('VALIDATION_ERROR', 'Enter a valid email address.');
    }

    const location = readText(input.location, 300).replace(/\s+/g, ' ');
    if (location.length < 2) return failure('VALIDATION_ERROR', 'Enter a project location.');

    if (!Array.isArray(input.services) || input.services.length < 1 ||
        input.services.length > ALLOWED_SERVICES.length) {
        return failure('VALIDATION_ERROR', 'Select one or more valid services.');
    }

    const services = [];
    for (let index = 0; index < input.services.length; index += 1) {
        const service = readText(input.services[index], 100);
        if (ALLOWED_SERVICES.indexOf(service) === -1 || services.indexOf(service) !== -1) {
            return failure('VALIDATION_ERROR', 'The selected services are invalid.');
        }
        services.push(service);
    }

    const otherService = readText(input.otherService, 500);
    if (services.indexOf('Other') !== -1 && otherService.length < 2) {
        return failure('VALIDATION_ERROR', 'Describe the other service you need.');
    }
    if (services.indexOf('Other') === -1 && otherService) {
        return failure('VALIDATION_ERROR', 'An other-service description needs the Other service selected.');
    }

    const requirements = readText(input.requirements, MAX_REQUIREMENTS_LENGTH);
    if (requirements.length < 3) {
        return failure('VALIDATION_ERROR', 'Add a few details about your project requirements.');
    }

    const sourcePage = readText(input.sourcePage, 30);
    if (ALLOWED_SOURCE_PAGES.indexOf(sourcePage) === -1) {
        return failure('VALIDATION_ERROR', 'The website source page is invalid.');
    }
    if (input.consent !== true) {
        return failure('VALIDATION_ERROR', 'Customer consent is required.');
    }

    return {
        success: true,
        enquiry: {
            requestId: requestId,
            name: name,
            mobile: mobile,
            email: email,
            location: location,
            services: services,
            otherService: otherService,
            requirements: requirements,
            sourcePage: sourcePage,
        },
    };
}

function normalizeIndianMobile(value) {
    const input = readText(value, 30);
    if (!/^\+?[\d\s()-]+$/.test(input)) return '';
    const digits = input.replace(/\D/g, '');
    const nationalNumber = digits.length === 12 && digits.indexOf('91') === 0
        ? digits.slice(2)
        : digits;
    return /^[6-9]\d{9}$/.test(nationalNumber) ? '+91' + nationalNumber : '';
}

function readText(value, maxLength) {
    if (typeof value !== 'string') return '';
    const normalized = value.replace(/\u0000/g, '').trim();
    return normalized.length <= maxLength ? normalized : '';
}

function safeCellText(value) {
    const text = String(value);
    return /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? "'" + text : text;
}

function createUniqueEnquiryId(date, spreadsheet) {
    const datePart = Utilities.formatDate(date, TIME_ZONE, 'yyyyMMdd');
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
        const enquiryId = 'FLP-' + datePart + '-' + suffix;
        if (!sheet.createTextFinder(enquiryId).matchEntireCell(true).findNext()) return enquiryId;
    }
    throw new Error('Unable to generate a unique enquiry ID.');
}

function takeRateLimitToken(mobile, email) {
    const cache = CacheService.getScriptCache();
    const identity = digestForKey(mobile + '|' + email);
    const key = 'rate_' + identity;
    const currentCount = Number(cache.get(key) || 0);
    if (currentCount >= RATE_LIMIT_MAX_SUBMISSIONS) return false;
    cache.put(key, String(currentCount + 1), RATE_LIMIT_WINDOW_SECONDS);
    return true;
}

function digestForKey(value) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '').slice(0, 32);
}

function getIdempotencyPropertyName(requestId) {
    return 'enquiry_request_' + requestId.toLowerCase();
}

function pruneIdempotencyProperties(properties, now) {
    const allProperties = properties.getProperties();
    const entries = [];
    const retentionMillis = IDEMPOTENCY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    Object.keys(allProperties).forEach(function (key) {
        if (key.indexOf('enquiry_request_') !== 0) return;
        let entry;
        try {
            entry = JSON.parse(allProperties[key]);
        } catch (error) {
            properties.deleteProperty(key);
            return;
        }
        if (!entry || !Number.isFinite(entry.createdAt) || now - entry.createdAt > retentionMillis) {
            properties.deleteProperty(key);
            return;
        }
        entries.push({ key: key, createdAt: entry.createdAt });
    });

    entries.sort(function (a, b) { return a.createdAt - b.createdAt; });
    while (entries.length > MAX_IDEMPOTENCY_KEYS) {
        properties.deleteProperty(entries.shift().key);
    }
}

function failure(code, message) {
    return { success: false, code: code, message: message };
}

function jsonResponse(value) {
    return ContentService
        .createTextOutput(JSON.stringify(value))
        .setMimeType(ContentService.MimeType.JSON);
}
