/**
 * Projects Page Module
 * - Category filtering with smooth animations
 * - Custom lightbox gallery with keyboard navigation
 * - GSAP-powered transitions
 */

export function initProjects() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');

    if (!projectCards.length) return;

    // ==========================================
    // FILTERING
    // ==========================================
    filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            projectCards.forEach((card) => {
                const category = card.dataset.category;
                const shouldShow = filter === 'all' || category === filter;

                if (shouldShow) {
                    card.classList.remove('hidden');
                    gsap.fromTo(
                        card,
                        { opacity: 0, y: 30, scale: 0.95 },
                        {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            duration: 0.6,
                            ease: 'power3.out',
                        }
                    );
                } else {
                    gsap.to(card, {
                        opacity: 0,
                        y: 20,
                        scale: 0.95,
                        duration: 0.3,
                        ease: 'power2.in',
                        onComplete: () => card.classList.add('hidden'),
                    });
                }
            });
        });
    });

    // ==========================================
    // LIGHTBOX
    // ==========================================
    let visibleCards = [];
    let currentIndex = 0;

    function getVisibleCards() {
        return Array.from(projectCards).filter(
            (card) => !card.classList.contains('hidden')
        );
    }

    function openLightbox(index) {
        visibleCards = getVisibleCards();
        if (!visibleCards.length) return;

        currentIndex = index;
        const card = visibleCards[currentIndex];
        const img = card.querySelector('.project-image img');
        const title = card.querySelector('.project-title').textContent;
        const desc = card.querySelector('.project-desc').textContent;

        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxTitle.textContent = title;
        lightboxDesc.textContent = desc;

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Pause Lenis if active
        if (window.lenis) window.lenis.stop();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';

        if (window.lenis) window.lenis.start();
    }

    function showNext() {
        visibleCards = getVisibleCards();
        currentIndex = (currentIndex + 1) % visibleCards.length;
        const card = visibleCards[currentIndex];
        const img = card.querySelector('.project-image img');
        const title = card.querySelector('.project-title').textContent;
        const desc = card.querySelector('.project-desc').textContent;

        gsap.fromTo(
            lightboxImg,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
        );

        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxTitle.textContent = title;
        lightboxDesc.textContent = desc;
    }

    function showPrev() {
        visibleCards = getVisibleCards();
        currentIndex = (currentIndex - 1 + visibleCards.length) % visibleCards.length;
        const card = visibleCards[currentIndex];
        const img = card.querySelector('.project-image img');
        const title = card.querySelector('.project-title').textContent;
        const desc = card.querySelector('.project-desc').textContent;

        gsap.fromTo(
            lightboxImg,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
        );

        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxTitle.textContent = title;
        lightboxDesc.textContent = desc;
    }

    // Attach lightbox open to each project card
    projectCards.forEach((card, i) => {
        card.addEventListener('click', () => {
            const visibleIndex = getVisibleCards().indexOf(card);
            openLightbox(visibleIndex);
        });
    });

    // Lightbox controls
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (nextBtn) nextBtn.addEventListener('click', showNext);
    if (prevBtn) prevBtn.addEventListener('click', showPrev);

    // Click outside image to close
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    });
}