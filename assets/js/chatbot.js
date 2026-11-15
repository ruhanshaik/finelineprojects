import { createRequestId, submitEnquiry } from './chatbot-api.js';
import {
    CHATBOT_PROMPTS,
    CHATBOT_SERVICES,
    createEnquiry,
    getProgress,
} from './chatbot-flow.js';
import {
    normalizeIndianMobile,
    validateEmail,
    validateLocation,
    validateName,
    validateOtherService,
    validateRequirements,
} from './chatbot-validation.js';

const WELCOME_TITLE = "Hiii! Welcome to Fine Line AI Chatbot 👋";
const WELCOME_COPY = "Welcome to Fine Line Projects! We're happy to help you plan your dream home, interiors or construction project.\n\nI'd love to understand what you're looking for. Let's get started!";
const SUBMISSION_ERROR = "Sorry! We couldn't submit your enquiry right now. Your details are still here. Please try again.";
const FIELD_CONFIG = Object.freeze({
    name: {
        label: 'Your name',
        type: 'text',
        autocomplete: 'name',
        placeholder: 'Enter your name',
        maxLength: 100,
    },
    mobile: {
        label: 'Mobile number',
        type: 'tel',
        autocomplete: 'tel',
        placeholder: '+91 94484 81494',
        maxLength: 20,
    },
    email: {
        label: 'Email address',
        type: 'email',
        autocomplete: 'email',
        placeholder: 'you@example.com',
        maxLength: 254,
    },
    location: {
        label: 'Project address or location',
        type: 'text',
        autocomplete: 'street-address',
        placeholder: 'Locality, city, state or PIN code',
        maxLength: 300,
    },
});

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function createButton(text, className, onClick) {
    const button = createElement('button', className, text);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
}

function getSourcePage() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    return ['index.html', 'projects.html', 'services.html', 'about.html', 'contact.html'].includes(page)
        ? page
        : 'index.html';
}

