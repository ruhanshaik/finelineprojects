function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeFavicon = document.getElementById('theme-favicon');
    const brandLogos = document.querySelectorAll('.brand-logo-mark');
    const body = document.body;

    function saveTheme(theme) {
        try {
            window.localStorage.setItem('theme', theme);
        } catch (error) {
            console.warn('Unable to save the theme preference.', error);
        }
    }

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        body.classList.toggle('dark-mode', isDark);
        body.classList.toggle('light-mode', !isDark);
        brandLogos.forEach((logo) => {
            const logoSource = isDark ? logo.dataset.darkSrc : logo.dataset.lightSrc;
            if (logoSource) logo.src = logoSource;
        });
        if (themeFavicon) {
            const iconSource = isDark
                ? themeFavicon.dataset.darkSrc
                : themeFavicon.dataset.lightSrc;
            if (iconSource) themeFavicon.href = iconSource;
        }
        if (themeToggleBtn) {
            themeToggleBtn.checked = isDark;
            themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }

    // Keep an explicit saved choice; otherwise start in light mode.
    let savedTheme = null;
    try {
        savedTheme = window.localStorage.getItem('theme');
    } catch (error) {
        console.warn('Unable to read the saved theme preference.', error);
    }
    applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

    // Toggle click handler
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('change', () => {
            const theme = themeToggleBtn.checked ? 'dark' : 'light';
            applyTheme(theme);
            saveTheme(theme);
        });
    }
}

initTheme();
