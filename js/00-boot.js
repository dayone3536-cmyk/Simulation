  // ---------- boot / loading screen ----------
  // A quiet title card over the forest: a hairline ember trail instead of a chunky web progress bar.
  // The game decodes several megabytes of base64 art before the first frame, so this is on screen from the first paint.
  (function () {
    const bootEl = document.getElementById('boot');
    if (!bootEl) return;
    const pctEl = document.getElementById('bootNum');
    const labelEl = document.getElementById('bootLabel');
    const tipText = document.getElementById('bootTipText');

    const TIPS = [
      'Tap a ripe field to gather its wheat.',
      'The market rate changes every forty-five seconds.',
      'Your villagers eat every twenty seconds \u2014 keep the granary full.',
      'Build a Woodcutter Hut to keep the wood coming while you are away.',
      'Drag your home to move it. Tap it to manage it.',
      'The first field ripens in five seconds.',
      'Pinch to see the whole clearing.',
      'One farmer per field keeps the crops growing briskly.',
      'Sell when the market calls it an excellent price.'
    ];

    const start = performance.now();
    const MIN_SHOW_MS = 1600;
    let shown = 0, target = 0, finished = false, last = start, lastPct = -1, lastLabel = '', tipIndex = 0;

    function stageFor(p) {
      if (p < 26) return 'Waking the village';
      if (p < 58) return 'Raising the cabins';
      if (p < 86) return 'Bringing the villagers in';
      return 'Lighting the lanterns';
    }

    function render() {
      bootEl.style.setProperty('--boot-p', shown.toFixed(2) + '%');
      const pct = Math.max(0, Math.min(100, Math.round(shown)));
      if (pct !== lastPct && pctEl) { lastPct = pct; pctEl.textContent = pct; }
      const label = stageFor(shown);
      if (label !== lastLabel && labelEl) { lastLabel = label; labelEl.textContent = label; }
    }

    function fadeOut() {
      if (finished) return;
      finished = true;
      bootEl.classList.add('boot-out');
      setTimeout(() => bootEl.remove(), 950);
    }

    function tick(now) {
      const dt = Math.min(.1, (now - last) / 1000);
      last = now;
      if (!finished) {
        if (target < 90) target = Math.min(90, target + dt * 2.1);
        shown += (target - shown) * (1 - Math.exp(-dt * 6.5));
        render();
        if (target >= 100 && shown > 99.4 && now - start >= MIN_SHOW_MS) {
          shown = 100;
          render();
          bootEl.classList.add('is-done');
          setTimeout(fadeOut, 260);
        }
      }
      if (!finished) requestAnimationFrame(tick);
    }

    function swapTip() {
      if (!tipText) return;
      tipText.classList.add('is-swapping');
      setTimeout(() => {
        tipIndex = (tipIndex + 1) % TIPS.length;
        tipText.textContent = TIPS[tipIndex];
        tipText.classList.remove('is-swapping');
      }, 400);
    }

    if (tipText) tipText.textContent = TIPS[0];
    const tipTimer = setInterval(() => { if (!finished) swapTip(); else clearInterval(tipTimer); }, 6000);

    window.BootScreen = {
      progress: function (f) {
        if (finished) return;
        const p = Math.max(0, Math.min(1, Number(f) || 0)) * 100;
        if (p > target) target = Math.min(99, p);
      },
      done: function () {
        if (!finished) target = 100;
      }
    };

    render();
    requestAnimationFrame(tick);
  })();
