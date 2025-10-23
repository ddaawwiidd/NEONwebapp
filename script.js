(function start() {
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    // ===== Cache DOM =====
    const formView   = document.getElementById('formView');
    const ledScreen  = document.getElementById('ledScreen');
    const marquee    = document.getElementById('marquee');
    const input      = document.getElementById('messageInput');
    const btn        = document.getElementById('displayBtn');
    const shareBtn   = document.getElementById('shareBtn');
    const installBtn = document.getElementById('installBtn');
    const iosTip     = document.getElementById('iosTip');
    const modeSelect = document.getElementById('modeSelect'); // "scroll" | "static"
    const colorSelect = document.getElementById('colorSelect');
    const invertToggle = document.getElementById('invertToggle');

    if (!formView || !ledScreen || !marquee || !input || !btn || !modeSelect) return;

    // ===== Init state =====
    // Ensure input starts empty & focused
    input.value = '';
    window.addEventListener('load', () => input.focus());

    // Default mode: "scroll"
    if (!modeSelect.value) modeSelect.value = 'scroll';

    // ===== Color Theme =====
    const COLOR_KEY = 'neon.color';
    const THEMES = {
      default: {
        fg:    '#aaff66',
        glow1: 'rgba(170, 255, 102, 0.70)',
        glow2: 'rgba(170, 255, 102, 0.45)',
        glow3: 'rgba(170, 255, 102, 0.25)'
      },
      blue: {
        fg:    '#34edf3',
        glow1: 'rgba(52, 237, 243, 0.70)',
        glow2: 'rgba(52, 237, 243, 0.45)',
        glow3: 'rgba(52, 237, 243, 0.25)'
      },
      pink: {
        fg:    '#f715ab',
        glow1: 'rgba(247, 21, 171, 0.70)',
        glow2: 'rgba(247, 21, 171, 0.45)',
        glow3: 'rgba(247, 21, 171, 0.25)'
      },
      white: {
        fg:    '#ffffff',
        glow1: 'rgba(255, 255, 255, 0.70)',
        glow2: 'rgba(255, 255, 255, 0.45)',
        glow3: 'rgba(255, 255, 255, 0.25)'
      }
    };

    function applyTheme(key) {
      const k = THEMES[key] ? key : 'default';
      const t = THEMES[k];
      const root = document.documentElement;
      root.style.setProperty('--fg', t.fg);
      root.style.setProperty('--glow-1', t.glow1);
      root.style.setProperty('--glow-2', t.glow2);
      root.style.setProperty('--glow-3', t.glow3);
      try { localStorage.setItem(COLOR_KEY, k); } catch {}
    }

    // Restore color from localStorage (or default) and reflect in dropdown
    let savedColor = 'default';
    try { savedColor = localStorage.getItem(COLOR_KEY) || 'default'; } catch {}
    colorSelect.value = THEMES[savedColor] ? savedColor : 'default';
    applyTheme(colorSelect.value);

    // ——— Invert persistence ———
    const INVERT_KEY = 'neon.invert';

    function applyInvert(isInverted) {
      ledScreen.classList.toggle('led-invert', !!isInverted);
      try { localStorage.setItem(INVERT_KEY, isInverted ? '1' : '0'); } catch {}
    }

    // Restore saved invert state
    let savedInvert = false;
    try { savedInvert = localStorage.getItem(INVERT_KEY) === '1'; } catch {}
    if (invertToggle) {
      invertToggle.checked = savedInvert;
      applyInvert(savedInvert);
      invertToggle.addEventListener('change', () => {
        applyInvert(invertToggle.checked);
      });
    }


    // ===== Utils =====
    const isiOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    const getCurrentMode = () => {
      const v = (modeSelect.value || 'scroll').toLowerCase();
      return v === 'static' || v === 'scroll' ? v : 'scroll';
    };

    const setModeFromString = (mode) => {
      const m = (mode || '').toLowerCase();
      if (m === 'static' || m === 'scroll') modeSelect.value = m;
    };

    function buildShareUrl() {
      const raw = (input.value || '').trim();
      if (!raw) return null;

      const base = location.origin + location.pathname; // preserves repo path
      const params = new URLSearchParams({
        msg: raw,
        autoplay: '1',
        display: getCurrentMode(), // preferred key
      });

      return `${base}?${params.toString()}`;
    }

    async function shareOrCopy(url) {
      try {
        if (navigator.share && isSecureContext) {
          await navigator.share({ url });
          return;
        }
      } catch {
        // fall through to copy
      }
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch {
        // Legacy fallback
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          alert('Link copied to clipboard!');
        } finally {
          document.body.removeChild(ta);
        }
      }
    }

    // ===== Event listeners =====
    if (modeSelect) {
      modeSelect.addEventListener('change', () => {
        // no extra work; showLED reads current mode
      });
    }

    if (colorSelect) {
      colorSelect.addEventListener('change', () => {
        applyTheme(colorSelect.value);
      });
    }

    if (btn) {
      btn.addEventListener('click', () => {
        const raw = (input.value || '').trim();
        if (!raw) return;
        showLED(raw);
      });
    }

    // ===== Fullscreen helpers =====
    async function enterFullscreen() {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        try { await el.requestFullscreen(); } catch {}
      }
    }

    async function exitFullscreen() {
      if (document.fullscreenElement && document.exitFullscreen) {
        try { await document.exitFullscreen(); } catch {}
      }
    }

    // ===== Animation =====
    function computeAndRunAnimation() {
      // Use scrollWidth for true content width
      const contentWidth = marquee.scrollWidth;
      const viewportWidth = window.innerWidth;

      // Distance ensures content fully exits before repeating
      const distance = contentWidth + viewportWidth + (viewportWidth * 0.06);

      // Read CSS custom prop, default to 140 px/s if missing
      const speedRaw = getComputedStyle(document.documentElement)
        .getPropertyValue('--speed-px-per-sec')
        .trim();
      const pxPerSec = Number.parseFloat(speedRaw) || 140;
      const durationSec = Math.max(4, distance / pxPerSec);

      marquee.style.setProperty('--content-width', contentWidth + 'px');
      marquee.style.animation = `scroll ${durationSec}s linear infinite`;
    }

    function showLED(msg, forcedMode) {
      const text = (msg || '').toString().trim().toUpperCase();
      if (!text) return;

      const mode = (forcedMode || getCurrentMode()).toLowerCase();

      marquee.textContent = text;
      marquee.classList.toggle('static', mode === 'static');

      // Reset previous animation
      marquee.style.animation = 'none';

      // Show screen
      ledScreen.classList.add('visible');
      ledScreen.setAttribute('aria-hidden', 'false');
      formView.style.display = 'none';

      if (mode === 'scroll') {
        // Let layout settle, then compute animation
        requestAnimationFrame(computeAndRunAnimation);
      } else {
        marquee.style.removeProperty('--content-width');
      }
    }

    function hideLED() {
      marquee.style.animation = 'none';
      ledScreen.classList.remove('visible');
      ledScreen.setAttribute('aria-hidden', 'true');
      formView.style.display = '';
      input.focus();
    }

    // Debounced resize: recompute animation only when visible & scrolling
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (!ledScreen.classList.contains('visible')) return;
      if (marquee.classList.contains('static')) return;
      marquee.style.animation = 'none';
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => requestAnimationFrame(computeAndRunAnimation), 120);
    });

    // ===== Display triggers =====
    btn.addEventListener('click', async () => {
      await enterFullscreen();
      showLED(input.value || '');
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await enterFullscreen();
        showLED(input.value || '');
      }
    });

    // ===== Exit triggers =====
    ledScreen.addEventListener('click', async () => {
      hideLED();
      await exitFullscreen();
    });

    document.addEventListener('keydown', async (e) => {
      if (e.key === 'Escape' && ledScreen.classList.contains('visible')) {
        hideLED();
        await exitFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && ledScreen.classList.contains('visible')) {
        hideLED();
      }
    });

    // ===== PWA install button logic =====
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn && !isStandalone()) installBtn.hidden = false;
      if (iosTip) iosTip.hidden = true; // prompt will be shown -> hide iOS hint
    });

    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.hidden = true;
      deferredPrompt = null;
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
          // iOS or unsupported
          if (isiOS() && !isStandalone()) {
            alert('On iPhone/iPad: Share ▸ Add to Home Screen to install.');
          }
          return;
        }
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.hidden = true;
      });
    }

    // If iOS & not installed & no prompt event will fire, show tip (slight delay)
    setTimeout(() => {
      if (isiOS() && !isStandalone() && installBtn && installBtn.hidden) {
        if (iosTip) iosTip.hidden = false;
      }
    }, 2500);

    // ===== URL params: ?msg=...&autoplay=1&mode=static|scroll (also supports &display=...) =====
    const params  = new URLSearchParams(location.search);
    const urlMsg  = params.get('msg');
    const auto    = params.get('autoplay') === '1';
    const urlMode = (params.get('mode') || params.get('display') || '').toLowerCase();

    if (urlMode === 'static' || urlMode === 'scroll') {
      setModeFromString(urlMode);
    }

    if (urlMsg) {
      const text = (urlMsg || '').toString().trim();
      if (text) {
        input.value = text;
        if (auto) {
          const modeForAutoplay =
            urlMode === 'static' || urlMode === 'scroll' ? urlMode : getCurrentMode();
          enterFullscreen().then(() => showLED(text, modeForAutoplay));
        }
      }
    }

    // ===== Share button =====
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const url = buildShareUrl();
        if (!url) return;
        await shareOrCopy(url);
      });
    }
  }
})();
