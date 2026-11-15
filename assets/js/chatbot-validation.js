export function validateName(value) {
    const name = value.trim().replace(/\s+/gu, ' ');
    if (name.length < 2 || name.length > 100) return null;
    if (!/^[\p{L}][\p{L}\p{M}]*(?:[ '\u2019-][\p{L}][\p{L}\p{M}]*)*$/u.test(name)) return null;
    return name;
}

export function normalizeIndianMobile(value) {
    const formattedNumber = value.trim();
    if (!/^\+?[\d\s()-]+$/u.test(formattedNumber)) return null;
    const digits = formattedNumber.replace(/\D/g, '');
    const nationalNumber = digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits;
    if (!/^[6-9]\d{9}$/.test(nationalNumber)) return null;
    return `+91${nationalNumber}`;
}

export function validateEmail(value) {
    const email = value.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email)) return null;
    return email;
}

export function validateLocation(value) {
    const location = value.trim().replace(/\s+/gu, ' ');
    return location.length >= 2 && location.length <= 300 ? location : null;
}

export function validateRequirements(value) {
    const requirements = value.trim();
    return requirements.length >= 3 && requirements.length <= 12000 ? requirements : null;
}

export function validateOtherService(value) {
    const description = value.trim();
    return description.length >= 2 && description.length <= 500 ? description : null;
}
