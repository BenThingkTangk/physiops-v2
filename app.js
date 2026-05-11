/* PhysioPS × HumanOS — Live Style Guide
   Interactive layer: swatches, waveform demo, tabs, translation toggles, motion preferences. */

(() => {
  'use strict';

  /* ---------- Reduce motion sync ---------- */
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceToggle = document.getElementById('cmp-reduce');
  const isReduced = () => document.documentElement.classList.contains('force-reduce') || mqReduce.matches;

  if (reduceToggle) {
    reduceToggle.addEventListener('change', (e) => {
      document.documentElement.classList.toggle('force-reduce', e.target.checked);
      // Inject a stylesheet rule when forced
      if (e.target.checked) {
        document.documentElement.style.setProperty('--motion-base', '0ms');
        if (!document.getElementById('force-reduce-style')) {
          const s = document.createElement('style');
          s.id = 'force-reduce-style';
          s.textContent = `.force-reduce *, .force-reduce *::before, .force-reduce *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }`;
          document.head.appendChild(s);
        }
      } else {
        document.documentElement.style.removeProperty('--motion-base');
      }
    });
  }

  /* ---------- Timestamp ---------- */
  const now = document.getElementById('now');
  if (now) {
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const s = `${ts.getUTCFullYear()}-${pad(ts.getUTCMonth() + 1)}-${pad(ts.getUTCDate())} · ${pad(ts.getUTCHours())}:${pad(ts.getUTCMinutes())} UTC · v2.3.0`;
    now.textContent = s;
  }

  /* ---------- Color swatches ---------- */
  const COLOR_GROUPS = {
    bg: [
      ['--color-bg-void', '#030B14', 'Cinematic hero depths'],
      ['--color-bg-deep', '#061224', 'Primary app background'],
      ['--color-bg-base', '#081428', 'Default body'],
      ['--color-bg-orbit', '#0A1A2E', 'Section backgrounds'],
      ['--color-surface-0', '#0C1F36', 'Base cards'],
      ['--color-surface-1', '#10243E', 'Raised cards'],
      ['--color-surface-2', '#152C48', 'Modals · drawers'],
      ['--color-surface-3', '#1B3556', 'Active overlays'],
      ['--color-surface-ink', '#020A14', 'Data-heavy panels'],
    ],
    text: [
      ['--color-text-primary', '#f0f4ff', 'Primary'],
      ['--color-text-secondary', '#a7b4c8', 'Secondary'],
      ['--color-text-muted', '#69758a', 'Captions · metadata'],
      ['--color-text-faint', '#3d4658', 'Decorative labels'],
    ],
    brand: [
      ['--color-brand-cyan', '#00E5A0', 'Primary action'],
      ['--color-brand-teal', '#00B07E', 'Links · secondary action'],
      ['--color-brand-blue', '#4A9EFF', 'AI active intelligence'],
      ['--color-brand-violet', '#A855F7', 'HRV composite'],
      ['--color-brand-white', '#f7fbff', 'Premium highlights'],
      ['--color-brand-platinum', '#dbe7f8', 'Report highlights'],
    ],
    clinical: [
      ['--color-parasym', '#00E5A0', 'Parasympathetic · RFa'],
      ['--color-parasym-soft', '#5FF0C5', 'Parasym highlight'],
      ['--color-sympathetic', '#4A9EFF', 'Sympathetic · LFa'],
      ['--color-sympathetic-soft', '#7FBBFF', 'Sympathetic highlight'],
      ['--color-hrv', '#A855F7', 'HRV composite'],
      ['--color-baseline', '#64748b', 'Resting baseline'],
    ],
    status: [
      ['--color-status-optimal', '#22c55e', 'Optimal function'],
      ['--color-status-watch', '#f59e0b', 'Watch · monitor'],
      ['--color-status-risk', '#4A9EFF', 'Elevated concern'],
      ['--color-status-critical', '#ef4444', 'Severe · clinical alert'],
      ['--color-status-processing', '#00E5A0', 'AI analysis active'],
      ['--color-status-cleared', '#10b981', 'Cleared · verified'],
      ['--color-status-unknown', '#64748b', 'Insufficient data'],
    ],
  };

  document.querySelectorAll('.swatches[data-group]').forEach((host) => {
    const group = host.getAttribute('data-group');
    const items = COLOR_GROUPS[group] || [];
    host.innerHTML = items.map(([token, hex, role]) => `
      <button class="swatch" type="button" data-hex="${hex}" data-token="${token}" aria-label="Copy ${token} (${hex})">
        <div class="chip" style="background: ${hex};"></div>
        <div class="meta">
          <span class="name">${token}</span>
          <span class="hex">${hex.toUpperCase()} · ${role}</span>
        </div>
        <span class="copy-toast">copied</span>
      </button>
    `).join('');
  });

  document.addEventListener('click', (e) => {
    const swatch = e.target.closest('.swatch');
    if (!swatch) return;
    const text = swatch.dataset.token + ': ' + swatch.dataset.hex + ';';
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    swatch.classList.add('copied');
    setTimeout(() => swatch.classList.remove('copied'), 1100);
  });

  /* ---------- Patient translation toggles ---------- */
  document.querySelectorAll('.toggle-translation').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('aria-controls');
      const panel = document.getElementById(id);
      if (!panel) return;
      const open = !panel.hasAttribute('hidden');
      if (open) {
        panel.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '+ Show patient translation';
      } else {
        panel.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
        btn.textContent = '− Hide patient translation';
      }
    });
  });

  /* ---------- Mode tabs (Physician / Patient / Developer) ---------- */
  document.querySelectorAll('.mode-tabs').forEach((group) => {
    const buttons = group.querySelectorAll('button');
    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        buttons.forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
      });
    });
  });

  /* ---------- Waveform canvas (dual-branch P&S animated) ---------- */
  function startWaveform(canvas, opts = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const state = {
      phase: 'resting',
      t: 0,
      buf: [],
      bufSize: 320,
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pre-fill buffer with smooth seed
    for (let i = 0; i < state.bufSize; i++) {
      state.buf.push(sample(i / 18));
    }

    function sample(t) {
      const phase = state.phase;
      // Parasympathetic component (HF, ~0.25 Hz analog)
      const baseP = Math.sin(t * 1.4) * 0.55 + Math.sin(t * 2.7 + 1.3) * 0.18;
      // Sympathetic component (LF, ~0.1 Hz analog)
      const baseS = Math.sin(t * 0.55 + 0.6) * 0.7 + Math.sin(t * 1.1 + 2.2) * 0.2;
      // HRV composite (slow drift)
      const baseH = Math.sin(t * 0.3) * 0.4 + Math.sin(t * 0.7 + 1.1) * 0.18;
      let p = baseP, s = baseS, h = baseH;

      if (phase === 'deep') {
        // deep breathing increases parasympathetic amplitude, lowers sympathetic
        p *= 1.55; s *= 0.6; h *= 1.2;
      } else if (phase === 'stand') {
        // stand challenge: sympathetic spike, parasympathetic depression
        p *= 0.55; s *= 1.6; h *= 0.85;
      }
      // small noise
      const n = (Math.sin(t * 17.3 + t * 0.13) * 0.04);
      return { p: p + n, s: s - n, h };
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // background subtle
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,229,160,0.03)');
      g.addColorStop(1, 'rgba(74,158,255,0.025)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // baseline dashed line
      ctx.strokeStyle = 'rgba(100,116,139,0.45)';
      ctx.setLineDash([6 * dpr, 8 * dpr]);
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      const len = state.buf.length;
      const stepX = w / (len - 1);
      const midY = h * 0.5;
      const ampY = h * 0.34;

      // PARASYMPATHETIC — cyan (filled glow under)
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = i * stepX;
        const y = midY - state.buf[i].p * ampY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const pf = ctx.createLinearGradient(0, midY - ampY, 0, h);
      pf.addColorStop(0, 'rgba(0,229,160,0.18)');
      pf.addColorStop(1, 'rgba(0,229,160,0)');
      ctx.fillStyle = pf;
      ctx.fill();

      ctx.strokeStyle = '#00E5A0';
      ctx.lineWidth = 2 * dpr;
      ctx.shadowColor = 'rgba(0,229,160,0.55)';
      ctx.shadowBlur = 10 * dpr;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = i * stepX;
        const y = midY - state.buf[i].p * ampY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // SYMPATHETIC — ember (no fill, lighter glow)
      ctx.strokeStyle = '#4A9EFF';
      ctx.shadowColor = 'rgba(74,158,255,0.45)';
      ctx.shadowBlur = 8 * dpr;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = i * stepX;
        const y = midY - state.buf[i].s * ampY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // HRV composite — violet
      ctx.strokeStyle = 'rgba(168,85,247,0.85)';
      ctx.lineWidth = 1.4 * dpr;
      ctx.shadowColor = 'rgba(168,85,247,0.35)';
      ctx.shadowBlur = 6 * dpr;
      ctx.setLineDash([2 * dpr, 4 * dpr]);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = i * stepX;
        const y = midY - state.buf[i].h * ampY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Active diagnostic window — translucent vertical band that drifts
      if (opts.showWindow !== false) {
        const drift = (Math.sin(state.t * 0.18) + 1) / 2; // 0..1
        const bx = (0.18 + drift * 0.5) * w;
        const bw = 0.16 * w;
        const bg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        bg2.addColorStop(0, 'rgba(0,229,160,0)');
        bg2.addColorStop(0.5, 'rgba(0,229,160,0.06)');
        bg2.addColorStop(1, 'rgba(0,229,160,0)');
        ctx.fillStyle = bg2;
        ctx.fillRect(bx, 0, bw, h);
        ctx.strokeStyle = 'rgba(0,229,160,0.25)';
        ctx.lineWidth = 1 * dpr;
        ctx.strokeRect(bx, 0, bw, h);
      }

      // Live cursor dot at end
      const lastP = state.buf[len - 1].p;
      const cx = w - 1;
      const cy = midY - lastP * ampY;
      ctx.fillStyle = '#00E5A0';
      ctx.shadowColor = 'rgba(0,229,160,0.8)';
      ctx.shadowBlur = 12 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    let last = performance.now();
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const speed = isReduced() ? 0.0 : 1.0;
      state.t += dt * 2.0 * speed;
      // shift buffer
      const advance = isReduced() ? 0 : 1;
      for (let i = 0; i < advance; i++) {
        state.buf.shift();
        state.buf.push(sample(state.t));
      }
      draw();

      // Update readouts (only on the main waveform)
      if (opts.readouts) {
        const lastSample = state.buf[state.buf.length - 1];
        const rfa = (2.31 + lastSample.p * 0.4 + (state.phase === 'deep' ? 0.6 : state.phase === 'stand' ? -0.5 : 0)).toFixed(2);
        const lfa = (3.27 + lastSample.s * 0.3 + (state.phase === 'stand' ? 0.9 : state.phase === 'deep' ? -0.5 : 0)).toFixed(2);
        const ratio = (Math.max(lfa / Math.max(rfa, 0.01), 0)).toFixed(2);
        const r = (sel) => document.querySelector(`[data-readout="${sel}"]`);
        if (r('rfa')) r('rfa').textContent = rfa;
        if (r('lfa')) r('lfa').textContent = lfa;
        if (r('ratio')) r('ratio').textContent = ratio;
        // also update hero ratio
        const hr = document.getElementById('hero-ratio');
        if (hr) hr.textContent = ratio;
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    return {
      setPhase: (p) => { state.phase = p; },
    };
  }

  const mainWave = startWaveform(document.getElementById('wave-canvas'), { readouts: true, showWindow: true });
  const dashWave = startWaveform(document.getElementById('dash-canvas'), { readouts: false, showWindow: false });

  // Phase tabs
  document.querySelectorAll('.wave-tabs').forEach((group) => {
    const buttons = group.querySelectorAll('button');
    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        buttons.forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        const phase = b.dataset.phase;
        if (mainWave) mainWave.setPhase(phase);
        if (dashWave) dashWave.setPhase(phase);
      });
    });
  });

  /* ---------- Fade-in on scroll ---------- */
  const fadeTargets = document.querySelectorAll('.hero-grid > *, .pillar, .insight-card, .material-card, .dataviz-card, .motion-card, .trust-card, .anti-row, .cmp, .swatch, .font-card, .type-row');
  fadeTargets.forEach((el) => el.classList.add('fade-in'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '200px 0px 200px 0px' });
  fadeTargets.forEach((el) => io.observe(el));

  // Safety net: reveal anything still hidden after 2.5s (e.g. for fullpage screenshots, or print)
  setTimeout(() => {
    fadeTargets.forEach((el) => el.classList.add('in'));
  }, 2500);

})();
