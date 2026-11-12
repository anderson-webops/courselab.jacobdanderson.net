/* An attempt stays on this device; feedback opens only on an explicit request. */
(() => {
  'use strict';
  for (const question of document.querySelectorAll('[data-practice]')) {
    const input = question.querySelector('textarea');
    const compare = question.querySelector('[data-compare]');
    const hintButton = question.querySelector('[data-hint]');
    const answer = question.querySelector('.practice-answer');
    const hint = question.querySelector('.practice-hint');
    const key = 'orbitalhw-attempt-' + question.dataset.practice;
    const update = () => { compare.disabled = input.value.trim().length === 0; };
    try { input.value = localStorage.getItem(key) || ''; } catch { /* Storage is optional. */ }
    input.addEventListener('input', () => {
      update();
      answer.hidden = true;
      compare.textContent = 'Compare reasoning';
      try { localStorage.setItem(key, input.value); } catch { /* Keep working without storage. */ }
    });
    hintButton.addEventListener('click', () => {
      hint.hidden = !hint.hidden;
      hintButton.setAttribute('aria-expanded', String(!hint.hidden));
    });
    compare.addEventListener('click', () => {
      if (!input.value.trim()) return;
      answer.hidden = !answer.hidden;
      compare.textContent = answer.hidden ? 'Compare reasoning' : 'Hide feedback';
      compare.setAttribute('aria-expanded', String(!answer.hidden));
    });
    hintButton.setAttribute('aria-expanded', 'false');
    compare.setAttribute('aria-expanded', 'false');
    update();
  }
})();
