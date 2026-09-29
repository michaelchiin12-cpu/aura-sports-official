(function () {
  function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function syncCloneState(originalTabs, cloneNav) {
    if (!cloneNav) return;
    const cloneButtons = Array.from(cloneNav.querySelectorAll('.mobile-tab-btn'));
    const activeIndex = originalTabs.findIndex(tab => tab.classList.contains('active'));
    cloneButtons.forEach((cloneButton, index) => {
      cloneButton.classList.toggle('active', index === activeIndex);
    });
  }

  function ensureMobileNav() {
    if (document.querySelector('.mobile-bottom-nav')) {
      const originalTabs = Array.from(document.querySelectorAll('.tab-btn'));
      syncCloneState(originalTabs, document.querySelector('.mobile-bottom-nav'));
      return;
    }

    const originalTabs = Array.from(document.querySelectorAll('.tab-btn'));
    if (!originalTabs.length) return;

    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Bottom navigation');

    originalTabs.forEach((tab) => {
      const clone = tab.cloneNode(true);
      clone.classList.add('mobile-tab-btn');
      clone.removeAttribute('onclick');

      clone.addEventListener('click', () => {
        const targetTabIndex = originalTabs.indexOf(tab);
        originalTabs.forEach((btn, index) => {
          btn.classList.toggle('active', index === targetTabIndex);
        });

        tab.click();
        syncCloneState(originalTabs, nav);

        const activeContent = document.querySelector('.tab-content.active');
        if (activeContent) {
          activeContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      nav.appendChild(clone);
    });

    document.body.appendChild(nav);
    syncCloneState(originalTabs, nav);
  }

  function removeMobileNav() {
    const nav = document.querySelector('.mobile-bottom-nav');
    if (nav) nav.remove();
  }

  function updateMobileMode() {
    if (isMobileViewport()) {
      document.documentElement.classList.add('is-mobile');
      ensureMobileNav();
    } else {
      document.documentElement.classList.remove('is-mobile');
      removeMobileNav();
    }
  }

  function init() {
    updateMobileMode();

    const originalTabs = document.querySelectorAll('.tab-btn');
    originalTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const nav = document.querySelector('.mobile-bottom-nav');
        if (!nav) return;
        syncCloneState(Array.from(document.querySelectorAll('.tab-btn')), nav);
      });
    });
  }

  window.addEventListener('DOMContentLoaded', init);
  window.addEventListener('resize', updateMobileMode);
})();
