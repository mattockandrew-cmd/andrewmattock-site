(() => {
  const hero = document.querySelector('.hero');
  const scene = document.querySelector('.reel-window');
  const track = document.querySelector('.reel-track');
  const originals = [...track.children];
  const requestedWork = new URLSearchParams(location.search).get('work');
  const initialCardIndex = requestedWork === 'web' ? Math.max(0, originals.findIndex(card => card.matches('.web-experiences'))) : 1;
  const menu = document.querySelector('#site-menu');
  const menuButton = document.querySelector('.menu-button');
  const dialog = document.querySelector('#film-dialog');
  const videoFrame = document.querySelector('.video-frame');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 760px)');
  let visible = true, hovered = null, dragging = false;
  let originX = 0, originScroll = 0, lastPointerX = 0, dragDistance = 0;
  let velocity = 0, idleUntil = 0, cycleWidth = 0, lastScroll = NaN;
  let opener = null, videoCard = null, lastVideoCheck = 0, commercialCard = null;
  for (let repeat = 0; repeat < 2; repeat++) {
    const copy = document.createDocumentFragment();
    originals.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.tabIndex = -1;
      clone.dataset.clone = 'true';
      clone.querySelectorAll('a, button, [tabindex]').forEach(control => { control.tabIndex = -1; });
      copy.append(clone);
    });
    if (repeat === 0) track.prepend(copy);
    else track.append(copy);
  }
  const cards = [...track.children];
  cards.forEach(card => {
    const surface = card.querySelector('.reel-image');
    ['card-spot', 'card-rim', 'card-edge', 'card-edge-left', 'card-edge-right'].forEach(name => {
      const light = document.createElement('span');
      light.className = `card-light ${name}`;
      light.setAttribute('aria-hidden', 'true');
      if (name === 'card-spot') { const orb = document.createElement('span'); orb.className = 'card-spot-orb'; light.append(orb); }
      surface.append(light);
    });
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && !dragging) { hovered = card; card.style.zIndex = '5'; }
    });
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || dragging || reduced.matches || event.target.closest('.campaign-phone, .card-switcher')) return;
      const r = card.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - r.left) / r.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - r.top) / r.height * 2 - 1));
      const tx = (x * 6).toFixed(2), ty = (y * 6).toFixed(2);
      surface.style.transform = `translate(${tx}px, ${ty}px) rotateY(${tx}deg) rotateX(${-ty}deg)`;
      card.style.setProperty('--tilt-light', String(-x * .36));
      const size = Math.max(card.offsetWidth, card.offsetHeight) * 1.5;
      const orb = surface.querySelector('.card-spot-orb');
      orb.style.width = orb.style.height = `${size}px`;
      orb.style.transform = `translate(${(x + 1) / 2 * card.offsetWidth - size / 2}px, ${(y + 1) / 2 * card.offsetHeight - size / 2}px)`;
    });
    card.addEventListener('pointerleave', () => {
      if (hovered === card) hovered = null;
      surface.style.transform = '';
      card.style.setProperty('--tilt-light', '0');
      card.style.zIndex = '';
    });
  });

  function sceneViewport() {
    return phone.matches ? {left:0,top:0,right:window.innerWidth,bottom:window.innerHeight} : scene.getBoundingClientRect();
  }
  function scrollCarousel(nextScroll = scene.scrollLeft) {
    if (phone.matches || !cycleWidth) return;
    // Keep a full repeat available on either side, even on wider displays.
    const lower = Math.max(0, (cycleWidth * (cards.length / originals.length - 1) - scene.clientWidth) / 2);
    const normalized = lower + ((nextScroll - lower) % cycleWidth + cycleWidth) % cycleWidth;
    const shift = normalized - nextScroll;
    if (Math.abs(shift) > .01) {
      const focused = scene.contains(document.activeElement) ? document.activeElement : null;
      let movedFocus = false;
      // Recycle whole offscreen repeats so visible players keep their DOM/state.
      const rotations = Math.round(-shift / cycleWidth) % (cards.length / originals.length);
      for (let i = 0; i < Math.abs(rotations); i++) {
        const ordered = [...track.children];
        const group = rotations > 0 ? ordered.slice(0, originals.length) : ordered.slice(-originals.length);
        if (focused && group.some(card => card.contains(focused))) movedFocus = true;
        if (rotations > 0) track.append(...group);
        else track.prepend(...group);
      }
      if (dragging) originScroll += shift;
      lastScroll = NaN;
      scene.scrollLeft = normalized;
      if (movedFocus && document.activeElement !== focused) focused.focus({preventScroll:true});
      return;
    }
    if (Math.abs(scene.scrollLeft - normalized) > .01) scene.scrollLeft = normalized;
  }
  function measure(center = false) {
    menuButton.textContent = phone.matches ? 'About' : 'Menu';
    if (phone.matches) {
      cycleWidth = 0;
      scene.style.maxWidth = '';
      scene.style.marginInline = '';
      scene.scrollLeft = scene.scrollTop = 0;
      if (center && requestedWork === 'web') originals[initialCardIndex].scrollIntoView({block:'start',behavior:'instant'});
    } else {
      const previousScroll = scene.scrollLeft;
      const previousFraction = cycleWidth ? (previousScroll % cycleWidth) / cycleWidth : 0;
      const ordered = [...track.children];
      cycleWidth = ordered[originals.length].offsetLeft - ordered[0].offsetLeft;
      // Keep enough buffered content even on extremely wide windows.
      scene.style.maxWidth = `${Math.max(1, cycleWidth * (cards.length / originals.length - 1) - 1)}px`;
      scene.style.marginInline = 'auto';
      scene.scrollTop = 0;
      scrollCarousel(center
        ? originals[initialCardIndex].offsetLeft + originals[initialCardIndex].offsetWidth / 2 - scene.clientWidth / 2
        : cycleWidth + previousFraction * cycleWidth);
    }
    lastScroll = NaN;
    paint();
  }
  function paint() {
    if (phone.matches) {
      if (scene.scrollTop === lastScroll) return;
      lastScroll = scene.scrollTop;
      cards.forEach(card => { card.style.transform = "none"; card.style.setProperty("--arc-light", ".2"); });
      return;
    }
    const half = scene.clientWidth / 2;
    if (scene.scrollLeft === lastScroll) return;
    lastScroll = scene.scrollLeft;
    cards.forEach((card, index) => {
      const x = card.offsetLeft + card.offsetWidth / 2 - scene.scrollLeft;
      const p = Math.max(-1, Math.min(1, (x - half) / half));
      const tilt = p * 25;
      const z = 300 * (1 - p * p);
      const roll = p * 4 * (index % originals.length % 2 ? -1 : 1);
      const y = 120 * p * p;
      card.style.transform = `perspective(1200px) rotateY(${tilt}deg) translateZ(${z}px) rotate(${roll}deg) translateY(${y}px)`;
      card.style.setProperty('--arc-light', Math.max(-1, Math.min(1, p * 1.3 + .2)).toFixed(1));
    });
  }
  function clearBackgroundVideo() {
    videoCard?.querySelector('iframe')?.remove();
    videoCard = null;
  }
  function playCommercial(card) {
    if (!card || reduced.matches || menu.open || dialog.open || document.hidden || !visible) return;
    const r = card.getBoundingClientRect(), view = sceneViewport();
    if (r.right <= view.left || r.left >= view.right || r.bottom <= view.top || r.top >= view.bottom) return;
    const video = card.querySelector('video');
    if (video.dataset.playPending === 'true') return;
    if (!video.getAttribute('src')) video.src = 'assets/autodesk-excerpt.mp4';
    video.muted = true;
    video.playsInline = true;
    video.dataset.playPending = 'true';
    video.play().then(() => {
      delete video.dataset.playPending;
      delete video.dataset.autoplayBlocked;
      video.controls = false;
    }).catch(error => {
      delete video.dataset.playPending;
      // Leaving view can cancel a pending play; this is not an autoplay denial.
      if (error.name === 'AbortError' || commercialCard !== card) return;
      const bounds = card.getBoundingClientRect(), viewport = sceneViewport();
      if (document.hidden || menu.open || dialog.open || bounds.right <= viewport.left || bounds.left >= viewport.right || bounds.bottom <= viewport.top || bounds.top >= viewport.bottom) return;
      video.dataset.autoplayBlocked = 'true';
      video.controls = true;
    });
  }
  function updateCommercial() {
    const stopped = reduced.matches || menu.open || dialog.open || document.hidden || !visible;
    hero.classList.toggle('media-paused', stopped);
    document.dispatchEvent(new Event('portfolio:motionchange'));
    const target = stopped ? null : cards.filter(card => card.matches('.autodesk')).find(card => {
      const r = card.getBoundingClientRect();
      const s = sceneViewport();
      return r.right > s.left && r.left < s.right && r.bottom > s.top && r.top < s.bottom;
    });
    if (target === commercialCard) {
      const video = target?.querySelector('video');
      if (video?.paused && video.dataset.autoplayBlocked !== 'true') playCommercial(target);
      return;
    }
    commercialCard?.querySelector('video')?.pause();
    commercialCard = target;
    if (target) playCommercial(target);
  }
  function updateVideo() {
    updateCommercial();
    if (reduced.matches || menu.open || dialog.open || document.hidden || !visible) {
      clearBackgroundVideo(); return;
    }
    const film = cards.find(card => {
      if (!card.matches('.film')) return false;
      const r = card.getBoundingClientRect();
      const view = sceneViewport();
      return r.right > view.left && r.left < view.right && r.bottom > view.top && r.top < view.bottom;
    });
    if (film === videoCard) return;
    clearBackgroundVideo();
    if (!film) return;
    const video = document.createElement('iframe');
    video.title = 'Design Disruptors trailer playing on the theater screen, muted';
    video.tabIndex = phone.matches ? 0 : -1;
    if (!phone.matches) video.setAttribute('aria-hidden', 'true');
    if (phone.matches) video.className = 'mobile-player';
    video.allow = 'autoplay; fullscreen; picture-in-picture';
    video.allowFullscreen = true;
    video.src = `https://player.vimeo.com/video/140875675?background=${phone.matches ? 0 : 1}&autoplay=1&loop=1&muted=1&playsinline=1&autopause=0&controls=${phone.matches ? 1 : 0}&dnt=1`;
    video.addEventListener('load', () => video.classList.add('is-ready'));
    (film.querySelector('.preview-window') || film.querySelector('.reel-image')).prepend(video);
    videoCard = film;
  }
  function tick(time) {
    const stopped = phone.matches || reduced.matches || document.hidden || !visible || menu.open || dialog.open || Boolean(track.querySelector('.is-phone-interacting'));
    if (!stopped && !dragging) {
      if (Math.abs(velocity) > .1) {
        scrollCarousel(scene.scrollLeft + velocity);
        velocity *= .94;
      } else if (!hovered && time > idleUntil) {
        scrollCarousel(scene.scrollLeft + 2);
      }
    }
    scrollCarousel();
    paint();
    if (time - lastVideoCheck > 250) { updateVideo(); lastVideoCheck = time; }
    requestAnimationFrame(tick);
  }
  scene.addEventListener('wheel', event => {
    if (!visible || phone.matches || event.target.closest('.campaign-phone, .card-switcher')) return;
    if (event.ctrlKey || event.metaKey) return;
    // Vertical scrolling continues to About; horizontal gestures browse the cards.
    if (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    velocity = 0;
    const delta = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    scrollCarousel(scene.scrollLeft + delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scene.clientWidth : 1));
    idleUntil = performance.now() + 1400;
    paint();
  }, { passive: false });
  scene.addEventListener('pointerdown', event => {
    if (event.target.closest('.campaign-phone, .card-switcher')) { dragDistance = 0; return; }
    if (event.button !== 0 || phone.matches) return;
    dragging = true; hovered = null; velocity = 0;
    originX = lastPointerX = event.clientX; originScroll = scene.scrollLeft; dragDistance = 0;

  });
  scene.addEventListener('pointermove', event => {
    if (!dragging) return;
    dragDistance = Math.max(dragDistance, Math.abs(event.clientX - originX));
    if (dragDistance > 5 && !scene.hasPointerCapture(event.pointerId)) scene.setPointerCapture(event.pointerId);
    scrollCarousel(originScroll + originX - event.clientX);
    velocity = Math.max(-32, Math.min(32, lastPointerX - event.clientX));
    lastPointerX = event.clientX;
    paint();
  });
  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    if (dragDistance <= 5) velocity = 0;
    if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
    idleUntil = performance.now() + 1400;
  }
  scene.addEventListener('pointerup', endDrag);
  scene.addEventListener('pointercancel', event => { endDrag(event); velocity = 0; });
  scene.addEventListener('click', event => {
    if (event.target.closest('.campaign-phone, .card-switcher')) return;
    if (dragDistance > 5) { event.preventDefault(); event.stopPropagation(); dragDistance = 0; }
  }, true);
  scene.addEventListener('scroll', () => { scrollCarousel(); paint(); }, {passive:true});
  scene.addEventListener('keydown', event => {
    if (phone.matches) return;
    if (event.target.closest('.linkedin-app, .card-switcher')) return;
    if ((!phone.matches && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) || (phone.matches && (event.key === 'ArrowDown' || event.key === 'ArrowUp'))) {
      event.preventDefault(); scrollCarousel(scene.scrollLeft + (event.key === 'ArrowRight' ? 1 : -1) * 300);
      idleUntil = performance.now() + 3000; velocity = 0; paint();
    }
  });
  scene.addEventListener('focusin', () => { idleUntil = performance.now() + 60000; });
  scene.addEventListener('focusout', () => { idleUntil = performance.now() + 1400; });
  cards.filter(c => c.matches('[data-film]')).forEach(link => link.addEventListener('click', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !dialog.showModal) return;
    event.preventDefault(); opener = link; clearBackgroundVideo();
    const video = document.createElement('iframe');
    video.title = 'Design Disruptors Trailer — a documentary from InVision';
    video.src = 'https://player.vimeo.com/video/140875675?autoplay=1&dnt=1';
    video.allow = 'autoplay; fullscreen; picture-in-picture'; video.allowFullscreen = true;
    videoFrame.replaceChildren(video); dialog.showModal();
  }));
  function closeOnBackdrop(target, event) {
    const r = target.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) target.close();
  }
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => closeOnBackdrop(dialog, e));
  dialog.addEventListener('close', () => { videoFrame.replaceChildren(); hovered = null; opener?.focus({ preventScroll: true }); idleUntil = performance.now() + 1400; });
  menuButton.addEventListener('click', () => {
    menu.showModal(); menuButton.setAttribute('aria-expanded', 'true'); clearBackgroundVideo();
  });
  menu.querySelector('.menu-close').addEventListener('click', () => menu.close());
  menu.addEventListener('click', e => closeOnBackdrop(menu, e));
  menu.addEventListener('close', () => { menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus(); hovered = null; });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.close()));
  const waveButton = document.querySelector('.wave-button');
  const waveLinkedin = document.querySelector('.wave-linkedin');
  let waveClicks = 0, waveRevealTimer = null;
  function revealLinkedin() {
    clearTimeout(waveRevealTimer);
    if (waveClicks < 2 || !waveLinkedin.hidden) return;
    waveLinkedin.hidden = false;
    waveButton.setAttribute('aria-expanded', 'true');
  }
  waveButton.addEventListener('click', () => {
    waveClicks++;
    clearTimeout(waveRevealTimer);
    waveButton.classList.remove('is-waving');
    void waveButton.offsetWidth;
    if (reduced.matches) { revealLinkedin(); return; }
    waveButton.classList.add('is-waving');
    if (waveClicks >= 2) waveRevealTimer = setTimeout(revealLinkedin, 850);
  });
  waveButton.addEventListener('animationend', event => {
    if (event.animationName === 'wave') revealLinkedin();
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) { clearBackgroundVideo(); updateCommercial(); } }, { threshold: .05 }).observe(hero);
  const resizeObserver = new ResizeObserver(() => measure(false));
  resizeObserver.observe(scene);
  reduced.addEventListener('change', () => { measure(true); updateVideo(); });
  phone.addEventListener('change', () => { measure(true); clearBackgroundVideo(); updateVideo(); });
  // Each media card responds immediately when document scrolling reveals it.
  if ('IntersectionObserver' in window) {
    const mediaObserver = new IntersectionObserver(updateVideo, {threshold:0});
    cards.filter(card => card.matches('.film, .autodesk')).forEach(card => mediaObserver.observe(card));
  }
  hero.addEventListener('pointerup', () => playCommercial(commercialCard), {passive:true});
  document.addEventListener('visibilitychange', updateVideo);
  requestAnimationFrame(() => { measure(true); requestAnimationFrame(tick); });
})();
