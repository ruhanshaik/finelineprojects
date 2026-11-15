/**
 * GSAP ScrollTrigger Animation Module
 * - Reusable reveal functions
 * - Parallax image effects
 * - Staggered grid animations
 * - Respects prefers-reduced-motion
 */

export function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        document.querySelectorAll('.reveal-text, .reveal-image, .fade-up-text').forEach((element) => {
            element.style.opacity = '1';
            element.style.transform = 'none';
        });
        return;
    }

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        // Show everything immediately
        gsap.set('.reveal-text, .reveal-image', { opacity: 1, y: 0, scale: 1 });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // --- 1. Fade Up Text ---
    const fadeUpText = document.querySelectorAll('.fade-up-text');
    fadeUpText.forEach((el) => {
        gsap.fromTo(
            el,
            { y: 50, opacity: 0 },
            {
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
                y: 0,
                opacity: 1,
                duration: 1,
                ease: 'power3.out',
            },
        );
    });

    // --- 2. Staggered Grid Reveal ---
    const revealGrids = document.querySelectorAll('.reveal-grid');
    revealGrids.forEach((grid) => {
        const children = grid.children;
        gsap.from(children, {
            scrollTrigger: {
                trigger: grid,
                start: 'top 80%',
            },
            y: 60,
            opacity: 0,
            duration: 0.9,
            stagger: 0.15,
            ease: 'power3.out',
        });
    });

    // --- 3. Image Mask Reveal ---
    const maskImages = document.querySelectorAll('.mask-reveal');
    maskImages.forEach((img) => {
        gsap.fromTo(
            img,
            { clipPath: 'inset(0 0 100% 0)' },
            {
                scrollTrigger: {
                    trigger: img,
                    start: 'top 85%',
                },
                clipPath: 'inset(0 0 0% 0)',
                duration: 1.4,
                ease: 'power4.inOut',
            }
        );
    });

    // --- 4. Image Parallax ---
    const parallaxImages = document.querySelectorAll('[data-speed]');
    parallaxImages.forEach((img) => {
        const speed = parseFloat(img.dataset.speed) || 0.8;
        gsap.to(img, {
            scrollTrigger: {
                trigger: img,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            },
            y: (i, target) => -(target.offsetHeight * (1 - speed) * 0.5),
            ease: 'none',
        });
    });

    // --- 5. Section Title Reveal ---
    const sectionTitles = document.querySelectorAll('.section-title-reveal');
    sectionTitles.forEach((title) => {
        gsap.from(title, {
            scrollTrigger: {
                trigger: title,
                start: 'top 85%',
            },
            y: 40,
            opacity: 0,
            duration: 1.2,
            ease: 'power3.out',
        });
    });

    // --- 6. Scroll Progress Bar ---
    const progressBar = document.querySelector('.scroll-progress-bar');
    if (progressBar) {
        gsap.to(progressBar, {
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.3,
            },
            width: '100%',
            ease: 'none',
        });
    }
}