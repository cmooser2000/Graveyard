/* Headstone History — Timeline renderer
   Loads data/timeline.json and renders a vertical timeline with
   date pills (dark = history, moss = local people), thumbnails, and
   scroll-triggered fade-in.

   Two ways to use:
   - Standalone /timeline.html: a #timeline element exists at script-load
     time and is auto-mounted.
   - Embedded (e.g. on the homepage): call window.renderTimelineInto(el)
     to mount on demand. */

(function () {
  async function renderTimelineInto(mount) {
    if (!mount) return;
    if (mount.dataset.timelineLoaded === 'true') return;
    mount.dataset.timelineLoaded = 'true';
    if (!mount.classList.contains('timeline')) mount.classList.add('timeline');

    let data;
    try {
      const res = await fetch('/data/timeline.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('failed to load timeline.json');
      data = await res.json();
    } catch (err) {
      mount.innerHTML = '<p class="muted">Could not load the timeline. Please refresh.</p>';
      console.error(err);
      return;
    }

    const entries = (data && data.entries) || [];
    const frag = document.createDocumentFragment();
    for (const entry of entries) frag.appendChild(renderEntry(entry));
    mount.appendChild(frag);

    // Scroll-triggered fade/slide-in
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (items) => {
          for (const item of items) {
            if (item.isIntersecting) {
              item.target.classList.add('in-view');
              io.unobserve(item.target);
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
      );
      mount.querySelectorAll('.timeline-entry').forEach((el) => io.observe(el));
    } else {
      mount.querySelectorAll('.timeline-entry').forEach((el) => el.classList.add('in-view'));
    }
  }

  function renderEntry(entry) {
    const wrap = document.createElement('article');
    wrap.className = `timeline-entry ${entry.type === 'person' ? 'person' : 'history'}`;
    wrap.id = `entry-${entry.id}`;

    const pill = document.createElement('div');
    pill.className = 'timeline-pill';
    pill.textContent = entry.date;
    wrap.appendChild(pill);

    const card = entry.link ? document.createElement('a') : document.createElement('div');
    card.className = 'timeline-card';
    if (entry.link) {
      card.href = entry.link;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }

    const imgWrap = document.createElement('div');
    imgWrap.className = 'timeline-image';
    if (entry.image) {
      const img = document.createElement('img');
      img.src = entry.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        imgWrap.classList.add('timeline-image--placeholder');
        imgWrap.innerHTML = placeholderOrnament();
      });
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('timeline-image--placeholder');
      imgWrap.innerHTML = placeholderOrnament();
    }
    card.appendChild(imgWrap);

    const body = document.createElement('p');
    body.className = 'timeline-body';
    body.textContent = entry.body;
    card.appendChild(body);

    wrap.appendChild(card);
    return wrap;
  }

  function placeholderOrnament() {
    return '<span class="placeholder-mark" aria-hidden="true"></span>';
  }

  // Auto-mount for the standalone /timeline.html
  const standalone = document.getElementById('timeline');
  if (standalone) renderTimelineInto(standalone);

  // Expose for explicit mount (e.g. homepage disclosure)
  window.renderTimelineInto = renderTimelineInto;
})();
