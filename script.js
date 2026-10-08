/* Highlight each line as it passes through the reading band. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 761px)');
  const lines = [...document.querySelectorAll('.line')];
  let observer;

  function configure() {
    observer?.disconnect();
    lines.forEach(line => line.classList.remove('is-active'));
    const enabled = desktop.matches && !reducedMotion.matches && 'IntersectionObserver' in window;
    document.documentElement.classList.toggle('motion-enabled', enabled);
    if (!enabled) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-active', entry.isIntersecting));
    }, { rootMargin: `-${Math.round(innerHeight * 0.12)}px 0px -${Math.round(innerHeight * 0.15)}px 0px`, threshold: 0.25 });
    lines.forEach(line => observer.observe(line));
  }

  reducedMotion.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(configure);
  }, { passive: true });
  configure();
})();

/* Keep the thumbnail in place while showing its original, uncropped artwork. */
(() => {
  const hoverScreen = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
  const pills = [...document.querySelectorAll('.pill[data-preview]')];
  const preview = document.createElement('div');
  preview.className = 'image-preview';
  preview.setAttribute('aria-hidden', 'true');
  const previewLink = document.createElement('a');
  previewLink.tabIndex = -1;
  previewLink.target = '_blank';
  previewLink.rel = 'noopener noreferrer';
  const image = document.createElement('img');
  image.alt = '';
  previewLink.append(image);
  preview.append(previewLink);
  document.body.append(preview);
  let activePill;
  let dismissedPill;
  let closeTimer;

  function hide() {
    clearTimeout(closeTimer);
    activePill?.classList.remove('is-previewing');
    activePill = undefined;
    preview.classList.remove('is-visible');
  }

  function show(pill) {
    if (!hoverScreen.matches || dismissedPill === pill) return;
    clearTimeout(closeTimer);
    activePill?.classList.remove('is-previewing');
    activePill = pill;
    const rect = pill.getBoundingClientRect();
    const margin = 16;
    const gap = 18;
    const ratio = Number(pill.dataset.previewRatio);
    const below = innerHeight - rect.bottom - gap - margin;
    const above = rect.top - gap - margin;
    const desiredWidth = Math.min(Number(pill.dataset.previewWidth), innerWidth - margin * 2);
    const desiredHeight = desiredWidth / ratio;
    const placeBelow = below >= desiredHeight || below >= above;
    const availableHeight = Math.min(440, placeBelow ? below : above);
    if (availableHeight < 80 || rect.bottom <= 0 || rect.top >= innerHeight) {
      hide();
      return;
    }
    const width = Math.min(desiredWidth, availableHeight * ratio);
    const height = width / ratio;
    const left = Math.max(margin, Math.min(rect.right - width, innerWidth - width - margin));
    const top = placeBelow ? rect.bottom + gap : rect.top - gap - height;
    Object.assign(preview.style, {
      width: `${width}px`, height: `${height}px`, left: `${left}px`, top: `${top}px`
    });
    image.src = pill.dataset.preview;
    if (pill.hasAttribute('href')) previewLink.href = pill.getAttribute('href');
    else previewLink.removeAttribute('href');
    pill.classList.add('is-previewing');
    preview.classList.add('is-visible');
  }

  function scheduleHide() {
    clearTimeout(closeTimer);
    if (activePill?.matches(':focus-visible')) return;
    closeTimer = setTimeout(hide, 160);
  }

  pills.forEach(pill => {
    pill.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') {
        dismissedPill = undefined;
        show(pill);
      }
    });
    pill.addEventListener('pointerleave', scheduleHide);
    pill.addEventListener('focusin', () => {
      dismissedPill = undefined;
      if (pill.matches(':focus-visible')) show(pill);
    });
    pill.addEventListener('focusout', () => {
      dismissedPill = undefined;
      scheduleHide();
    });
  });
  preview.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  preview.addEventListener('pointerleave', scheduleHide);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      dismissedPill = activePill;
      hide();
    }
  });
  window.addEventListener('scroll', () => {
    const focusedPill = document.activeElement.closest('.pill[data-preview]');
    if (focusedPill?.matches(':focus-visible')) show(focusedPill);
    else hide();
  }, { passive: true });
  window.addEventListener('resize', hide, { passive: true });
  function configurePreviews() {
    hide();
    pills.filter(pill => !pill.hasAttribute('href')).forEach(pill => {
      if (hoverScreen.matches) pill.tabIndex = 0;
      else pill.removeAttribute('tabindex');
    });
  }
  hoverScreen.addEventListener('change', configurePreviews);
  configurePreviews();
})();