export function initChatbot() {
    const root = document.querySelector('[data-chatbot-root]');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    root.innerHTML = `
        <button class="chatbot-launcher" type="button" aria-label="Open Fine Line Projects enquiry chatbot" aria-expanded="false" aria-controls="fine-line-chatbot">
            <img class="chatbot-logo" src="assets/images/chatbot-logo.png" alt="" aria-hidden="true">
            <span class="chatbot-online-dot" aria-hidden="true"></span>
        </button>
        <span class="chatbot-status-bubble">Hiii! I'm online</span>
        <section class="chatbot-panel" id="fine-line-chatbot" role="dialog" aria-modal="false" aria-label="Fine Line Projects AI Chatbot" aria-hidden="true" inert>
            <header class="chatbot-header">
                <div class="chatbot-brand">
                    <span class="chatbot-brand-icon"><img src="assets/images/chatbot-logo.png" alt="" aria-hidden="true"></span>
                    <span class="chatbot-brand-copy"><strong>Fine Line Projects</strong><span>AI assistant · Online</span></span>
                </div>
                <button class="chatbot-close" type="button" aria-label="Close chatbot"><i data-lucide="x" aria-hidden="true"></i></button>
            </header>
            <div class="chatbot-progress" role="progressbar" aria-label="Enquiry progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="chatbot-progress-bar"></div>
            </div>
            <div class="chatbot-messages" aria-live="polite" aria-relevant="additions text"></div>
            <div class="chatbot-composer"></div>
        </section>`;

    const launcher = root.querySelector('.chatbot-launcher');
    const statusBubble = root.querySelector('.chatbot-status-bubble');
    const panel = root.querySelector('.chatbot-panel');
    const closeButton = root.querySelector('.chatbot-close');
    const messages = root.querySelector('.chatbot-messages');
    const composer = root.querySelector('.chatbot-composer');
    const progress = root.querySelector('.chatbot-progress');
    const progressBar = root.querySelector('.chatbot-progress-bar');
    const state = createEnquiry(getSourcePage());
    let hasWelcomed = false;
    let currentStep = 'start';
    let requestId = '';
    let submitting = false;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root });

    function scrollToLatest() {
        messages.scrollTop = messages.scrollHeight;
    }

    function addMessage(text, sender = 'assistant') {
        const message = createElement(
            'div',
            sender === 'user' ? 'chatbot-message chatbot-message--user' : 'chatbot-message'
        );
        message.textContent = text;
        messages.append(message);
        scrollToLatest();
        return message;
    }

    function addWelcomeMessage() {
        const message = createElement('div', 'chatbot-message chatbot-message--welcome');
        const title = createElement('strong', 'chatbot-welcome-title', WELCOME_TITLE);
        const copy = createElement('p', '', "Welcome to Fine Line Projects! We're happy to help you plan your dream home, interiors or construction project.");
        const invitation = createElement('p', '', "I'd love to understand what you're looking for. Let's get started!");
        message.append(title, copy, invitation);
        messages.append(message);
        scrollToLatest();
    }

    function showTyping() {
        const indicator = createElement('div', 'chatbot-message');
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-label', 'Fine Line assistant is typing');
        indicator.innerHTML = '<span class="chatbot-typing" aria-hidden="true"><span></span><span></span><span></span></span>';
        messages.append(indicator);
        scrollToLatest();
        return indicator;
    }

    function say(text) {
        const typing = showTyping();
        return new Promise((resolve) => {
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.setTimeout(() => {
                typing.remove();
                const message = addMessage('');
                message.classList.add('chatbot-message--typing-text');
                message.setAttribute('aria-live', 'off');

                if (reducedMotion) {
                    message.textContent = text;
                    message.classList.remove('chatbot-message--typing-text');
                    message.removeAttribute('aria-live');
                    resolve();
                    return;
                }

                const characters = Array.from(text);
                let index = 0;
                const typingTimer = window.setInterval(() => {
                    index = Math.min(index + 1, characters.length);
                    message.textContent = characters.slice(0, index).join('');
                    if (index % 4 === 0 || index >= characters.length) scrollToLatest();
                    if (index >= characters.length) {
                        window.clearInterval(typingTimer);
                        message.classList.remove('chatbot-message--typing-text');
                        message.removeAttribute('aria-live');
                        resolve();
                    }
                }, 18);
            }, reducedMotion ? 50 : 350);
        });
    }

    function setProgress(step) {
        const value = getProgress(step);
        progress.setAttribute('aria-valuenow', String(value));
        progressBar.style.width = `${value}%`;
    }

    function openChat() {
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        panel.inert = false;
        launcher.setAttribute('aria-expanded', 'true');
        launcher.hidden = true;
        statusBubble.hidden = true;

        if (!hasWelcomed) {
            hasWelcomed = true;
            addWelcomeMessage();
            renderWelcomeAction();
        }

        const firstControl = composer.querySelector('button, input, textarea');
        if (firstControl) firstControl.focus();
    }

    function closeChat() {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        panel.inert = true;
        launcher.setAttribute('aria-expanded', 'false');
        launcher.hidden = false;
        statusBubble.hidden = false;
        launcher.focus();
    }

    function setComposer(...children) {
        composer.replaceChildren(...children);
        scrollToLatest();
    }

    function renderWelcomeAction() {
        setProgress('start');
        const start = createButton('Get Started', 'chatbot-action', async () => {
            start.disabled = true;
            addMessage('Get started', 'user');
            await showStep('name');
        });
        const actions = createElement('div', 'chatbot-action-row');
        actions.append(start);
        setComposer(actions);
    }

    function errorTextFor(step) {
        if (step === 'name') return 'Heyy dude! 😄 Please enter your correct name so I know what to call you.';
        if (step === 'mobile') return 'Please enter a valid Indian mobile number, with or without the +91 prefix.';
        if (step === 'email') return 'Please enter a valid email address.';
        if (step === 'location') return 'Please enter a project location so our team knows where you are planning.';
        if (step === 'otherService') return 'Please tell us a little more about the other service you need.';
        return 'Please add a few details about your project (up to 12,000 characters).';
    }

    function validateField(step, value) {
        if (step === 'name') return validateName(value);
        if (step === 'mobile') return normalizeIndianMobile(value);
        if (step === 'email') return validateEmail(value);
        if (step === 'location') return validateLocation(value);
        if (step === 'otherService') return validateOtherService(value);
        if (step === 'requirements') return validateRequirements(value);
        return null;
    }

    function renderField(step) {
        const config = FIELD_CONFIG[step];
        const isLongText = step === 'requirements' || step === 'otherService';
        const labelText = step === 'requirements'
            ? 'Tell us more about your requirements'
            : step === 'otherService'
                ? 'Other service you are looking for'
                : config.label;
        const placeholder = step === 'requirements'
            ? "Describe your dream home, construction plans, interior requirements, plot details, budget, preferred design or anything else you'd like us to know..."
            : step === 'otherService'
                ? 'Describe the service you need'
                : config.placeholder;

        const form = createElement('form', 'chatbot-field-form');
        const label = createElement('label', 'chatbot-input-label', labelText);
        const input = createElement(isLongText ? 'textarea' : 'input', isLongText ? 'chatbot-textarea' : 'chatbot-input');
        const inputId = `chatbot-${step}`;
        input.id = inputId;
        input.name = step;
        input.required = true;
        input.placeholder = placeholder;
        if (isLongText) {
            input.maxLength = step === 'requirements' ? 12000 : 500;
            if (step === 'requirements') input.rows = 4;
            input.value = state[step];
        } else {
            input.type = config.type;
            input.autocomplete = config.autocomplete;
            input.maxLength = config.maxLength;
            input.value = state[step];
            input.autocapitalize = step === 'name' ? 'words' : 'off';
        }
        label.htmlFor = inputId;

        const honeypotLabel = createElement('label', 'chatbot-honeypot', 'Leave this field empty');
        const honeypot = createElement('input', 'chatbot-honeypot');
        honeypot.name = 'website';
        honeypot.tabIndex = -1;
        honeypot.autocomplete = 'off';
        honeypot.setAttribute('aria-hidden', 'true');
        const error = createElement('p', 'chatbot-error');
        error.setAttribute('role', 'alert');
        error.hidden = true;
        const actions = createElement('div', 'chatbot-action-row');
        const submit = createElement('button', 'chatbot-send', 'Continue');
        submit.type = 'submit';
        actions.append(submit);
        form.append(label, input, honeypotLabel, honeypot, error, actions);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            error.hidden = true;
            const value = validateField(step, input.value);
            if (!value) {
                error.textContent = errorTextFor(step);
                error.hidden = false;
                input.focus();
                return;
            }

            state[step] = value;
            if (step === 'name') {
                addMessage(value, 'user');
                submit.disabled = true;
                await say(`Hii ${value}! Nice to meet you. 😊`);
                await showStep('mobile');
                return;
            }
            addMessage(value, 'user');
            submit.disabled = true;

            if (step === 'mobile') await showStep('email');
            else if (step === 'email') await showStep('location');
            else if (step === 'location') await showStep('services');
            else if (step === 'otherService') await showStep('requirements');
            else if (step === 'requirements') await showReview();
        });

        setComposer(form);
        input.focus();
    }

    async function showStep(step, { announce = true } = {}) {
        currentStep = step;
        setProgress(step);
        if (announce) {
            const prompt = typeof CHATBOT_PROMPTS[step] === 'function'
                ? CHATBOT_PROMPTS[step](state.name)
                : CHATBOT_PROMPTS[step];
            await say(prompt);
        }

        if (step === 'services') renderServices();
        else renderField(step);
    }

    function renderServices() {
        const wrapper = createElement('div', 'chatbot-service-step');
        const groupLabel = createElement('p', 'chatbot-input-label', 'Choose at least one service. “Other” is optional.');
        const services = createElement('div', 'chatbot-services');
        services.setAttribute('role', 'group');
        services.setAttribute('aria-label', 'Available Fine Line Projects services');
        const error = createElement('p', 'chatbot-error', 'Please select at least one service.');
        error.setAttribute('role', 'alert');
        error.hidden = true;

        CHATBOT_SERVICES.forEach((service) => {
            const card = createButton(
                service,
                `chatbot-service${state.services.includes(service) ? ' is-selected' : ''}`,
                () => {
                    if (state.services.includes(service)) {
                        state.services = state.services.filter((item) => item !== service);
                    } else {
                        state.services = [...state.services, service];
                    }
                    card.classList.toggle('is-selected', state.services.includes(service));
                    card.setAttribute('aria-pressed', String(state.services.includes(service)));
                    error.hidden = true;
                }
            );
            card.setAttribute('aria-pressed', String(state.services.includes(service)));
            services.append(card);
        });

        const actions = createElement('div', 'chatbot-action-row');
        const next = createButton('Continue', 'chatbot-action', async () => {
            if (!state.services.length) {
                error.hidden = false;
                return;
            }
            next.disabled = true;
            addMessage(state.services.join(', '), 'user');
            if (state.services.includes('Other')) await showStep('otherService');
            else await showStep('requirements');
        });
        actions.append(next);
        wrapper.append(groupLabel, services, error, actions);
        setComposer(wrapper);
    }

    function addReviewRow(list, label, value) {
        const row = createElement('div', 'chatbot-review-row');
        row.append(createElement('strong', '', label), createElement('span', '', value || '—'));
        list.append(row);
    }

    async function showReview() {
        currentStep = 'review';
        setProgress('review');
        await say("Let's Review Your Enquiry");

        const review = createElement('div', 'chatbot-message chatbot-message--welcome');
        const title = createElement('strong', 'chatbot-welcome-title', "Let's Review Your Enquiry");
        const rows = createElement('div', 'chatbot-review');
        addReviewRow(rows, 'Name', state.name);
        addReviewRow(rows, 'Mobile', state.mobile);
        addReviewRow(rows, 'Email', state.email);
        addReviewRow(rows, 'Project location', state.location);
        addReviewRow(rows, 'Services', state.services.join(', '));
        addReviewRow(rows, 'Other service', state.otherService);
        addReviewRow(rows, 'Requirements', state.requirements);
        review.append(title, rows);
        messages.append(review);
        scrollToLatest();

        const form = createElement('form', 'chatbot-review-form');
        const consentLabel = createElement(
            'label',
            'chatbot-consent',
            'By submitting this enquiry, you agree that Fine Line Projects may contact you regarding your project requirements.'
        );
        const consent = createElement('input');
        consent.type = 'checkbox';
        consent.name = 'consent';
        consent.checked = false;
        state.consent = false;
        consentLabel.prepend(consent);
        const error = createElement('p', 'chatbot-error');
        error.setAttribute('role', 'alert');
        error.hidden = true;
        const actions = createElement('div', 'chatbot-action-row');
        const edit = createButton('Edit Details', 'chatbot-action chatbot-action--secondary', async () => {
            addMessage('Edit my details', 'user');
            await say('Of course! Let’s go through your details again.');
            await showStep('name', { announce: false });
        });
        const submit = createElement('button', 'chatbot-send', 'Submit Enquiry');
        submit.type = 'submit';
        actions.append(edit, submit);
        form.append(consentLabel, error, actions);

        consent.addEventListener('change', () => {
            state.consent = consent.checked;
            error.hidden = true;
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!consent.checked) {
                error.textContent = 'Please agree to be contacted before submitting your enquiry.';
                error.hidden = false;
                consent.focus();
                return;
            }
            state.consent = true;
            await submitCurrentEnquiry(form, submit);
        });

        setComposer(form);
    }

    async function submitCurrentEnquiry(form, submitButton) {
        if (submitting) return;
        submitting = true;
        submitButton.disabled = true;
        addMessage('Submit Enquiry', 'user');
        const loadingMessage = showTyping();

        try {
            if (!requestId) requestId = createRequestId();
            const result = await submitEnquiry(state, requestId);
            requestId = result.requestId;
            loadingMessage.remove();
            setProgress('complete');
            progress.setAttribute('aria-valuenow', '100');
            progressBar.style.width = '100%';

            const success = createElement('div', 'chatbot-message chatbot-message--welcome');
            const title = createElement('strong', 'chatbot-welcome-title', `Thank You, ${state.name}! 🎉`);
            const confirmation = createElement('p', '', 'Your enquiry has been successfully submitted to Fine Line Projects.');
            const followUp = createElement('p', '', 'Our team will review your requirements and get in touch with you soon.');
            const enquiryId = createElement('p', '', `Enquiry ID: ${result.enquiryId}`);
            success.append(title, confirmation, followUp, enquiryId);
            messages.append(success);
            setComposer();
        } catch (error) {
            console.warn('Fine Line enquiry submission failed.', error);
            loadingMessage.remove();
            addMessage(error instanceof Error && error.message
                ? `${SUBMISSION_ERROR}\n\n${error.message}`
                : SUBMISSION_ERROR);
            const retry = createButton('Retry', 'chatbot-action', async () => {
                if (submitting) return;
                retry.disabled = true;
                await submitCurrentEnquiry(form, retry);
            });
            setComposer(retry);
        } finally {
            submitting = false;
        }
    }

    launcher.addEventListener('click', openChat);
    closeButton.addEventListener('click', closeChat);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && panel.classList.contains('is-open')) closeChat();
    });

    panel.addEventListener('transitionend', (event) => {
        if (event.target === panel && panel.classList.contains('is-open')) {
            const control = composer.querySelector('button, input, textarea');
            if (control && !panel.contains(document.activeElement)) control.focus();
        }
    });
}
