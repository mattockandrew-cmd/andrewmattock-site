(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = [];
  const notificationControllers = [];
  const connectionNotification = {unlocked:false,read:false};
  document.querySelectorAll('.linkedin-app').forEach(app => {
    const screen = app.parentElement;
    const viewport = app.querySelector('.li-feed-viewport');
    const feed = app.querySelector('.linkedin-feed-track');
    const linkedin = app.querySelector('.li-content');
    const switcher = app.querySelector('.phone-app-switcher');
    const gmail = app.querySelector('.gmail-app');
    const inbox = app.querySelector('.gmail-inbox');
    const message = app.querySelector('.gmail-message');
    const gmailLabel = app.querySelector('.switcher-label');
    const linkedinLabel = app.querySelector('.switcher-linkedin-label');
    const switcherTap = app.querySelector('.phone-switcher-tap');
    const switchGesture = app.querySelector('.phone-switch-gesture');
    const statusBar = app.querySelector('.li-status');
    const homeIndicator = app.querySelector('.li-home-indicator');
    const mailViewport = app.querySelector('.gmail-mail-viewport');
    const mailContent = app.querySelector('.gmail-mail-content');
    const inboxViewport = app.querySelector('.gmail-inbox-content');
    const inboxList = app.querySelector('.gmail-email-list');
    const emailBodies = [...app.querySelectorAll('.gmail-mail-content')];
    const emailRows = [...app.querySelectorAll('.gmail-email-row')];
    const backButton = app.querySelector('.gmail-back-button');
    let selectedEmailId = 'apollo', emailStages = new Map(), emailTimelines = new Map();
    function selectEmailBody(id) {
      selectedEmailId = id;
      app.dataset.emailId = id;
      emailBodies.forEach(body => {
        body.classList.toggle('is-selected-email', body.dataset.emailId === id);
        body.setAttribute('aria-hidden', String(body.dataset.emailId !== id));
      });
    }
    const tap = app.querySelector('.gmail-tap');
    const artwork = app.querySelector('.gmail-email-artwork');
    const emailImage = app.querySelector('.gmail-email-image');
    const completedTask = app.querySelector('.onboarding-task-complete');
    const taskIconFade = app.querySelector('.onboarding-task-icon-fade');
    const taskStrike = app.querySelector('.onboarding-task-strike');
    const taskCheck = app.querySelector('.onboarding-task-check path');
    const taskTap = app.querySelector('.onboarding-task-tap');
    let animations = [], scheduled = false;
    const inCard = app.closest('.reel-card');
    const campaignCaption = inCard?.querySelector('.campaign-work-link');
    const onboardingCaption = inCard?.querySelector('.apollo-onboarding-caption');
    if (inCard) inCard.dataset.phoneCaption = 'auto';
    const inScene = app.closest('.scene');
    const hardware = screen.closest('.campaign-phone, .phone') || screen;
    const interactionRoot = inCard?.querySelector('.case-campaign') || hardware;
    const controls = inCard?.querySelectorAll('.phone-controls button') || [];
    const taskButton = app.querySelector('.onboarding-task-button');
    const isClone = inCard?.dataset.clone === 'true';
    const notificationButton = app.querySelector('.li-notification-button');
    const notificationBadge = app.querySelector('.li-notification-badge');
    const connectionPrompt = app.querySelector('.li-notification-dialog');
    const connectionClose = app.querySelector('.li-notification-close');
    const connectionLink = app.querySelector('.li-notification-connect');
    let connectionOpen = false;
    function renderNotification() {
      if (!notificationButton) return;
      const unread = connectionNotification.unlocked && !connectionNotification.read;
      notificationBadge.hidden = !unread;
      notificationButton.setAttribute('aria-label',unread ? 'Notifications, 1 unread. Connect with Andrew on LinkedIn' : 'Notifications. Connect with Andrew on LinkedIn');
      notificationButton.setAttribute('aria-expanded',String(connectionOpen));
    }
    function notificationTabStops(feedVisible) {
      if (!notificationButton) return;
      notificationButton.tabIndex = feedVisible && !isClone ? 0 : -1;
      connectionClose.tabIndex = connectionLink.tabIndex = feedVisible && connectionOpen && !isClone ? 0 : -1;
    }
    function unlockNotification() {
      if (connectionNotification.unlocked) return;
      connectionNotification.unlocked = true;
      notificationControllers.forEach(controller=>controller.renderNotification());
    }
    function closeConnection(returnFocus = false) {
      if (!connectionOpen) return;
      connectionOpen = false;
      connectionPrompt.hidden = true;
      app.classList.remove('is-linkedin-prompt-open');
      renderNotification();
      notificationTabStops(app.dataset.phoneView === 'feed');
      if (returnFocus && !isClone) notificationButton.focus({preventScroll:true});
      resumeAfterTouch();
    }
    function openConnection() {
      if (!connectionPrompt) return;
      enterManual('feed');
      connectionOpen = true;
      connectionNotification.read = true;
      clearTimeout(touchResumeTimer);
      app.classList.add('is-linkedin-prompt-open');
      connectionPrompt.hidden = false;
      notificationControllers.forEach(controller=>controller.renderNotification());
      notificationTabStops(true);
      if (!isClone) connectionLink.focus({preventScroll:true});
    }
    if (notificationButton) {
      connectionPrompt.id = `portfolio-linkedin-notification-${notificationControllers.length+1}`;
      notificationButton.setAttribute('aria-controls',connectionPrompt.id);
      notificationControllers.push({renderNotification});
      renderNotification();
      notificationTabStops(true);
      [notificationButton,connectionClose,connectionLink].forEach(control=>control.addEventListener('pointerdown',event=>{
        suppressDragClick = false;
        keyboardFocus = false;
        if (event.pointerType === 'touch') { touchSession = touchActive = true; clearTimeout(touchResumeTimer); }
        event.stopPropagation();
      }));
      notificationButton.addEventListener('click',event=>{event.stopPropagation();openConnection();});
      connectionClose.addEventListener('click',event=>{event.stopPropagation();closeConnection(true);});
      connectionLink.addEventListener('click',()=>closeConnection(false));
      connectionPrompt.addEventListener('keydown',event=>{
        event.stopPropagation();
        if (event.key === 'Escape') {event.preventDefault();closeConnection(true);}
      });
    }
    let manual = false, pointerInside = false, keyboardFocus = false;
    let touchResumeTimer = null, touchSession = false, touchActive = false;
    let feedTimeline = [], mailTimeline = [], sequenceTimes = {};
    // Three copies let the reader cross either seam without reaching an edge.
    const loopTrack = document.createElement('div');
    loopTrack.className = 'li-manual-feed-track';
    const loopPosts = [...feed.children].filter(post => !post.dataset.repeat);
    const loopCycles = Array.from({length:3}, (_,index) => {
      const cycle = document.createElement('div');
      cycle.className = 'li-feed-cycle';
      if (index !== 1) cycle.setAttribute('aria-hidden','true');
      loopPosts.forEach(post => cycle.append(post.cloneNode(true)));
      loopTrack.append(cycle);
      return cycle;
    });
    viewport.append(loopTrack);
    let loopHeight = 0, manualFeedY = 0;
    function measureLoop() {
      const height = loopCycles[1].offsetHeight;
      if (height > 0) loopHeight = height;
    }
    function setFeedScroll(position) {
      if (!loopHeight) measureLoop();
      if (!loopHeight) return;
      manualFeedY = ((position % loopHeight)+loopHeight)%loopHeight;
      const target = loopHeight + manualFeedY;
      if (Math.abs(viewport.scrollTop-target) > .1) viewport.scrollTop = target;
    }
    viewport.addEventListener('scroll', () => {
      if (manual && app.dataset.phoneView === 'feed') setFeedScroll(viewport.scrollTop);
    }, {passive:true});

    function translationY(element) {
      const value = getComputedStyle(element).transform;
      const matrix = value.match(/^matrix(3d)?\((.+)\)$/);
      if (matrix) return Number(matrix[2].split(',')[matrix[1] ? 13 : 5]) || 0;
      return Number(value.match(/translateY\((-?[\d.]+)px\)/)?.[1]) || 0;
    }
    function setActiveControl(view) {
      controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.phoneView === (view === 'feed' ? 'feed' : 'email'))));
    }
    function updateControls(view) {
      if (inCard) inCard.dataset.phoneCaption = view === 'email' && selectedEmailId === 'apollo' ? 'onboarding' : 'campaign';
      notificationTabStops(view === 'feed');
      setActiveControl(view);
      viewport.tabIndex = view === 'feed' && !isClone ? 0 : -1;
      mailViewport.tabIndex = view === 'email' && !isClone ? 0 : -1;
      taskButton.tabIndex = isClone ? -1 : 0;
      taskButton.setAttribute('aria-label', artwork.dataset.taskComplete === 'true' ? 'Mark Link your mailbox incomplete' : 'Mark Link your mailbox complete');
      inboxViewport.tabIndex = view === 'inbox' && !isClone ? 0 : -1;
      backButton.tabIndex = view === 'email' && !isClone ? 0 : -1;
      emailRows.forEach(row => { row.tabIndex = view === 'inbox' && !isClone ? 0 : -1; });
      inbox.setAttribute('aria-hidden', String(view !== 'inbox'));
      message.setAttribute('aria-hidden', String(view !== 'email'));
      gmail.setAttribute('aria-hidden', String(view === 'feed'));
      linkedin.setAttribute('aria-hidden', String(view !== 'feed'));
    }
    function enterManual(view) {
      if (!animations.length) return;
      let feedY = manualFeedY, mailY = mailViewport.scrollTop, inboxY = inboxViewport.scrollTop;
      if (!manual) {
        view ||= Number(getComputedStyle(gmail).opacity) > .5 ? (Number(getComputedStyle(message).opacity) > .5 ? 'email' : 'inbox') : 'feed';
        const visibleBody = emailBodies.find(body => Number(getComputedStyle(body).opacity) > .5) || mailContent;
        selectEmailBody(visibleBody.dataset.emailId || 'apollo');
        inboxY = Math.max(0,-translationY(inboxList));
        feedY = Math.max(0, -translationY(feed));
        mailY = Math.max(0, -translationY(visibleBody));
        const repeat = [...feed.children].find(post => post.dataset.repeat);
        if (repeat && feedY >= repeat.offsetTop) feedY -= repeat.offsetTop;
        artwork.dataset.taskComplete = String(Number(getComputedStyle(completedTask).opacity) > .5);
        taskButton.setAttribute('aria-pressed', artwork.dataset.taskComplete);
      }
      view ||= app.dataset.phoneView || 'feed';
      if (view !== 'feed') closeConnection(false);
      manual = true;
      unlockNotification();
      animations.forEach(animation => animation.pause());
      app.dataset.phoneView = view;
      app.classList.add('is-interacting');
      if (inCard) {
        inCard.querySelector('.reel-image').style.transform = '';
        inCard.style.setProperty('--tilt-light', '0');
      }
      interactionRoot.classList.add('is-phone-interacting');
      if (view === 'feed') { measureLoop(); setFeedScroll(loopHeight + feedY); }
      else { manualFeedY = feedY; viewport.scrollTop = 0; }
      selectEmailBody(selectedEmailId);
      mailViewport.scrollTop = mailY;
      inboxViewport.scrollTop = inboxY;
      updateControls(view);
      document.dispatchEvent(new Event('portfolio:phoneinteraction'));
      resumeAfterTouch();
    }
    // Invert the shared ease so autoplay resumes at the reader's scroll position.
    function timeAtPosition(points, position, minimum = 0) {
      const segments = points.slice(1).map((end, i) => ({start: points[i], end})).filter(({start,end}) => end.y > start.y && end.time >= minimum);
      const segment = segments.find(({start,end}) => position >= start.y && position <= end.y);
      if (!segment) return segments.length ? segments.reduce((best,item) => Math.abs(item.start.y-position) < Math.abs(best.start.y-position) ? item : best).start.time : minimum;
      const amount = (position-segment.start.y)/(segment.end.y-segment.start.y);
      const t = 1-Math.cbrt(1-amount);
      const easedTime = 3*.22*(1-t)*(1-t)*t+3*.36*(1-t)*t*t+t*t*t;
      return Math.max(minimum, segment.start.time+(segment.end.time-segment.start.time)*easedTime);
    }
    function resumeAfterTouch() {
      clearTimeout(touchResumeTimer);
      if (!manual || !touchSession || touchActive || motion.matches || connectionOpen) return;
      touchResumeTimer = setTimeout(() => {
        if (manual && !touchActive && !keyboardFocus) exitManual();
      }, 5000);
    }
    function exitManual() {
      if (!manual || phoneDrag || connectionOpen) return;
      clearTimeout(touchResumeTimer);
      touchSession = touchActive = false;
      app.classList.remove('has-thumb-pointer');
      const view = app.dataset.phoneView;
      const stage = emailStages.get(selectedEmailId) || emailStages.get('apollo');
      const time = view === 'email'
        ? timeAtPosition(emailTimelines.get(selectedEmailId) || mailTimeline, mailViewport.scrollTop, selectedEmailId === 'apollo' && artwork.dataset.taskComplete === 'true' ? sequenceTimes.completeAt + .7 : stage.openAt + .4)
        : view === 'inbox' ? stage.inboxAt+.4 : timeAtPosition(feedTimeline, manualFeedY);
      manual = false;
      if (inCard) inCard.dataset.phoneCaption = 'auto';
      viewport.scrollTop = mailViewport.scrollTop = inboxViewport.scrollTop = 0;
      animations.forEach(animation => { animation.currentTime = time * 1000; });
      app.classList.remove('is-interacting');
      interactionRoot.classList.remove('is-phone-interacting');
      viewport.tabIndex = isClone ? -1 : 0;
      mailViewport.tabIndex = inboxViewport.tabIndex = backButton.tabIndex = -1;
      emailRows.forEach(row => { row.tabIndex = -1; });
      gmail.setAttribute('aria-hidden', 'true');
      linkedin.removeAttribute('aria-hidden');
      sync();
      document.dispatchEvent(new Event('portfolio:phoneinteraction'));
    }
    interactionRoot.addEventListener('pointerenter', () => { pointerInside = true; });
    interactionRoot.addEventListener('pointerleave', event => {
      pointerInside = false;
      if (event.pointerType !== 'touch' && !(keyboardFocus && interactionRoot.contains(document.activeElement))) exitManual();
    });
    const thumb = app.querySelector('.phone-thumb-spotlight');
    let phoneDrag = null, suppressDragClick = false;
    function placeThumb(event) {
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      const bounds = app.getBoundingClientRect();
      const scaleX = bounds.width / 390;
      const scaleY = bounds.height / app.offsetHeight;
      thumb.style.left = `${(event.clientX-bounds.left)/scaleX}px`;
      thumb.style.top = `${(event.clientY-bounds.top)/scaleY}px`;
      thumb.style.setProperty('--thumb-size', `${38/scaleX}px`);
      thumb.style.setProperty('--thumb-line', `${1/scaleX}px`);
      app.classList.add('has-thumb-pointer');
    }
    function startPhoneDrag(event) {
      if (event.pointerType === 'touch') { touchSession = touchActive = true; clearTimeout(touchResumeTimer); }
      suppressDragClick = false;
      keyboardFocus = false;
      enterManual();
      placeThumb(event);
      if (connectionOpen || event.target?.closest('.li-notification-button, .li-notification-dialog')) {event.stopPropagation();return;}
      if (event.button !== 0 || event.pointerType === 'touch') return;
      const region = app.dataset.phoneView === 'email' ? mailViewport : app.dataset.phoneView === 'inbox' ? inboxViewport : viewport;
      phoneDrag = {
        id:event.pointerId, region, x:event.clientX, y:event.clientY,
        scroll:region.scrollTop, moved:false,
        scale:region.getBoundingClientRect().height/region.clientHeight || screen.clientWidth/390
      };
      app.classList.add('is-phone-pressed');
      event.stopPropagation();
    }
    function movePhoneDrag(event) {
      if (manual) placeThumb(event);
      if (!phoneDrag || event.pointerId !== phoneDrag.id) return;
      if (Math.hypot(event.clientX-phoneDrag.x,event.clientY-phoneDrag.y) < 4 && !phoneDrag.moved) return;
      phoneDrag.moved = true;
      suppressDragClick = true;
      app.classList.add('is-phone-dragging');
      if (!hardware.hasPointerCapture(event.pointerId)) hardware.setPointerCapture(event.pointerId);
      const max = Math.max(0,phoneDrag.region.scrollHeight-phoneDrag.region.clientHeight);
      const position = phoneDrag.scroll+(phoneDrag.y-event.clientY)/phoneDrag.scale;
      if (phoneDrag.region === viewport) setFeedScroll(position);
      else phoneDrag.region.scrollTop = Math.max(0,Math.min(max,position));
      event.preventDefault();
      event.stopPropagation();
    }
    function endPhoneDrag(event) {
      if (phoneDrag && event.pointerId !== phoneDrag.id) return;
      phoneDrag = null;
      app.classList.remove('is-phone-pressed');
      app.classList.remove('is-phone-dragging');
      if (hardware.hasPointerCapture(event.pointerId)) hardware.releasePointerCapture(event.pointerId);
      if (event.pointerType === 'touch' || event.type === 'pointercancel') app.classList.remove('has-thumb-pointer');
      if (event.type === 'pointercancel') suppressDragClick = false;
      if (!pointerInside && event.pointerType !== 'touch') exitManual();
      if (event.pointerType === 'touch') { touchActive = false; resumeAfterTouch(); }
    }
    hardware.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') { enterManual(); placeThumb(event); }
    });
    hardware.addEventListener('pointerleave', () => {
      if (!phoneDrag) app.classList.remove('has-thumb-pointer');
    });
    hardware.addEventListener('pointerdown', startPhoneDrag);
    hardware.addEventListener('pointermove', movePhoneDrag);
    hardware.addEventListener('pointerup', endPhoneDrag);
    hardware.addEventListener('pointercancel', endPhoneDrag);
    hardware.addEventListener('lostpointercapture', event => {
      if (phoneDrag) endPhoneDrag(event);
    });
    hardware.addEventListener('click', event => {
      if (!suppressDragClick) return;
      suppressDragClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    interactionRoot.addEventListener('focusin', event => {
      keyboardFocus = !pointerInside;
      if (event.target.closest('.li-notification-button, .li-notification-dialog')) enterManual('feed');
      else if (event.target.closest('.li-feed-viewport')) enterManual('feed');
      else if (event.target.closest('.gmail-mail-viewport')) enterManual('email');
      else if (event.target.closest('.gmail-inbox-content')) enterManual('inbox');
    });
    interactionRoot.addEventListener('focusout', event => {
      if (!interactionRoot.contains(event.relatedTarget)) {
        closeConnection(false);
        keyboardFocus = false;
        if (!pointerInside) exitManual();
      }
    });
    interactionRoot.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') { touchSession = touchActive = true; clearTimeout(touchResumeTimer); }
    }, {passive:true});
    ['pointerup','pointercancel'].forEach(type => interactionRoot.addEventListener(type, event => {
      if (event.pointerType === 'touch') { touchActive = false; resumeAfterTouch(); }
    }, {passive:true}));
    document.addEventListener('pointerdown', event => {
      if (manual && !interactionRoot.contains(event.target)) {closeConnection(false);exitManual();}
    });
    controls.forEach(button => {
      button.addEventListener('pointerdown', event => {
        keyboardFocus = false;
        if (event.pointerType === 'touch') { touchSession = touchActive = true; clearTimeout(touchResumeTimer); }
        event.stopPropagation();
      });
      button.addEventListener('click', () => {closeConnection(false);enterManual(button.dataset.phoneView === 'email' ? 'inbox' : 'feed');});
    });
    emailRows.forEach(row => row.addEventListener('click', () => {
      enterManual('inbox');
      selectEmailBody(row.dataset.emailId);
      enterManual('email');
      mailViewport.scrollTop = 0;
    }));
    backButton.addEventListener('click', () => enterManual('inbox'));
    [{region:viewport,view:'feed'},{region:mailViewport,view:'email'},{region:inboxViewport,view:'inbox'}].forEach(({region,view}) => {
      region.addEventListener('scroll', resumeAfterTouch, {passive:true});
      region.addEventListener('wheel', event => {
        if (event.ctrlKey || event.metaKey) return;
        enterManual(view);
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY || event.deltaX;
        const renderedScale = region.getBoundingClientRect().height / region.clientHeight || screen.clientWidth / 390;
        const next = region.scrollTop + delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? region.clientHeight : 1) / (event.deltaMode === 2 ? 1 : renderedScale);
        if (region === viewport) setFeedScroll(next);
        else region.scrollTop = next;
      }, {passive:false});
      region.addEventListener('keydown', event => {
        keyboardFocus = true;
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault(); keyboardFocus = false; exitManual(); region.blur();
        }
      });
    });
    taskButton.addEventListener('click', () => {
      artwork.dataset.taskComplete = String(artwork.dataset.taskComplete !== 'true');
      taskButton.setAttribute('aria-pressed', artwork.dataset.taskComplete);
      taskButton.setAttribute('aria-label', artwork.dataset.taskComplete === 'true' ? 'Mark Link your mailbox incomplete' : 'Mark Link your mailbox complete');
    });
    function isUnavailable() {
      if (document.hidden) return true;
      if (inScene && !inScene.classList.contains('is-active')) return true;
      if (inCard) {
        const r = inCard.getBoundingClientRect();
        const v = window.innerWidth <= 760 ? {left:0,top:0,right:window.innerWidth,bottom:window.innerHeight} : inCard.closest('.reel-window').getBoundingClientRect();
        return r.right <= r.left || r.bottom <= r.top || r.right <= v.left || r.left >= v.right || r.bottom <= v.top || r.top >= v.bottom;
      }
      return false;
    }
    function shouldPause() {
      return motion.matches || Boolean(app.closest('.media-paused, .is-paused')) || isUnavailable();
    }
    function sync() {
      if (!animations.length) return;
      if (manual && connectionOpen && isUnavailable()) {closeConnection(false);exitManual();}
      if (manual && touchSession && !motion.matches && shouldPause()) exitManual();
      if (manual) { animations.forEach(animation => animation.pause()); return; }
      const paused = shouldPause();
      notificationTabStops(!isUnavailable() && Number(getComputedStyle(linkedin).opacity) > .5 && Number(getComputedStyle(gmail).opacity) < .5);
      const current = motion.matches ? 0 : Number(animations[0].currentTime || 0);
      const seconds = Number(current) % Number(animations[0].effect.getTiming().duration) / 1000;
      setActiveControl(seconds >= sequenceTimes.switchAt + 2.35 && seconds < sequenceTimes.returnAt + .35 ? 'email' : 'feed');
      const stage = [...emailStages.values()].find(stage => seconds >= stage.inboxAt && seconds <= stage.closeAt + .3);
      if (stage) selectedEmailId = stage.id;
      animations.forEach(animation => {
        if (animation.currentTime == null || Math.abs(Number(animation.currentTime)-current) > 16) animation.currentTime = current;
        if (paused) animation.pause();
        else if (animation.playState !== 'running') animation.play();
      });
    }
    function layout() {
      scheduled = false;
      if (!screen.clientWidth || !screen.clientHeight) return;
      const scale = screen.clientWidth / 390;
      app.style.setProperty('--li-scale', String(scale));
      app.style.setProperty('--li-height', `${screen.clientHeight / scale}px`);
      const posts = [...feed.children];
      const gap = parseFloat(getComputedStyle(feed).rowGap) || 0;
      const timeline = [];
      let time = 0, y = 0, offset = 0, firstAdEnd = 0, firstAdY = 0;
      function key(nextY, seconds) {
        time += seconds;
        y = nextY;
        timeline.push({time, y});
      }
      key(0, 0);
      posts.forEach((post, i) => {
        if (post.dataset.repeat) { key(offset, .75); key(offset, .7); return; }
        if (i) key(offset, .75);
        key(offset, post.dataset.kind === 'ad' ? 2.8 : 1.8);
        const postHeight = post.offsetHeight || loopCycles[1].children[i]?.offsetHeight || 0;
        const pan = Math.max(0, postHeight - viewport.clientHeight);
        if (pan > 4) {
          key(offset + pan, post.dataset.kind === 'ad' ? 1.25 : .8);
          key(offset + pan, .6);
        }
        if (i === 0) { firstAdEnd = time; firstAdY = y; }
        offset += postHeight + gap;
      });
      const switchAt = firstAdEnd;
      const openAt = switchAt + 5.1;
      const originalCloseAt = openAt + 16;
      const manualMailY = mailViewport.scrollTop, manualInboxY = inboxViewport.scrollTop;
      app.classList.add('is-measuring-emails');
      emailStages = new Map(); emailTimelines = new Map();
      emailStages.set('apollo',{id:'apollo',inboxAt:openAt-1.75,openAt,closeAt:originalCloseAt});
      let nextInboxAt = originalCloseAt;
      emailBodies.filter(body => body.dataset.emailId !== 'apollo').forEach(body => {
        const pan = Math.max(0,body.offsetHeight-mailViewport.clientHeight);
        const bodyOpenAt = nextInboxAt+1.3;
        const closeAt = bodyOpenAt+8+Math.min(14,pan/140);
        emailStages.set(body.dataset.emailId,{id:body.dataset.emailId,inboxAt:nextInboxAt,openAt:bodyOpenAt,closeAt,pan});
        nextInboxAt=closeAt;
      });
      const returnAt = nextInboxAt+.4;
      const resumeFeedAt = returnAt + 1.5;
      const interlude = resumeFeedAt - switchAt;
      const total = time + interlude;
      const duration = total * 1000;
      const prior = animations[0];
      const progress = prior ? (Number(prior.currentTime) % Number(prior.effect.getTiming().duration)) / Number(prior.effect.getTiming().duration) : 0;
      animations.forEach(animation => animation.cancel());
      animations = [];
      function animate(element, frames, easing = 'cubic-bezier(.22,1,.36,1)') {
        const animation = element.animate(frames.map(([at, properties]) => ({
          ...properties, offset: at / total, easing
        })), {duration, iterations: Infinity});
        if (emailBodies.includes(element) && frames[0][1].transform) {
          const timeline = frames.map(([time,props]) => ({time,y:-Number(props.transform.match(/translateY\((-?[\d.]+)px\)/)?.[1]||0)}));
          emailTimelines.set(element.dataset.emailId,timeline);
          if (element === mailContent) mailTimeline=timeline;
        }
        animation.currentTime = progress * duration;
        animations.push(animation);
      }
      // Open Gmail after the first ad, then continue through the rest of the feed.
      timeline.forEach(point => { if (point.time > switchAt) point.time += interlude; });
      const insertion = timeline.findIndex(point => point.time > switchAt);
      timeline.splice(insertion, 0, {time: resumeFeedAt, y: firstAdY});
      feedTimeline = timeline;
      animate(feed, timeline.map(point => [point.time, {transform: `translateY(${-point.y}px)`}]));
      const full = {transform:'translate(0px,0px) scale(1)',opacity:1,borderRadius:'0px',boxShadow:'0 0 0 rgba(0,0,0,0)'};
      const recent = x => ({transform:`translate(${x}px,76px) scale(.69)`,opacity:1,borderRadius:'39px',boxShadow:'0 20px 50px rgba(0,0,0,.28)'});
      // The inbox card is the actual Gmail app, throughout the swipe and expansion.
      animate(linkedin,[[0,full],[switchAt,full],[switchAt+.65,recent(61)],[switchAt+.95,recent(61)],[switchAt+1.65,recent(-234)],[switchAt+2.9,{...recent(-234),opacity:0}],[returnAt,{...full,transform:'translate(-430px,0px) scale(1)',opacity:1}],[returnAt+.7,full],[total,full]]);
      animate(gmail,[[0,{...recent(356),opacity:0}],[switchAt+.65,{...recent(356),opacity:0}],[switchAt+.95,recent(356)],[switchAt+1.65,recent(61)],[switchAt+2.35,recent(61)],[switchAt+2.95,full],[returnAt,full],[returnAt+.7,{...full,transform:'translate(430px,0px) scale(1)',opacity:1}],[returnAt+.85,{...recent(356),opacity:0}],[total,{...recent(356),opacity:0}]]);
      animate(switcher,[[0,{opacity:0}],[switchAt,{opacity:0}],[switchAt+.2,{opacity:1}],[switchAt+2.95,{opacity:1}],[switchAt+3.05,{opacity:0}],[returnAt-.1,{opacity:0}],[returnAt,{opacity:1}],[returnAt+.7,{opacity:1}],[returnAt+.85,{opacity:0}],[total,{opacity:0}]]);
      animate(gmailLabel,[[0,{opacity:0,transform:'translateX(0px)'}],[switchAt+.65,{opacity:0,transform:'translateX(0px)'}],[switchAt+.95,{opacity:1,transform:'translateX(0px)'}],[switchAt+1.65,{opacity:1,transform:'translateX(-295px)'}],[switchAt+2.35,{opacity:1,transform:'translateX(-295px)'}],[switchAt+2.8,{opacity:0,transform:'translateX(-295px)'}],[total,{opacity:0,transform:'translateX(0px)'}]]);
      animate(linkedinLabel,[[0,{opacity:0,transform:'translateX(0px)'}],[switchAt,{opacity:0,transform:'translateX(0px)'}],[switchAt+.65,{opacity:1,transform:'translateX(0px)'}],[switchAt+.95,{opacity:1,transform:'translateX(0px)'}],[switchAt+1.65,{opacity:1,transform:'translateX(-295px)'}],[switchAt+2.5,{opacity:0,transform:'translateX(-295px)'}],[total,{opacity:0,transform:'translateX(0px)'}]]);
      animate(switcherTap,[[0,{opacity:0,transform:'scale(.75)'}],[switchAt+1.95,{opacity:0,transform:'scale(.75)'}],[switchAt+2.18,{opacity:.8,transform:'scale(1)'}],[switchAt+2.45,{opacity:0,transform:'scale(1.4)'}],[total,{opacity:0,transform:'scale(.75)'}]]);
      animate(switchGesture,[[0,{opacity:0,transform:'translateY(0px)'}],[switchAt-.2,{opacity:0,transform:'translateY(0px)'}],[switchAt,{opacity:.6,transform:'translateY(0px)'}],[switchAt+.5,{opacity:.6,transform:'translateY(-145px)'}],[switchAt+.7,{opacity:0,transform:'translateY(-145px)'}],[total,{opacity:0,transform:'translateY(0px)'}]]);
      animate(statusBar,[[0,{color:'#111111',backgroundColor:'rgba(255,255,255,1)'}],[switchAt,{color:'#111111',backgroundColor:'rgba(255,255,255,1)'}],[switchAt+.45,{color:'#ffffff',backgroundColor:'rgba(255,255,255,0)'}],[switchAt+2.35,{color:'#ffffff',backgroundColor:'rgba(255,255,255,0)'}],[switchAt+2.95,{color:'#111111',backgroundColor:'rgba(255,255,255,1)'}],[total,{color:'#111111',backgroundColor:'rgba(255,255,255,1)'}]]);
      animate(homeIndicator,[[0,{backgroundColor:'#111111'}],[switchAt,{backgroundColor:'#111111'}],[switchAt+.45,{backgroundColor:'#ffffff'}],[switchAt+2.35,{backgroundColor:'#ffffff'}],[switchAt+2.95,{backgroundColor:'#111111'}],[total,{backgroundColor:'#111111'}]]);
      const inboxFrames=[[0,{opacity:1}]], messageFrames=[[0,{opacity:0,transform:'translateY(14px)'}]];
      const listFrames=[[0,{transform:'translateY(0px)'}]];
      [...emailStages.values()].forEach(stage => {
        inboxFrames.push([stage.openAt,{opacity:1}],[stage.openAt+.35,{opacity:0}],[stage.closeAt,{opacity:0}],[stage.closeAt+.3,{opacity:1}]);
        messageFrames.push([stage.openAt,{opacity:0,transform:'translateY(14px)'}],[stage.openAt+.4,{opacity:1,transform:'translateY(0px)'}],[stage.closeAt,{opacity:1,transform:'translateY(0px)'}],[stage.closeAt+.3,{opacity:0,transform:'translateY(14px)'}]);
        const row=emailRows.find(row=>row.dataset.emailId===stage.id);
        const maxInbox=Math.max(0,inboxList.offsetTop+inboxList.offsetHeight+20-inboxViewport.clientHeight);
        const pan=Math.max(0,Math.min(maxInbox,row.offsetTop-70));
        listFrames.push([stage.inboxAt,{transform:listFrames.at(-1)[1].transform}],[stage.inboxAt+.65,{transform:`translateY(${-pan}px)`}],[stage.closeAt,{transform:`translateY(${-pan}px)`}]);
        const body=emailBodies.find(body=>body.dataset.emailId===stage.id);
        animate(body,[[0,{opacity:0}],[stage.openAt,{opacity:0}],[stage.openAt+.35,{opacity:1}],[stage.closeAt,{opacity:1}],[stage.closeAt+.3,{opacity:0}],[total,{opacity:0}]]);
        if (stage.id!=='apollo') {
          const scrollFrames=[[0,{transform:'translateY(0px)'}],[stage.openAt+2,{transform:'translateY(0px)'}],[stage.closeAt-2,{transform:`translateY(${-stage.pan}px)`}],[stage.closeAt+.3,{transform:`translateY(${-stage.pan}px)`}],[stage.closeAt+.4,{transform:'translateY(0px)'}],[total,{transform:'translateY(0px)'}]];
          animate(body,scrollFrames);
          animate(row.querySelector('.gmail-campaign-tap'),[[0,{opacity:0,transform:'scale(.7)'}],[stage.openAt-.65,{opacity:0,transform:'scale(.7)'}],[stage.openAt-.4,{opacity:1,transform:'scale(1)'}],[stage.openAt,{opacity:0,transform:'scale(1.35)'}],[total,{opacity:0,transform:'scale(1.35)'}]]);
        }
      });
      inboxFrames.push([total,{opacity:1}]);messageFrames.push([total,{opacity:0,transform:'translateY(14px)'}]);listFrames.push([returnAt+.6,{transform:listFrames.at(-1)[1].transform}],[returnAt+.7,{transform:'translateY(0px)'}],[total,{transform:'translateY(0px)'}]);
      animate(inbox,inboxFrames);animate(message,messageFrames);animate(inboxList,listFrames);
      animate(tap, [[0,{opacity:0,transform:'scale(.7)'}],[openAt-.65,{opacity:0,transform:'scale(.7)'}],[openAt-.4,{opacity:1,transform:'scale(1)'}],[openAt,{opacity:0,transform:'scale(1.35)'}],[total,{opacity:0,transform:'scale(1.35)'}]]);
      const emailPan = Math.max(0, mailContent.offsetHeight - mailViewport.clientHeight);
      artwork.style.setProperty('--email-scale', String(artwork.clientWidth / 851));
      const mobileTask = taskButton.closest?.('.mobile-checklist-task');
      const taskCenter = mobileTask ? mobileTask.offsetTop + mobileTask.offsetHeight / 2 : emailImage.offsetHeight * .4875;
      const focusPan = Math.max(0, Math.min(emailPan, artwork.offsetTop + taskCenter - mailViewport.clientHeight * .52));
      const completeAt = openAt + 5.7;
      const resetAt = originalCloseAt + .4;
      sequenceTimes = {switchAt, openAt, completeAt, returnAt};
      animate(mailContent, [[0,{transform:'translateY(0px)'}],[openAt+3.2,{transform:'translateY(0px)'}],[openAt+4.5,{transform:`translateY(${-focusPan}px)`}],[openAt+7.2,{transform:`translateY(${-focusPan}px)`}],[openAt+13.4,{transform:`translateY(${-emailPan}px)`}],[originalCloseAt+.3,{transform:`translateY(${-emailPan}px)`}],[originalCloseAt+.4,{transform:'translateY(0px)'}],[total,{transform:'translateY(0px)'}]]);
      animate(taskTap, [[0,{opacity:0,transform:'scale(.7)'}],[completeAt-.65,{opacity:0,transform:'scale(.7)'}],[completeAt-.4,{opacity:1,transform:'scale(1)'}],[completeAt,{opacity:0,transform:'scale(1.35)'}],[total,{opacity:0,transform:'scale(1.35)'}]]);
      animate(completedTask, [[0,{opacity:0}],[completeAt,{opacity:0}],[completeAt+.2,{opacity:1}],[originalCloseAt+.3,{opacity:1}],[resetAt,{opacity:0}],[total,{opacity:0}]]);
      animate(taskIconFade, [[0,{opacity:0}],[completeAt,{opacity:0}],[completeAt+.2,{opacity:.65}],[originalCloseAt+.3,{opacity:.65}],[resetAt,{opacity:0}],[total,{opacity:0}]]);
      animate(taskStrike, [[0,{transform:'scaleX(0)'}],[completeAt+.15,{transform:'scaleX(0)'}],[completeAt+.55,{transform:'scaleX(1)'}],[originalCloseAt+.3,{transform:'scaleX(1)'}],[resetAt,{transform:'scaleX(0)'}],[total,{transform:'scaleX(0)'}]]);
      animate(taskCheck, [[0,{strokeDashoffset:'1'}],[completeAt+.3,{strokeDashoffset:'1'}],[completeAt+.65,{strokeDashoffset:'0'}],[originalCloseAt+.3,{strokeDashoffset:'0'}],[resetAt,{strokeDashoffset:'1'}],[total,{strokeDashoffset:'1'}]]);
      if (campaignCaption && onboardingCaption) {
        const shown = {opacity:1,visibility:'visible'}, hidden = {opacity:0,visibility:'hidden'};
        // The result belongs to the Apollo email, including when the reel is stationary.
        animate(onboardingCaption,[[0,hidden],[openAt+.4,shown],[originalCloseAt+.3,hidden],[total,hidden]],'steps(1,end)');
        animate(campaignCaption,[[0,shown],[openAt+.4,hidden],[originalCloseAt+.3,shown],[total,shown]],'steps(1,end)');
      }
      if (inScene) inScene.dataset.duration = String(Math.ceil(duration));
      app.dataset.feedDuration = String(Math.ceil(duration));
      app.dataset.gmailOpensAt = String(Math.round(openAt * 1000));
      if (manual && app.dataset.phoneView === 'feed') { measureLoop(); setFeedScroll(loopHeight + manualFeedY); }
      app.classList.remove('is-measuring-emails');
      if (manual) { mailViewport.scrollTop=manualMailY; inboxViewport.scrollTop=manualInboxY; }
      sync();
    }
    function scheduleLayout() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(layout);
    }
    new ResizeObserver(scheduleLayout).observe(screen);
    app.querySelectorAll('img').forEach(image => image.addEventListener('load', scheduleLayout, {once: true}));
    if (inCard && 'IntersectionObserver' in window) new IntersectionObserver(sync, {threshold:0}).observe(inCard);
    controllers.push({sync, layout});
    scheduleLayout();
  });
  function syncAll() { controllers.forEach(controller => controller.sync()); }
  document.addEventListener('portfolio:motionchange', syncAll);
  document.addEventListener('visibilitychange', syncAll);
  document.addEventListener('scroll', syncAll, {passive:true});
  motion.addEventListener('change', syncAll);
  const root = document.querySelector('.showreel');
  if (root) new MutationObserver(syncAll).observe(root, {attributes: true, attributeFilter: ['class'], subtree: true});
})();
