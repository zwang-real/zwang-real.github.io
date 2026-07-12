// Adds `.in-view` to `.reveal` elements when they enter viewport.
// Uses IntersectionObserver so it's cheap. Not needed for accessibility —
// content is rendered visible in `.reveal` CSS if JS is off.

const els = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && els.length > 0) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
} else {
  els.forEach(el => el.classList.add('in-view'));
}
