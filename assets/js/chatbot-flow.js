export const CHATBOT_SERVICES = Object.freeze([
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
]);

export const CHATBOT_STEPS = Object.freeze([
    'name',
    'mobile',
    'email',
    'location',
    'services',
    'otherService',
    'requirements',
    'review',
]);

export const CHATBOT_PROMPTS = Object.freeze({
    name: 'First things first! May I know your name? 😊',
    mobile: 'Lovely! Could you share your mobile number so our team can contact you?',
    email: "What's your email address? We'd love to keep you updated about your enquiry.",
    location: 'Where are you planning your project?',
    services: (name) => `Great, ${name}! What services are you interested in? You can select one or multiple services. 😊`,
    otherService: "That's interesting! Could you tell us what other service you're looking for?",
    requirements: (name) => `Almost there, ${name}! Tell us a little more about what you need. 😊`,
});

export function createEnquiry(sourcePage) {
    return {
        name: '',
        mobile: '',
        email: '',
        location: '',
        services: [],
        otherService: '',
        requirements: '',
        consent: false,
        sourcePage,
        website: '',
    };
}

export function getProgress(step) {
    if (step === 'start') return 0;
    if (step === 'review') return 95;
    const index = CHATBOT_STEPS.indexOf(step);
    return Math.max(0, Math.round(((index + 1) / CHATBOT_STEPS.length) * 100));
}
