/**
 * Premium Custom Cursor Module
 * - Uses requestAnimationFrame for 60fps performance
 * - Trailing ring effect
 * - Contextual hover states for links and images
 */

function initCursor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');

    if (!dot || !outline) return;

    const body = document.body;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = { x: 0, y: 0 };
    const ring = { x: 0, y: 0, vx: 0, vy: 0 };
    let frameId = 0;
    let isVisible = false;

    function setPosition(element, x, y) {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }

    function animate() {
        const dx = target.x - ring.x;
        const dy = target.y - ring.y;

        ring.vx = (ring.vx + dx * 0.16) * 0.72;
        ring.vy = (ring.vy + dy * 0.16) * 0.72;
        ring.x += ring.vx;
        ring.y += ring.vy;

        setPosition(outline, ring.x, ring.y);
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 &&
            Math.abs(ring.vx) < 0.1 && Math.abs(ring.vy) < 0.1) {
            ring.x = target.x;
            ring.y = target.y;
            ring.vx = 0;
            ring.vy = 0;
            frameId = 0;
            return;
        }

        frameId = requestAnimationFrame(animate);
    }

    function hideCursor() {
        isVisible = false;
        body.classList.remove('cursor-ready', 'cursor-hover-link', 'cursor-view-project');
        if (frameId) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        }
    }

    window.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;

        target.x = event.clientX;
        target.y = event.clientY;
        setPosition(dot, target.x, target.y);

        if (!isVisible) {
            isVisible = true;
            ring.x = target.x;
            ring.y = target.y;
            body.classList.add('cursor-ready');
        }

        if (prefersReducedMotion) {
            ring.x = target.x;
            ring.y = target.y;
            setPosition(outline, ring.x, ring.y);
        } else if (!frameId) {
            frameId = requestAnimationFrame(animate);
        }
    });

    window.addEventListener('blur', hideCursor);
    document.addEventListener('pointerout', (event) => {
        if (!event.relatedTarget) hideCursor();
    });

    document.addEventListener('pointerover', (event) => {
        const targetElement = event.target instanceof Element ? event.target : null;
        if (!targetElement) return;

        if (targetElement.closest('.project-image, .trust-img-card')) {
            body.classList.add('cursor-view-project');
            body.classList.remove('cursor-hover-link');
        } else if (targetElement.closest('a, button, input, textarea, select, [role="button"]')) {
            body.classList.add('cursor-hover-link');
            body.classList.remove('cursor-view-project');
        } else {
            body.classList.remove('cursor-hover-link', 'cursor-view-project');
        }
    });

    body.classList.add('cursor-enabled');
}

initCursor();