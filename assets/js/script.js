document.querySelector('#year').textContent = String(new Date().getFullYear());

const header = document.querySelector('.site-header');
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (header) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

