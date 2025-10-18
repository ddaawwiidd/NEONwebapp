(function start() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    const formView = document.getElementById('formView');
    const ledScreen = document.getElementById('ledScreen');
    const marquee = document.getElementById('marquee');
    const input = document.getElementById('messageInput');
    const btn = document.getElementById('displayBtn');

    if (!formView || !ledScreen || !marquee || !input || !btn) return;

    input.focus();

    async function enterFullscreen() {
      const el = document.documentElement;
      try {
        if (!document.fullscreenElement && el.requestFullscreen) {
          await el.requestFullscreen();
        }
      } catch {}
    }

    async function exitFullscreen() {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {}
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

    window.addEventListener('resize', () => {
      if (!ledScreen.classList.contains('visible')) return;
      marquee.style.animation = 'none';
      requestAnimationFrame(computeAndRunAnimation);
    });

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
  }
})();

