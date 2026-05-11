/* PhysioPS × HumanOS — Marketing site
   IntersectionObserver fade/scale-up on scroll for marketing-only sections.
   Works alongside the shared app.js (which already animates wave-canvas + base targets).
   v2.3 — adds a small GSAP-style timeline animator (no external lib) honoring
   prefers-reduced-motion. */

(() => {
  'use strict';

  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReduced = () =>
    reduceMQ.matches ||
    document.documentElement.classList.contains('force-reduce');

  /* --- Tiny GSAP-shaped timeline (vanilla, reduced-motion aware) ---
     Usage:
       tl().from(el, { y: 20, opacity: 0, duration: 700, delay: 80, ease: 'out' });
     - Honors prefers-reduced-motion by applying end-state instantly.
     - Uses Web Animations API when available; falls back to CSS transition.
  */
  const easeMap = {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    signal: 'cubic-bezier(0.22, 1, 0.36, 1)',
    humanos: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  };
  function tl() {
    const queue = [];
    let cursor = 0;
    const api = {
      from(target, opts = {}) {
        const els = typeof target === 'string'
          ? Array.from(document.querySelectorAll(target))
          : (target instanceof NodeList ? Array.from(target) : [target]);
        const dur = opts.duration ?? 600;
        const delay = (opts.delay ?? 0) + cursor;
        const stagger = opts.stagger ?? 0;
        els.forEach((el, i) => {
          if (!el) return;
          const dly = delay + i * stagger;
          queue.push({ el, opts, dur, delay: dly });
        });
        return api;
      },
      then(ms) { cursor += ms; return api; },
      play() {
        if (prefersReduced()) {
          // Apply end-state instantly: nothing to do (start state never applied).
          return api;
        }
        queue.forEach(({ el, opts, dur, delay }) => {
          const fromY = opts.y ?? 0;
          const fromX = opts.x ?? 0;
          const fromScale = opts.scale ?? 1;
          const fromOpacity = opts.opacity ?? 1;
          const ease = easeMap[opts.ease || 'out'] || easeMap.out;
          if (typeof el.animate === 'function') {
            el.animate(
              [
                { transform: `translate3d(${fromX}px, ${fromY}px, 0) scale(${fromScale})`, opacity: fromOpacity },
                { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
              ],
              { duration: dur, delay, easing: ease, fill: 'backwards' }
            );
          } else {
            el.style.transition = `transform ${dur}ms ${ease} ${delay}ms, opacity ${dur}ms ${ease} ${delay}ms`;
            el.style.transform = `translate3d(${fromX}px, ${fromY}px, 0) scale(${fromScale})`;
            el.style.opacity = String(fromOpacity);
            requestAnimationFrame(() => {
              el.style.transform = '';
              el.style.opacity = '';
            });
          }
        });
        return api;
      },
    };
    return api;
  }

  /* Hero entrance — layered, signal-glow inspired */
  function heroEntrance() {
    if (prefersReduced()) return;
    const timeline = tl();
    timeline
      .from('.brand-lockup', { y: -8, opacity: 0, duration: 600, ease: 'out' })
      .from('.nav-strip a',  { y: -6, opacity: 0, duration: 500, ease: 'out', stagger: 40, delay: 80 })
      .from('.hero .eyebrow', { y: 12, opacity: 0, duration: 700, ease: 'signal', delay: 120 })
      .from('#hero-title',    { y: 24, opacity: 0, duration: 900, ease: 'humanos', delay: 160 })
      .from('.hero p.lede',   { y: 18, opacity: 0, duration: 800, ease: 'out', delay: 240 })
      .from('.hero-cta .btn', { y: 12, opacity: 0, duration: 600, ease: 'out', delay: 320, stagger: 60 })
      .from('.hero-trust .kpi', { y: 10, opacity: 0, duration: 600, ease: 'out', delay: 420, stagger: 50 })
      .from('.cockpit',       { scale: 0.96, opacity: 0, duration: 1100, ease: 'humanos', delay: 220 })
      .play();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', heroEntrance, { once: true });
  } else {
    heroEntrance();
  }

  /* --- Smooth scroll for anchor nav --- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', `#${id}`);
      }
    });
  });

  /* --- Fade-in / scale-in for marketing sections --- */
  const fadeSelectors = [
    '.kpi-card', '.condition', '.bodymap-item', '.choice', '.eco-card', '.news-card',
    '.voice-card', '.mpg-card', '.pipeline-step', '.strand-row', '.ps-insight',
    '.dualview-pane', '.demo-cta-card', '.dropzone', '.pillar', '.section-head',
    '.final-cta', '.orb-stage', '.hero-trust .kpi'
  ];
  const fadeTargets = document.querySelectorAll(fadeSelectors.join(','));
  fadeTargets.forEach((el) => el.classList.add('fade-in'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        // Stagger child animations a touch when many items in a parent
        const idx = Array.from(e.target.parentElement?.children || []).indexOf(e.target);
        if (idx > 0 && idx < 12) {
          e.target.style.transitionDelay = `${Math.min(idx * 60, 480)}ms`;
        }
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });

  fadeTargets.forEach((el) => io.observe(el));

  /* Safety net: reveal anything still hidden after 3s */
  setTimeout(() => fadeTargets.forEach((el) => el.classList.add('in')), 3000);

  /* --- Live KPI counter on hero (simple count-up) --- */
  const counterEls = document.querySelectorAll('[data-count]');
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const dur = parseInt(el.dataset.dur || '1400', 10);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = target * eased;
        el.textContent = prefix + (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + (decimals ? target.toFixed(decimals) : target.toLocaleString()) + suffix;
      };
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  counterEls.forEach((el) => counterIO.observe(el));

  /* --- Drop-zone visual interactivity --- */
  const dz = document.querySelector('[data-dropzone]');
  if (dz) {
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => {
      e.preventDefault(); dz.classList.add('is-active');
    }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => {
      e.preventDefault(); dz.classList.remove('is-active');
      if (ev === 'drop') {
        // Demo only: pulse pipeline
        document.querySelectorAll('.pipeline-step').forEach((s, i) => {
          setTimeout(() => s.classList.add('is-running'), i * 220);
          setTimeout(() => s.classList.remove('is-running'), i * 220 + 1200);
        });
      }
    }));
  }

  /* --- Topnav timestamp (delegate to app.js, but only if missing) --- */
  const ts = document.getElementById('now');
  if (ts && !ts.textContent.trim()) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    ts.textContent = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC · v2.3.0`;
  }

  /* --- Email form: prevent submit, show toast --- */
  const form = document.querySelector('[data-cta-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn = form.querySelector('button');
      const orig = btn.textContent;
      btn.textContent = 'Request received →';
      btn.disabled = true;
      if (input) input.value = '';
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3200);
    });
  }
})();
