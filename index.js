/* ─────────────────────────────────────────────
   NMIXX Interactive Wallpaper — index.js
   유튜브 Media Session API 최적화 버전
   ───────────────────────────────────────────── */
'use strict';

/* ① 설정 */
const CONFIG = {
  images: [
    'images/nmixx1.jpg',
    'images/nmixx2.jpg',
    'images/nmixx3.jpg',
    'images/nmixx4.jpg',
    'images/nmixx5.jpg',
  ],
  slideDuration: 7000,
  fadeDuration: 1400,
  shuffle: false,
};

/* ② 슬라이드쇼 */
const Slideshow = (() => {
  const container     = document.getElementById('slideshow');
  const indicatorWrap = document.getElementById('indicators');
  let slides = [], dots = [], current = 0, timer = null;

  const shuffleArr = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

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
    slides[prev].classList.remove('active');
    slides[current].classList.add('active');
    dots[prev]?.classList.remove('active');
    dots[current]?.classList.add('active');
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), CONFIG.slideDuration);
  }

  async function init() {
    let srcs = [...CONFIG.images];
    if (CONFIG.shuffle) shuffleArr(srcs);
    if (!srcs.length) { container.style.background = '#111'; return; }
    await preload(srcs);
    srcs.forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src; img.alt = `NMIXX slide ${i + 1}`; img.loading = 'eager';
      container.appendChild(img);
      slides.push(img);
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
      dot.addEventListener('click', () => { goTo(i); startAuto(); });
      indicatorWrap.appendChild(dot);
      dots.push(dot);
    });
    goTo(0); startAuto();
  }
  return { init };
})();

/* ③ 시계 */
const Clock = (() => {
  const timeEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const pad    = n => String(n).padStart(2, '0');

  function tick() {
    const now = new Date();
    timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    dateEl.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${pad(now.getDate())}`;
  }
  function init() {
    tick();
    const delay = 1000 - (Date.now() % 1000);
    setTimeout(() => { tick(); setInterval(tick, 60000); }, delay);
  }
  return { init };
})();

/* ④ 유튜브 미디어 카드 */
const MediaDisplay = (() => {
  const card       = document.getElementById('mediaCard');
  const artEl      = document.getElementById('mediaArt');
  const blurEl     = document.getElementById('mediaArtBlur');
  const titleEl    = document.getElementById('mediaTitle');
  const artistEl   = document.getElementById('mediaArtist');
  const albumEl    = document.getElementById('mediaAlbum');
  const progressBar = document.getElementById('mediaProgressBar');

  let hideTimer = null, progressTimer = null;
  let lastTitle = '', isPlaying = false, pct = 0;

  /* 유튜브 썸네일 고화질 업그레이드 */
  function upgradeYtThumb(url) {
    if (!url) return '';
    return url
      .replace(/\/(hq|mq|sd)default\.jpg/, '/maxresdefault.jpg');
  }

  /* 아트워크 배열에서 최적 URL */
  function bestArtwork(artwork) {
    if (!artwork || !artwork.length) return '';
    const sorted = [...artwork].sort((a, b) => {
      const s = item => parseInt((item.sizes || '0x0').split('x')[0], 10);
      return s(b) - s(a);
    });
    return upgradeYtThumb(sorted[0].src);
  }

  /* maxresdefault 없으면 hqdefault 로 fallback */
  function setArtwork(url) {
    if (!url) { artEl.src = ''; blurEl.style.backgroundImage = ''; return; }
    const testImg = new Image();
    testImg.onload = () => {
      const src = testImg.naturalWidth <= 1
        ? url.replace('maxresdefault', 'hqdefault')
        : url;
      artEl.src = src;
      blurEl.style.backgroundImage = `url('${src}')`;
    };
    testImg.onerror = () => {
      const fallback = url.replace('maxresdefault', 'hqdefault');
      artEl.src = fallback;
      blurEl.style.backgroundImage = `url('${fallback}')`;
    };
    testImg.src = url;
  }

  /* 진행 바 — 유튜브는 duration/position 을 노출하지 않으므로
     '재생 중' 시각화 인디케이터로 무한 루프 사용 */
  function startProgress() {
    clearInterval(progressTimer);
    if (!progressBar) return;
    pct = 0;
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    progressTimer = setInterval(() => {
      if (!isPlaying) return;
      pct = (pct + 0.05) % 100;
      progressBar.style.transition = 'width 0.4s linear';
      progressBar.style.width = pct + '%';
    }, 400);
  }

  function stopProgress() { clearInterval(progressTimer); }

  /* 카드 표시 */
  function show(meta, playing) {
    const newTitle = meta.title || '';
    if (newTitle !== lastTitle) {
      lastTitle = newTitle;
      titleEl.textContent  = meta.title  || '알 수 없는 곡';
      artistEl.textContent = meta.artist || 'YouTube';
      albumEl.textContent  = meta.album  || '';
      setArtwork(bestArtwork(meta.artwork));
      startProgress();
    }
    isPlaying = playing;
    card.classList.toggle('playing', playing);
    card.classList.add('visible');
    clearTimeout(hideTimer);
  }

  /* 카드 숨김 */
  function hide() {
    card.classList.remove('visible', 'playing');
    isPlaying = false; lastTitle = '';
    stopProgress();
    if (progressBar) { progressBar.style.transition = 'none'; progressBar.style.width = '0%'; }
  }

  /* Media Session 폴링 (1초) */
  function poll() {
    if (!('mediaSession' in navigator)) return;
    setInterval(() => {
      const session = navigator.mediaSession;
      const meta    = session.metadata;
      const state   = session.playbackState;
      if (meta && state !== 'none') {
        show(
          { title: meta.title, artist: meta.artist, album: meta.album, artwork: meta.artwork },
          state === 'playing'
        );
      } else {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hide, 800);
      }
    }, 1000);
  }

  /* visibilitychange 로 즉시 갱신 */
  function subscribeVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !navigator.mediaSession) return;
      const { metadata: meta, playbackState: state } = navigator.mediaSession;
      if (meta && state !== 'none') {
        show({ title: meta.title, artist: meta.artist, album: meta.album, artwork: meta.artwork }, state === 'playing');
      } else hide();
    });
  }

  function init() { poll(); subscribeVisibility(); }
  return { init };
})();

/* ⑤ 앱 시작 */
document.addEventListener('DOMContentLoaded', () => {
  Slideshow.init();
  Clock.init();
  MediaDisplay.init();
});
