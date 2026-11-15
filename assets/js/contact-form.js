/**
 * Contact Form Module
 * - Full client-side validation
 * - Error states with inline messages
 * - WhatsApp fallback (no fake backend)
 * - Accessible status updates
 */

export function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const serviceInput = document.getElementById('service');
    const messageInput = document.getElementById('message');
    const submitBtn = document.getElementById('submit-btn');
    const formStatus = document.getElementById('form-status');

    const packageServices = {
        standard: 'Standard Package',
        premium: 'Premium Package',
        luxury: 'Luxury Package',
    };
    const requestedPackage = new URLSearchParams(window.location.search).get('package');
    if (requestedPackage && packageServices[requestedPackage]) {
        serviceInput.value = packageServices[requestedPackage];
    }

    // Validation rules
    function validateName() {
        const value = nameInput.value.trim();
        if (!value) return setError(nameInput, 'name-error', 'Please enter your name');
        if (value.length < 2 || value.length > 100 ||
            !/^[\p{L}][\p{L}\p{M}]*(?:[ '\u2019-][\p{L}][\p{L}\p{M}]*)*$/u.test(value)) {
            return setError(nameInput, 'name-error', 'Enter a valid name using letters, spaces, apostrophes, or hyphens');
        }
        return clearError(nameInput, 'name-error');
    }

    function validatePhone() {
        const value = phoneInput.value.trim();
        if (!value) return setError(phoneInput, 'phone-error', 'Please enter your phone number');
        const normalized = value.replace(/[\s()-]/g, '');
        if (!/^(?:\+?91)?[6-9]\d{9}$/.test(normalized)) {
            return setError(phoneInput, 'phone-error', 'Enter a valid 10-digit Indian mobile number');
        }
        return clearError(phoneInput, 'phone-error');
    }

    function validateEmail() {
        const value = emailInput.value.trim();
        if (!value) return setError(emailInput, 'email-error', 'Please enter your email address');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
            return setError(emailInput, 'email-error', 'Enter a valid email address');
        }
        return clearError(emailInput, 'email-error');
    }

    function validateService() {
        if (!serviceInput.value) {
            return setError(serviceInput, 'service-error', 'Please select a service');
        }
        return clearError(serviceInput, 'service-error');
    }

    function validateMessage() {
        const value = messageInput.value.trim();
        if (!value) return setError(messageInput, 'message-error', 'Please describe your project');
        if (value.length < 10) return setError(messageInput, 'message-error', 'Please provide more detail (min 10 characters)');
        return clearError(messageInput, 'message-error');
    }

    function setError(input, errorId, message) {
        input.classList.add('invalid');
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
        return false;
    }

    function clearError(input, errorId) {
        input.classList.remove('invalid');
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
        return true;
    }

    // Live validation on blur
    nameInput.addEventListener('blur', validateName);
    phoneInput.addEventListener('blur', validatePhone);
    emailInput.addEventListener('blur', validateEmail);
    serviceInput.addEventListener('change', validateService);
    messageInput.addEventListener('blur', validateMessage);

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const isNameValid = validateName();
        const isPhoneValid = validatePhone();
        const isEmailValid = validateEmail();
        const isServiceValid = validateService();
        const isMessageValid = validateMessage();

        if (!isNameValid || !isPhoneValid || !isEmailValid || !isServiceValid || !isMessageValid) {
            formStatus.textContent = 'Please fix the errors above before submitting.';
            formStatus.className = 'form-status mt-3 error';
            return;
        }

        const whatsappMessage = [
            'New Enquiry - Fine Line Projects',
            '',
            `Name: ${nameInput.value.trim()}`,
            `Phone: ${phoneInput.value.trim()}`,
            `Email: ${emailInput.value.trim()}`,
            `Service: ${serviceInput.value}`,
            '',
            'Project Description:',
            messageInput.value.trim(),
        ].join('\n');
        const whatsappUrl = new URL('https://wa.me/919448481494');
        whatsappUrl.searchParams.set('text', whatsappMessage);

        window.location.assign(whatsappUrl.toString());
    });
}