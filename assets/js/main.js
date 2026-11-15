import { initSmoothScroll } from './smooth-scroll.js';
import { initScrollAnimations } from './scroll-animation.js';
import { initProjects } from './projects.js';
import { initContactForm } from './contact-form.js';

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof gsap !== 'undefined') {
        document.body.classList.add('gsap-ready');
    }

    // 1. Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const currentYear = String(new Date().getFullYear());
    document.querySelectorAll('[data-current-year]').forEach((year) => {
        year.textContent = currentYear;
    });

    // 2. Hand-drawn text annotations
    initTextAnnotations();

    // 3. Smooth Scroll (after GSAP is loaded)
    // Note: Lenis requires GSAP to be loaded first
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof Lenis !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        initSmoothScroll();
    }

    // 4. Navigation (Mobile Menu + Sticky Header)
    initNavigation();

    // 5. Projects filtering and lightbox
    initProjects();

    // 6. Contact form validation and WhatsApp submission
    initContactForm();

    // 7. Home page planning guide request
    initGuideRequestForm();

    // 8. Page Loader (triggers hero animations)
    initPageLoader();
});

function initTextAnnotations() {
    const targets = document.querySelectorAll('.annotation-target');
    if (!targets.length) return;

    targets.forEach((target) => {
        const color = target.dataset.annotationColor;
        if (color) target.style.setProperty('--annotation-color', color);
    });

    if (!('IntersectionObserver' in window)) {
        targets.forEach((target) => target.classList.add('annotation-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('annotation-visible');
                currentObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -10% 0px' });

    targets.forEach((target) => observer.observe(target));
}

// ==========================================
// NAVIGATION MODULE
// ==========================================

function initNavigation() {
    const header = document.querySelector('.site-header');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    if (!header) return;

    // Sticky header on scroll
    const updateHeader = () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    // Mobile menu toggle
    if (mobileMenuBtn && mobileMenu) {
        const setMenuOpen = (isOpen) => {
            mobileMenu.classList.toggle('active', isOpen);
            mobileMenuBtn.classList.toggle('active', isOpen);
            mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
            mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Close Menu' : 'Open Menu');
            mobileMenu.setAttribute('aria-hidden', String(!isOpen));
            document.body.style.overflow = isOpen ? 'hidden' : '';
        };

        setMenuOpen(false);
        mobileMenuBtn.addEventListener('click', () => {
            setMenuOpen(!mobileMenu.classList.contains('active'));
        });

        // Close menu when a link is clicked
        mobileLinks.forEach((link) => {
            link.addEventListener('click', () => {
                setMenuOpen(false);
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mobileMenu.classList.contains('active')) {
                setMenuOpen(false);
                mobileMenuBtn.focus();
            }
        });
    }
}

function initGuideRequestForm() {
    const form = document.getElementById('guide-request-form');
    const emailInput = document.getElementById('guide-email');
    const status = document.getElementById('guide-status');

    if (!form || !emailInput || !status) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!emailInput.reportValidity()) return;

        const subject = encodeURIComponent('Home-planning checklist request');
        const body = encodeURIComponent(
            `Please send me the complimentary home-planning checklist.\n\nMy email address: ${emailInput.value.trim()}`
        );
        window.location.href = `mailto:finelineanas@gmail.com?subject=${subject}&body=${body}`;
        status.textContent = 'A prefilled email will open. Send it to complete your request; this site does not store email addresses.';
    });
}

// ==========================================
// PAGE LOADER & HERO ANIMATIONS
// ==========================================

function initPageLoader() {
    const loader = document.querySelector('.page-loader');
    const progress = document.querySelector('.loader-progress');

    if (!loader) {
        // No loader on this page, run hero animations immediately
        initHeroAnimations();
        return;
    }

    if (typeof gsap === 'undefined') {
        loader.style.display = 'none';
        initHeroAnimations();
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        if (progress) progress.style.width = '100%';

        const finishLoader = () => {
            window.setTimeout(() => {
                loader.style.display = 'none';
                initHeroAnimations();
            }, 800);
        };

        if (document.readyState === 'complete') {
            finishLoader();
        } else {
            window.addEventListener('load', finishLoader, { once: true });
        }
        return;
    }

    // Animate loader progress bar
    if (progress) {
        gsap.to(progress, {
            width: '100%',
            duration: 0.8,
            ease: 'power2.inOut',
        });
    }

    // After loader finishes, fade it out and reveal content
    window.addEventListener('load', () => {
        setTimeout(() => {
            gsap.to(loader, {
                opacity: 0,
                duration: 0.6,
                ease: 'power2.inOut',
                onComplete: () => {
                    loader.style.display = 'none';
                    initHeroAnimations();
                },
            });
        }, 800);
    });
}

function initHeroAnimations() {
    if (typeof gsap === 'undefined') {
        document.querySelectorAll('.reveal-text, .reveal-image').forEach((element) => {
            element.style.opacity = '1';
            element.style.transform = 'none';
        });
        return;
    }

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        gsap.set('.reveal-text, .reveal-image', { opacity: 1, y: 0, scale: 1 });
        initScrollAnimations();
        return;
    }

    const revealText = document.querySelectorAll('.reveal-text');
    const revealImages = document.querySelectorAll('.reveal-image');
    if (!revealText.length && !revealImages.length) {
        initScrollAnimations();
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            // Initialize scroll animations after hero is done
            initScrollAnimations();
        },
    });

    // Hero text stagger
    if (revealText.length) {
        tl.to(revealText, {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.15,
            ease: 'power3.out',
        });
    }

    // Hero image reveal
    if (revealImages.length) {
        tl.to(revealImages, {
            scale: 1,
            opacity: 1,
            duration: 1.2,
            ease: 'power3.out',
        }, revealText.length ? '-=0.6' : 0);
    }
}

// ==========================================
// SCROLL PROGRESS BAR (Add to HTML if needed)
// ==========================================

// The scroll progress bar element should be added to your HTML:
// <div class="scroll-progress"><div class="scroll-progress-bar"></div></div>