(function () {
  'use strict';
  const KEY = 'aura-manager-theme';
  function applyTheme(theme) {
    const selected = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-aura-theme', selected);
    document.documentElement.style.background = selected === 'light' ? '#f1f5f9' : '#081321';
    const button = document.getElementById('auraThemeToggle');
    if (button) {
      const light = selected === 'light';
      button.setAttribute('aria-label', light ? 'Ganti ke dark mode' : 'Ganti ke light mode');
      button.setAttribute('title', light ? 'Ganti ke dark mode' : 'Ganti ke light mode');
      button.innerHTML = light ? '<span aria-hidden="true">☀️</span><span class="theme-toggle-label">Light</span>' : '<span aria-hidden="true">🌙</span><span class="theme-toggle-label">Dark</span>';
    }
  }
  function init() {
    let saved = 'dark';
    try { saved = localStorage.getItem(KEY) || 'dark'; } catch (_) {}
    applyTheme(saved);
    const button = document.getElementById('auraThemeToggle');
    if (button) button.addEventListener('click', function () {
      const next = document.documentElement.getAttribute('data-aura-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem(KEY, next); } catch (_) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();