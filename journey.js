/* ───────────────────────────────────────────────
   When This Was Eden — journey.js
   Data-driven grave template · vanilla JS
   ─────────────────────────────────────────────── */

(function () {
  'use strict';

  var STORAGE_KEY = 'eden_progress';
  var TOTAL_GRAVES = 7;

  // ── Progress ───────────────────────────────
  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { unlocked: [1], completed: [] };
      var p = JSON.parse(raw);
      if (!p || !Array.isArray(p.unlocked) || !Array.isArray(p.completed)) {
        return { unlocked: [1], completed: [] };
      }
      if (p.unlocked.indexOf(1) === -1) p.unlocked.push(1);
      return p;
    } catch (e) {
      return { unlocked: [1], completed: [] };
    }
  }

  function saveProgress(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) {}
  }

  function highestUnlocked(progress) {
    return progress.unlocked.reduce(function (m, n) { return n > m ? n : m; }, 1);
  }

  // ── URL param ──────────────────────────────
  function getGraveNum(progress) {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('grave');
    if (raw === null) {
      // No query param — resume where they left off (highest unlocked),
      // so clicking Home and coming back lands them on their latest page.
      return progress ? highestUnlocked(progress) : 1;
    }
    var n = parseInt(raw, 10);
    if (isNaN(n) || n < 1 || n > TOTAL_GRAVES) return 1;
    return n;
  }

  // ── Chapter word (spelled out) ─────────────
  var CHAPTER_WORDS = ['One','Two','Three','Four','Five','Six','Seven'];

  // ── Preload helpers ────────────────────────
  // Cell service is spotty at the cemetery; we aggressively preload so the
  // next video is already in the browser cache by the time the user walks
  // to the next stone.
  var gravesData = null;
  var preloadedUrls = {};

  function connectionIsSlow() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData) return true;
    // effectiveType is one of: 'slow-2g', '2g', '3g', '4g'
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
    return false;
  }

  function preloadVideo(url) {
    if (!url || preloadedUrls[url]) return;
    if (connectionIsSlow()) return;
    var v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.src = url;
    v.style.display = 'none';
    document.body.appendChild(v);
    try { v.load(); } catch (e) {}
    preloadedUrls[url] = true;
  }

  function preloadNextGrave(currentNum) {
    if (!gravesData || currentNum >= TOTAL_GRAVES) return;
    var next = gravesData.find(function (g) { return g.id === currentNum + 1; });
    if (next && next.video) preloadVideo(next.video);
  }

  // ── Render ─────────────────────────────────
  function renderGrave(grave, num) {
    document.title = grave.name + ' — When This Was Eden';

    document.getElementById('chapter').textContent = 'Chapter ' + (grave.chapter || CHAPTER_WORDS[num - 1] || num);
    document.getElementById('name').textContent = grave.name;

    var yearsEl = document.getElementById('years');
    if (grave.years && grave.years.trim()) {
      yearsEl.textContent = grave.years;
      yearsEl.classList.remove('hidden');
    } else {
      yearsEl.classList.add('hidden');
    }

    document.getElementById('prompt').textContent = grave.prompt || 'Enter the year';

    var videoEl = document.getElementById('video');
    // Upgrade to aggressive preload while the user is typing the year,
    // unless the connection is slow — then stick with metadata only.
    videoEl.preload = connectionIsSlow() ? 'metadata' : 'auto';
    videoEl.src = grave.video;
    preloadedUrls[grave.video] = true;

    document.getElementById('crumb').textContent = 'Chapter ' + (CHAPTER_WORDS[num - 1] || num).toLowerCase() + ' of seven';
  }

  // ── Form: year submission ──────────────────
  function bindForm(grave, num, progress) {
    var form      = document.getElementById('yearForm');
    var input     = document.getElementById('yearInput');
    var errorEl   = document.getElementById('formError');
    var formBlock = document.getElementById('formBlock');
    var videoBlock = document.getElementById('videoBlock');

    // Enforce 4-digit max via input handler (maxlength doesn't apply to type=number)
    input.addEventListener('input', function () {
      if (input.value.length > 4) input.value = input.value.slice(0, 4);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var guess = parseInt(input.value, 10);
      if (isNaN(guess)) {
        showError();
        return;
      }
      if (guess === grave.unlockYear) {
        onCorrect();
      } else {
        showError();
      }
    });

    function showError() {
      errorEl.classList.add('show');
      input.classList.remove('shake');
      // force reflow to restart animation
      void input.offsetWidth;
      input.classList.add('shake');
      input.select();
    }

    function onCorrect() {
      // Mark completed; unlock next grave
      if (progress.completed.indexOf(num) === -1) progress.completed.push(num);
      var next = num + 1;
      if (next <= TOTAL_GRAVES && progress.unlocked.indexOf(next) === -1) {
        progress.unlocked.push(next);
      }
      saveProgress(progress);

      // Hide the form, reveal the video
      formBlock.classList.add('hidden');
      videoBlock.classList.add('visible');

      // Start buffering the next grave's video while they watch this one.
      preloadNextGrave(num);
    }
  }

  // ── Video player ───────────────────────────
  function bindVideo(num) {
    var wrap        = document.getElementById('videoWrap');
    var video       = document.getElementById('video');
    var postVideo   = document.getElementById('postVideo');
    var continueBtn = document.getElementById('continueBtn');
    var watchAgain  = document.getElementById('watchAgainBtn');
    var hasPlayed   = false;

    // Tap anywhere on the video → toggle play/pause
    wrap.addEventListener('click', function (e) {
      // Don't toggle if user clicked a post-video button (they're outside wrap anyway, but guard)
      if (e.target.closest('.post-video')) return;
      if (video.paused || video.ended) {
        video.play().catch(function () { /* autoplay blocked — the user tap should allow it */ });
      } else {
        video.pause();
      }
    });

    video.addEventListener('play', function () {
      hasPlayed = true;
      wrap.classList.add('playing');
      wrap.classList.remove('ended');
    });

    video.addEventListener('pause', function () {
      wrap.classList.remove('playing');
      // If the user has started watching and then paused (including by
      // tapping "Done" in iOS's native fullscreen player before the clip
      // ends), surface the Continue / Watch again controls so they have
      // a way forward without having to replay to the end.
      if (hasPlayed && !video.ended) {
        postVideo.classList.add('visible');
      }
    });

    video.addEventListener('ended', function () {
      wrap.classList.remove('playing');
      wrap.classList.add('ended');
      postVideo.classList.add('visible');
    });

    // Continue button — next grave or complete
    continueBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (num >= TOTAL_GRAVES) {
        window.location.href = '/complete.html';
      } else {
        window.location.href = '/journey.html?grave=' + (num + 1);
      }
    });

    // Watch again — rewind and play
    watchAgain.addEventListener('click', function () {
      postVideo.classList.remove('visible');
      wrap.classList.remove('ended');
      try { video.currentTime = 0; } catch (e) {}
      video.play().catch(function () {});
    });
  }

  // ── Init ───────────────────────────────────
  function init() {
    var progress = loadProgress();
    var num = getGraveNum(progress);

    // Gate: if not unlocked, redirect to highest unlocked
    if (progress.unlocked.indexOf(num) === -1) {
      var target = highestUnlocked(progress);
      window.location.replace('/journey.html?grave=' + target);
      return;
    }

    fetch('/data/graves.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load graves.json');
        return r.json();
      })
      .then(function (graves) {
        gravesData = graves;
        var grave = graves.find(function (g) { return g.id === num; });
        if (!grave) {
          window.location.replace('/journey.html?grave=1');
          return;
        }
        renderGrave(grave, num);
        bindForm(grave, num, progress);
        bindVideo(num);

        // If already completed, skip form and show video immediately,
        // and start preloading the next grave so Continue is instant.
        if (progress.completed.indexOf(num) !== -1) {
          document.getElementById('formBlock').classList.add('hidden');
          document.getElementById('videoBlock').classList.add('visible');
          preloadNextGrave(num);
        }
      })
      .catch(function (err) {
        console.error(err);
        document.getElementById('name').textContent = 'Unable to load.';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
