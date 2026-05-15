/* ───────────────────────────────────────────────
   Headstone History — journey.js
   Data-driven grave template · vanilla JS
   ─────────────────────────────────────────────── */

(function () {
  'use strict';

  var STORAGE_KEY = 'eden_progress';
  var TOTAL_GRAVES = 7;
  var CHAPTER_WORDS = ['One','Two','Three','Four','Five','Six','Seven'];

  // Virtual-tour mode lets visitors who aren't at the cemetery watch the
  // videos without entering the unlock years. No progress is saved, no
  // certificate is offered at the end.
  var VIRTUAL_MODE = new URLSearchParams(window.location.search).get('virtual') === '1';
  var VIRTUAL_SUFFIX = VIRTUAL_MODE ? '&virtual=1' : '';

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
      // No query param — resume where they left off (highest unlocked).
      return progress ? highestUnlocked(progress) : 1;
    }
    var n = parseInt(raw, 10);
    if (isNaN(n) || n < 1 || n > TOTAL_GRAVES) return 1;
    return n;
  }

  // ── Preload helpers ────────────────────────
  // Cell service is spotty at the cemetery; we aggressively preload so the
  // next video is already cached by the time the user walks to the next stone.
  var gravesData = null;
  var preloadedUrls = {};

  function connectionIsSlow() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData) return true;
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
    document.title = grave.name + ' — Headstone History';

    document.getElementById('chapter').textContent = 'Chapter ' + (grave.chapter || CHAPTER_WORDS[num - 1] || num);
    document.getElementById('name').textContent = grave.name;

    var yearsEl = document.getElementById('years');
    if (grave.years && grave.years.trim()) {
      yearsEl.textContent = grave.years;
      yearsEl.classList.remove('hidden');
    } else {
      yearsEl.classList.add('hidden');
    }

    document.getElementById('findHeading').textContent = grave.findHeading || '';

    var mapImg = document.getElementById('mapImage');
    mapImg.src = grave.mapImage;
    mapImg.alt = 'Map showing the location of ' + grave.name + "'s stone";
    document.getElementById('mapCaption').textContent = grave.mapCaption || '';

    document.getElementById('prompt').textContent = grave.unlockPrompt || grave.prompt || 'Enter the year';

    var videoEl = document.getElementById('video');
    videoEl.preload = connectionIsSlow() ? 'metadata' : 'auto';
    videoEl.src = grave.video;
    preloadedUrls[grave.video] = true;

    document.getElementById('crumb').textContent =
      'Chapter ' + (CHAPTER_WORDS[num - 1] || num).toLowerCase() + ' of seven';
  }

  // ── Continue button text ───────────────────
  function setContinueButton(num) {
    var btn = document.getElementById('continueBtn');
    if (!btn || !gravesData) return;
    if (num >= TOTAL_GRAVES) {
      if (VIRTUAL_MODE) {
        btn.textContent = 'Back to home →';
        btn.setAttribute('href', '/');
      } else {
        btn.textContent = 'See your completion →';
        btn.setAttribute('href', '/complete.html');
      }
      return;
    }
    var next = gravesData.find(function (g) { return g.id === num + 1; });
    var label = next ? (next.shortName || next.name) : 'next story';
    btn.textContent = 'Move on to ' + label + ' →';
    btn.setAttribute('href', '/journey.html?grave=' + (num + 1) + VIRTUAL_SUFFIX);
  }

  // ── Story list (revisit panel) ─────────────
  function renderStoryList(num, progress) {
    var panel = document.getElementById('storyList');
    var list  = document.getElementById('storyListItems');
    if (!panel || !list || !gravesData) return;

    // Build links for every completed grave other than the current one
    var others = progress.completed
      .filter(function (id) { return id !== num; })
      .sort(function (a, b) { return a - b; });

    list.innerHTML = '';
    others.forEach(function (id) {
      var g = gravesData.find(function (x) { return x.id === id; });
      if (!g) return;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '/journey.html?grave=' + id;
      a.textContent = 'Go back to ' + (g.shortName || g.name);
      li.appendChild(a);
      list.appendChild(li);
    });

    // Show the panel when there's at least one other completed grave to revisit.
    if (others.length > 0) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  }

  // ── Reveal video block (first unlock OR revisit) ──
  function revealVideo() {
    document.getElementById('findHeading').classList.add('hidden');
    document.getElementById('mapBlock').classList.add('hidden');
    document.getElementById('formBlock').classList.add('hidden');
    document.getElementById('videoBlock').classList.add('visible');
  }

  // ── Form: year submission ──────────────────
  function bindForm(grave, num, progress) {
    var form    = document.getElementById('yearForm');
    var input   = document.getElementById('yearInput');
    var errorEl = document.getElementById('formError');

    input.addEventListener('input', function () {
      if (input.value.length > 4) input.value = input.value.slice(0, 4);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var guess = parseInt(input.value, 10);
      if (isNaN(guess)) { showError(); return; }
      if (guess === grave.unlockYear) {
        onCorrect();
      } else {
        showError();
      }
    });

    function showError() {
      errorEl.classList.add('show');
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
      input.select();
    }

    function onCorrect() {
      if (progress.completed.indexOf(num) === -1) progress.completed.push(num);
      var next = num + 1;
      if (next <= TOTAL_GRAVES && progress.unlocked.indexOf(next) === -1) {
        progress.unlocked.push(next);
      }
      saveProgress(progress);

      revealVideo();
      renderStoryList(num, progress);
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

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('.post-video')) return;
      if (video.paused || video.ended) {
        video.play().catch(function () {});
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
      if (hasPlayed && !video.ended) {
        postVideo.classList.add('visible');
      }
    });

    video.addEventListener('ended', function () {
      wrap.classList.remove('playing');
      wrap.classList.add('ended');
      postVideo.classList.add('visible');
    });

    continueBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var href = continueBtn.getAttribute('href') || '/';
      window.location.href = href;
    });

    watchAgain.addEventListener('click', function () {
      postVideo.classList.remove('visible');
      wrap.classList.remove('ended');
      try { video.currentTime = 0; } catch (e) {}
      video.play().catch(function () {});
    });
  }

  // ── Init ───────────────────────────────────
  function init() {
    var progress = VIRTUAL_MODE ? null : loadProgress();
    var num = getGraveNum(progress);

    // Gate: if not unlocked, redirect to highest unlocked. Skipped in
    // virtual-tour mode, where every grave is freely watchable.
    if (!VIRTUAL_MODE && progress.unlocked.indexOf(num) === -1) {
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
          window.location.replace('/journey.html?grave=1' + VIRTUAL_SUFFIX);
          return;
        }

        renderGrave(grave, num);
        bindVideo(num);
        setContinueButton(num);

        if (VIRTUAL_MODE) {
          // Virtual: skip the map + year form, go straight to the video.
          // Also reveal the continue button up front so visitors can move
          // on without waiting for the video to end.
          revealVideo();
          document.getElementById('postVideo').classList.add('visible');
          preloadNextGrave(num);
        } else {
          bindForm(grave, num, progress);
          renderStoryList(num, progress);

          // Already completed → skip map/form, show video immediately.
          if (progress.completed.indexOf(num) !== -1) {
            revealVideo();
            preloadNextGrave(num);
          }
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
