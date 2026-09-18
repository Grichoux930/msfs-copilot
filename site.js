'use strict';
// Set only after the new monthly checkout and its three-day trial are verified.
const NAVCREW_CHECKOUT_URL = '';
const translations = [...document.querySelectorAll('[data-en]')].map(element => ({element, fr: element.innerHTML, en: element.dataset.en}));
function applyLanguage(language) {
  const lang = language === 'en' ? 'en' : 'fr';
  document.documentElement.lang = lang;
  translations.forEach(({element,fr,en}) => { element.innerHTML = lang === 'en' ? en : fr; });
  document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
  try { localStorage.setItem('navcrew_lang', lang); } catch (_) { /* Language selection works without storage. */ }
}
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
let language = 'fr';
try { language = localStorage.getItem('navcrew_lang') || (navigator.language.startsWith('fr') ? 'fr' : 'en'); } catch (_) {}
applyLanguage(language);
if (NAVCREW_CHECKOUT_URL) {
  const area = document.getElementById('checkout-area');
  if (area) {
    const button = area.querySelector('a');
    button.href = NAVCREW_CHECKOUT_URL;
    area.querySelector('.checkout-pending').hidden = true;
    const entry = translations.find(item => item.element === button.querySelector('[data-en]'));
    if (entry) { entry.fr = 'Commencer mon essai gratuit'; entry.en = 'Start my free trial'; }
    applyLanguage(document.documentElement.lang);
  }
}
document.querySelectorAll('a').forEach(anchor => anchor.addEventListener('click', () => {
  if (typeof gtag !== 'function') return;
  const href = anchor.getAttribute('href') || '';
  if (NAVCREW_CHECKOUT_URL && href === NAVCREW_CHECKOUT_URL) gtag('event','begin_checkout',{currency:'USD',value:7.99});
  else if (href === 'download.html') gtag('event','view_checkout_page',{event_category:'engagement'});
  else if (href === 'screenshots.html') gtag('event','view_screenshots_click',{event_category:'engagement'});
}));
