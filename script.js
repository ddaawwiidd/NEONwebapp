(function start() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    const formView   = document.getElementById('formView');
    const ledScreen  = document.getElementById('ledScreen');
    const marquee    = document.getElementById('marquee');
    const input      = document.getElementById('messageInput');
    const btn        = document.getElementById('displayBtn');
    const shareBtn   = document.getElementById('shareBtn');
    const installBtn = document.getElementById('installBtn');
    const iosTip     = document.getElementById('iosTip');

    if (!formView || !ledScreen || !marquee || !input || !btn) return;

    // Ensure input starts empty (placeholder only)
    input.value = '';
    input.focus();

    // ===== Fullscreen helpers =====
    async function enterFullscreen() {
      const el = document.documentElement;
      try { if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen(); } catch {}
    }
    async function exitFullscreen() {
      try { if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen(); } catch {}
    }

    function computeAndRunAnimation() {
      const contentWidth = marquee.offsetWidth;
      const viewportWidth = window.innerWidth;
      const distance = contentWidth + viewportWidth + (viewportWidth * 0.06);
      const pxPerSec = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--speed-px-per-sec')) || 140;
      const durationSec = Math.max(4, distance / pxPerSec);
      marquee.style.setProperty('--content-width', contentWidth + 'px');
      marquee.style.animation = `scroll ${durationSec}s linear infinite`;
    }

    function showLED(msg) {
      const text = (msg || '').toString().trim().toUpperCase();
      if (!text) return;
      marquee.textContent = text;
      marquee.style.animation = 'none';
      ledScreen.classList.add('visible');
      ledScreen.setAttribute('aria-hidden', 'false');
      formView.style.display = 'none';
      requestAnimationFrame(computeAndRunAnimation);
    }

    function hideLED() {
      marquee.style.animation = 'none';
      ledScreen.classList.remove('visible');
      ledScreen.setAttribute('aria-hidden', 'true');
      formView.style.display = '';
      input.focus();
    }

    // Recompute on resize while visible
    window.addEventListener('resize', () => {
      if (!ledScreen.classList.contains('visible')) return;
      marquee.style.animation = 'none';
      requestAnimationFrame(computeAndRunAnimation);
    });

    // Display triggers
    btn.addEventListener('click', async () => { await enterFullscreen(); showLED(input.value || ''); });
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); await enterFullscreen(); showLED(input.value || ''); }
    });

    // Exit triggers
    ledScreen.addEventListener('click', async () => { hideLED(); await exitFullscreen(); });
    document.addEventListener('keydown', async (e) => {
      if (e.key === 'Escape' && ledScreen.classList.contains('visible')) { hideLED(); await exitFullscreen(); }
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && ledScreen.classList.contains('visible')) hideLED();
    });

    // ===== Install button logic =====
    let deferredPrompt = null;
    function isiOS() {
      return /iphone|ipad|ipod/i.test(navigator.userAgent);
    }
    function isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn && !isStandalone()) installBtn.hidden = false; // show only when installable & not installed
      if (iosTip) iosTip.hidden = true; // prompt available → hide iOS tip
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

    // If iOS & not installed & no beforeinstallprompt event will fire, show tip
    setTimeout(() => {
      if (isiOS() && !isStandalone() && installBtn && installBtn.hidden) {
        if (iosTip) iosTip.hidden = false;
      }
    }, 2500);

    // ===== URL params support: ?msg=TEXT&autoplay=1 =====
    const params = new URLSearchParams(location.search);
    const urlMsg = params.get('msg');
    const auto = params.get('autoplay') === '1';
    if (urlMsg) {
      const text = decodeURIComponent(urlMsg).toString().trim();
      if (text) {
        input.value = text;
        if (auto) enterFullscreen().then(() => showLED(text));
      }
    }

    // ===== Share button =====
    if (shareBtn) {
      const canNativeShare = !!navigator.share;
      shareBtn.addEventListener('click', async () => {
        const raw = (input.value || '').trim();
        if (!raw) { input.focus(); return; }
        const base = location.origin + location.pathname; // works on GitHub Pages subpath
        const shareUrl = `${base}?msg=${encodeURIComponent(raw)}&autoplay=1`;

        if (canNativeShare) {
          try {
            await navigator.share({ title: 'LED Message', text: 'Open this LED message (installable PWA):', url: shareUrl });
          } catch {
            try { await navigator.clipboard.writeText(shareUrl); alert('Link copied. Share it with your friend!'); }
            catch { prompt('Copy this link:', shareUrl); }
          }
        } else {
          try { await navigator.clipboard.writeText(shareUrl); alert('Link copied. Share it with your friend!'); }
          catch { prompt('Copy this link:', shareUrl); }
        }
      });
    }
  }
})();
