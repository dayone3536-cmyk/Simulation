  // ---------- boot / loading screen ----------
  // The game decodes a few megabytes of base64 art before the first frame. This overlay is in the HTML from the
  // very first paint, so the player sees a proper Clash-style loading bar with tips instead of a bare green screen.
  (function () {
    const bootEl = document.getElementById('boot');
    if (!bootEl) return;
    const fill = document.getElementById('bootFill');
    const pctEl = document.getElementById('bootPct');
    const labelEl = document.getElementById('bootLabel');
    const barEl = document.getElementById('bootBar');
    const tipText = document.getElementById('bootTipText');

    const TIPS = [
      'Tap a ripe farm\u2019s wheat bubble to harvest it.',
      'Sell spare food at the Market \u2014 prices change every 40 seconds.',
      'Villagers eat food every 20 seconds. Keep your granary stocked.',
      'Build Woodcutter Huts to grow your population.',
      'Hold a feast at your home for a village-wide boost.',
      'Drag your home to move it, and tap it to manage upgrades.',
      'The first crop on your very first farm ripens in just 5 seconds.',
      'Pinch to zoom out and see the whole clearing.',
      'A farmer on each farm keeps the crops growing at full speed.',
      'Sell when the Market says \u201cExcellent price\u201d for the best deal.'
    ];

    const start = performance.now();
    const MIN_SHOW_MS = 1400;     // never blink away so fast that it looks broken
    let shown = 0, target = 0, finished = false, last = start, lastPct = -1, lastLabel = '', tipIndex = 0;

    function stageFor(p) {
      if (p < 30) return 'Waking the forest\u2026';
      if (p < 62) return 'Planting the fields\u2026';
      if (p < 90) return 'Bringing the villagers home\u2026';
      return 'Almost ready\u2026';
    }

    function render() {
      if (fill) fill.style.width = shown.toFixed(1) + '%';
      const pct = Math.max(0, Math.min(100, Math.round(shown)));
      if (pct !== lastPct && pctEl) { lastPct = pct; pctEl.textContent = pct + '%'; }
      const label = stageFor(shown);
      if (label !== lastLabel && labelEl) { lastLabel = label; labelEl.textContent = label; }
      if (barEl) barEl.classList.toggle('filling', shown > 1 && !finished);
    }

    function fadeOut() {
      if (finished) return;
      finished = true;
      bootEl.classList.add('boot-out');
      setTimeout(() => bootEl.remove(), 700);
    }

    function tick(now) {
      const dt = Math.min(.1, (now - last) / 1000);
      last = now;
      if (!finished) {
        if (target < 90) target = Math.min(90, target + dt * 2.3);   // gentle trickle while the art decodes
        shown += (target - shown) * (1 - Math.exp(-dt * 7));
        render();
        if (target >= 100 && now - start >= MIN_SHOW_MS) {
          if (shown > 99.2) { shown = 100; render(); fadeOut(); }
        }
      }
      if (!finished) requestAnimationFrame(tick);
    }

    function nextTip() {
      if (!tipText) return;
      tipText.classList.add('swap');
      setTimeout(() => {
        tipIndex = (tipIndex + 1) % TIPS.length;
        tipText.textContent = TIPS[tipIndex];
        tipText.classList.remove('swap');
      }, 280);
    }

    if (tipText) tipText.textContent = TIPS[0];
    const tipTimer = setInterval(() => { if (!finished) nextTip(); else clearInterval(tipTimer); }, 3800);

    window.BootScreen = {
      // real loading progress, 0..1 — keeps the bar honest without ever going backwards
      progress: function (f) {
        if (finished) return;
        const p = Math.max(0, Math.min(1, Number(f) || 0)) * 100;
        if (p > target) target = Math.max(target, Math.min(99, p));
      },
      done: function () {
        if (!finished) target = 100;
      }
    };

    render();
    requestAnimationFrame(tick);
  })();
