'use strict';

const CONFIG = {
  images: [
    'images/nmixx1.jpg',
    'images/nmixx2.jpg',
    'images/nmixx3.jpg',
    'images/nmixx4.jpg',
    'images/nmixx5.jpg',
  ],
  slideDuration: 7000,
  shuffle: false,
  parallaxStrength: 20,
};

const Slideshow = (() => {
  const container     = document.getElementById('slideshow');
  const indicatorWrap = document.getElementById('indicators');
  let slides = [], dots = [], current = 0, timer = null;

  const preload = srcs => Promise.allSettled(
    srcs.map(src => new Promise(res => {
      const img = new Image();
      img.onload = img.onerror = () => res(src);
      img.src = src;
    }))
  );

  function goTo(index) {
    const prev = current;
    current = (index + slides.length) % slides.length;

    slides[prev].style.transition = 'opacity 1.2s ease';
    slides[prev].style.opacity = '0';

    slides[current].style.transition = 'opacity 1.2s ease';
    slides[current].style.opacity = '1';

    dots[prev]?.classList.remove('active');
    dots[current]?.classList.add('active');
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), CONFIG.slideDuration);
  }

  async function init() {
    let srcs = [...CONFIG.images];
    if (!srcs.length) { container.style.background = '#111'; return; }
    await preload(srcs);

    srcs.forEach((src, i) => {
      const img = document.createElement('img');
      img.src     = src;
      img.alt     = '';
      img.loading = 'eager';
      img.style.opacity = i === 0 ? '1' : '0';
      container.appendChild(img);
      slides.push(img);

      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
      dot.addEventListener('click', () => { goTo(i); startAuto(); });
      indicatorWrap.appendChild(dot);
      dots.push(dot);
    });

    dots[0]?.classList.add('active');
    startAuto();
  }

  return { init };
})();

const Parallax = (() => {
  let tx = 0, ty = 0;
  let cx = 0, cy = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }

  window.addEventListener('mousemove', e => {
    const hw = window.innerWidth  / 2;
    const hh = window.innerHeight / 2;
    tx = ((e.clientX - hw) / hw) * CONFIG.parallaxStrength;
    ty = ((e.clientY - hh) / hh) * CONFIG.parallaxStrength;
  });

  function tick() {
    cx = lerp(cx, tx, 0.05);
    cy = lerp(cy, ty, 0.05);

    document.querySelectorAll('#slideshow img').forEach(img => {
      img.style.transform = `translate(${-cx}px, ${-cy}px)`;
    });

    requestAnimationFrame(tick);
  }

  function init() { tick(); }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  Slideshow.init();
  Parallax.init();
});
