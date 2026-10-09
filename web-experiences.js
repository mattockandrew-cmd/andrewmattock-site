(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = [];
  document.querySelectorAll('.web-browser').forEach(browser => {
    const display = browser.parentElement;
    const card = browser.closest('.reel-card');
    const gallery = card.closest('.reel-window');
    const controls = card.querySelectorAll('[data-web-flow]');
    const find = selector => browser.querySelector(selector);
    const duration = 44200, cycleSeconds = duration / 1000;
    let animations = [], selectedTime = new URLSearchParams(location.search).get('flow') === 'seo' ? 16200 : 0, scheduled = false;
    function shouldPause() {
      if (motion.matches || document.hidden || browser.closest('.media-paused')) return true;
      const r = card.getBoundingClientRect(), v = window.innerWidth <= 760 ? {left:0,top:0,right:window.innerWidth,bottom:window.innerHeight} : gallery.getBoundingClientRect();
      return r.right < v.left || r.left > v.right || r.bottom < v.top || r.top > v.bottom;
    }
    function sync() {
      if (!animations.length) return;
      const current = motion.matches ? selectedTime : Number(animations[0].currentTime || 0);
      const paused = shouldPause(), now = document.timeline?.currentTime;
      animations.forEach(animation => {
        animation.currentTime = current;
        if (paused) animation.pause();
        else { animation.play(); if (now != null) animation.startTime = now-current; }
      });
      const phase = current % duration >= 15400 && current % duration < 42500 ? 'seo' : 'demo';
      controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.webFlow === phase)));
      browser.dataset.flow = phase;
      card.dataset.activeWebFlow = phase;
    }
    function layout() {
      scheduled = false;
      if (!display.clientWidth) return;
      browser.style.setProperty('--web-scale', String(display.clientWidth/1440));
      const progress = animations[0] ? Number(animations[0].currentTime) % duration : selectedTime;
      animations.forEach(animation => animation.cancel()); animations = [];
      function animate(selector, frames, ease = 'cubic-bezier(.22,1,.36,1)') {
        const animation = find(selector).animate(frames.map(([at,properties]) => ({...properties,offset:at/cycleSeconds,easing:ease})),{duration,iterations:Infinity});
        animation.currentTime = progress; animations.push(animation);
      }
      function opacity(selector,frames) { animate(selector, frames.map(([time,opacity]) => [time,{opacity}])); }
      opacity('.web-demo-page',[[0,1],[13.8,1],[14.2,0],[42.2,0],[42.7,1],[44.2,1]]);
      opacity('.web-calendar-page',[[0,0],[13.8,0],[14.2,1],[15.4,1],[15.62,0],[44.2,0]]);
      opacity('.web-seo-page',[[0,0],[23.6,0],[23.9,1],[42.2,1],[42.7,0],[44.2,0]]);
      opacity('.web-google-home',[[0,0],[15.4,0],[15.62,1],[19,1],[19.3,0],[44.2,0]]);
      opacity('.web-google-results',[[0,0],[19,0],[19.3,1],[23.6,1],[23.9,0],[44.2,0]]);
      opacity('.web-address-google',[[0,0],[15.4,0],[15.62,1],[23.6,1],[23.9,0],[44.2,0]]);
      animate('.web-search-query',[[0,{opacity:0,clipPath:'inset(0 100% 0 0)'}],[16.6,{opacity:1,clipPath:'inset(0 100% 0 0)'}],[18.3,{opacity:1,clipPath:'inset(0 0% 0 0)'}],[19.4,{opacity:1,clipPath:'inset(0 0% 0 0)'}],[20.2,{opacity:0,clipPath:'inset(0 100% 0 0)'}],[44.2,{opacity:0,clipPath:'inset(0 100% 0 0)'}]],'steps(26,end)');
      animate('.web-google-apollo-result',[[0,{backgroundColor:'rgba(232,240,254,0)'}],[22.7,{backgroundColor:'rgba(232,240,254,0)'}],[23.05,{backgroundColor:'rgba(232,240,254,.45)'}],[23.6,{backgroundColor:'rgba(232,240,254,.45)'}],[24.2,{backgroundColor:'rgba(232,240,254,0)'}],[44.2,{backgroundColor:'rgba(232,240,254,0)'}]]);
      opacity('.web-address-demo',[[0,1],[15.4,1],[15.62,0],[42.2,0],[42.7,1],[44.2,1]]);
      opacity('.web-address-seo',[[0,0],[23.6,0],[23.9,1],[42.2,1],[42.7,0],[44.2,0]]);
      opacity('.web-email-placeholder',[[0,1],[1.1,1],[1.25,0],[42.2,0],[42.5,1],[44.2,1]]);
      animate('.web-email-value',[[0,{opacity:0,clipPath:'inset(0 100% 0 0)'}],[1.15,{opacity:1,clipPath:'inset(0 100% 0 0)'}],[2.8,{opacity:1,clipPath:'inset(0 0% 0 0)'}],[13.8,{opacity:1,clipPath:'inset(0 0% 0 0)'}],[14.1,{opacity:0,clipPath:'inset(0 0% 0 0)'}],[42.2,{opacity:0,clipPath:'inset(0 100% 0 0)'}],[44.2,{opacity:0,clipPath:'inset(0 100% 0 0)'}]],'steps(18,end)');
      opacity('.web-enrichment-veil',[[0,0],[4,0],[4.3,1],[13.8,1],[14.2,0],[44.2,0]]);
      animate('.web-enrichment',[[0,{opacity:0,transform:'translateY(12px)'}],[4,{opacity:0,transform:'translateY(12px)'}],[4.35,{opacity:1,transform:'translateY(0px)'}],[13.8,{opacity:1,transform:'translateY(0px)'}],[14.2,{opacity:0,transform:'translateY(0px)'}],[44.2,{opacity:0,transform:'translateY(12px)'}]]);
      animate('.web-profile-progress>span',[[0,{transform:'scaleX(0)'}],[4.4,{transform:'scaleX(0)'}],[7.8,{transform:'scaleX(1)'}],[15.2,{transform:'scaleX(1)'}],[16.2,{transform:'scaleX(0)'}],[44.2,{transform:'scaleX(0)'}]]);
      ['name','company','role','size','industry','location'].forEach((field,i) => {
        const at=4.7+i*.55;
        animate('.web-profile-'+field,[[0,{opacity:0,transform:'translateY(5px)'}],[at,{opacity:0,transform:'translateY(5px)'}],[at+.3,{opacity:1,transform:'translateY(0px)'}],[15.2,{opacity:1,transform:'translateY(0px)'}],[16.2,{opacity:0,transform:'translateY(5px)'}],[44.2,{opacity:0,transform:'translateY(5px)'}]]);
      });
      // Complete the profile first, then resolve each rule before routing to a rep.
      ['domain','role','size','industry'].forEach((rule,i) => {
        const at=8.1+i*.8, selector='.web-fit-'+rule;
        animate(selector,[[0,{opacity:.42,backgroundColor:'rgba(234,248,240,0)'}],[at,{opacity:.42,backgroundColor:'rgba(234,248,240,0)'}],[at+.4,{opacity:1,backgroundColor:'rgba(234,248,240,1)'}],[15.2,{opacity:1,backgroundColor:'rgba(234,248,240,1)'}],[16.2,{opacity:.42,backgroundColor:'rgba(234,248,240,0)'}],[44.2,{opacity:.42,backgroundColor:'rgba(234,248,240,0)'}]]);
        animate(selector+' path',[[0,{strokeDashoffset:24}],[at,{strokeDashoffset:24}],[at+.4,{strokeDashoffset:0}],[15.2,{strokeDashoffset:0}],[16.2,{strokeDashoffset:24}],[44.2,{strokeDashoffset:24}]]);
      });
      opacity('.web-profile-ready',[[0,0],[11.3,0],[11.65,1],[15.2,1],[16.2,0],[44.2,0]]);
      animate('.web-fit-outcome',[[0,{opacity:0,transform:'translateY(5px)'}],[11.3,{opacity:0,transform:'translateY(5px)'}],[11.65,{opacity:1,transform:'translateY(0px)'}],[15.2,{opacity:1,transform:'translateY(0px)'}],[16.2,{opacity:0,transform:'translateY(5px)'}],[44.2,{opacity:0,transform:'translateY(5px)'}]]);
      opacity('.web-enrich-next',[[0,0],[11.8,0],[12.1,1],[15.2,1],[16.2,0],[44.2,0]]);
      // Slot selection changes on the click frame; the calendar exits immediately.
      animate('.web-selected-time',[[0,{opacity:0}],[15.4,{opacity:1}],[15.62,{opacity:0}],[44.2,{opacity:0}]],'steps(1,end)');
      animate('.web-seo-scroll',[[0,{transform:'translateY(0px)'}],[25.2,{transform:'translateY(0px)'}],[27.2,{transform:'translateY(-480px)'}],[28.2,{transform:'translateY(-480px)'}],[30.4,{transform:'translateY(-1280px)'}],[40.4,{transform:'translateY(-1280px)'}],[41.6,{transform:'translateY(0px)'}],[44.2,{transform:'translateY(0px)'}]]);
      opacity('.web-signup-shade',[[0,0],[31.75,0],[32.05,1],[39.9,1],[40.3,0],[44.2,0]]);
      animate('.web-signup-window',[[0,{opacity:0,transform:'translateY(14px)'}],[31.75,{opacity:0,transform:'translateY(14px)'}],[32.1,{opacity:1,transform:'translateY(0px)'}],[39.9,{opacity:1,transform:'translateY(0px)'}],[40.3,{opacity:0,transform:'translateY(8px)'}],[44.2,{opacity:0,transform:'translateY(14px)'}]]);
      // Accept the terms, type the work email, submit, then show completion.
      animate('.web-signup-checkbox',[[0,{backgroundColor:'#fff',borderColor:'#808080'}],[33.8,{backgroundColor:'#276bff',borderColor:'#276bff'}],[42.7,{backgroundColor:'#fff',borderColor:'#808080'}],[44.2,{backgroundColor:'#fff',borderColor:'#808080'}]],'steps(1,end)');
      animate('.web-signup-check',[[0,{opacity:0}],[33.8,{opacity:1}],[42.7,{opacity:0}],[44.2,{opacity:0}]],'steps(1,end)');
      animate('.web-signup-options',[[0,{opacity:.4}],[33.8,{opacity:1}],[42.7,{opacity:.4}],[44.2,{opacity:.4}]],'steps(1,end)');
      animate('.web-signup-email-entry',[[0,{borderColor:'#ddd'}],[33.8,{borderColor:'#bbb'}],[34.95,{borderColor:'#276bff'}],[37.9,{borderColor:'#ddd'}],[44.2,{borderColor:'#ddd'}]],'steps(1,end)');
      animate('.web-signup-email-placeholder',[[0,{opacity:1,color:'#ddd'}],[33.8,{opacity:1,color:'#777'}],[35.1,{opacity:0,color:'#777'}],[42.7,{opacity:1,color:'#ddd'}],[44.2,{opacity:1,color:'#ddd'}]],'steps(1,end)');
      animate('.web-signup-email-value',[[0,{opacity:0,clipPath:'inset(0 100% 0 0)'}],[35.1,{opacity:1,clipPath:'inset(0 100% 0 0)'}],[36.8,{opacity:1,clipPath:'inset(0 0% 0 0)'}],[42.2,{opacity:1,clipPath:'inset(0 0% 0 0)'}],[42.7,{opacity:0,clipPath:'inset(0 100% 0 0)'}],[44.2,{opacity:0,clipPath:'inset(0 100% 0 0)'}]],'steps(18,end)');
      animate('.web-signup-submit',[[0,{backgroundColor:'#91b5ff'}],[36.8,{backgroundColor:'#276bff'}],[37.9,{backgroundColor:'#214fca'}],[42.7,{backgroundColor:'#91b5ff'}],[44.2,{backgroundColor:'#91b5ff'}]],'steps(1,end)');
      animate('.web-signup-submit-label',[[0,{opacity:1}],[37.9,{opacity:0}],[42.7,{opacity:1}],[44.2,{opacity:1}]],'steps(1,end)');
      animate('.web-signup-submit-progress',[[0,{opacity:0}],[37.9,{opacity:1}],[38.75,{opacity:0}],[44.2,{opacity:0}]],'steps(1,end)');
      opacity('.web-signup-success',[[0,0],[38.75,0],[38.95,1],[40.3,1],[42.7,0],[44.2,0]]);
      const positions=[[0,1060,620],[.75,550,294],[3.4,720,369],[4.6,530,275],[7.9,825,335],[10.7,930,535],[13.3,720,756],[15.05,720,389],[15.4,720,389],[15.5,720,389],[16.4,495,386],[18.65,610,475],[20.4,1030,650],[23,460,454],[24.4,1070,300],[27.5,920,510],[31.05,720,511],[32.6,650,310],[33.5,551,282],[33.8,551,282],[34.75,615,560],[34.95,615,560],[37.55,720,629],[37.9,720,629],[38.1,720,629],[40.6,1100,560],[42.9,1060,620],[44.2,1060,620]];
      animate('.web-demo-cursor',positions.map(([t,x,y])=>[t,{transform:`translate(${x}px,${y}px)`}]));
      opacity('.web-demo-cursor',[[0,0],[.5,0],[.75,1],[4,1],[4.4,0],[12.6,0],[13,1],[15.48,1],[15.62,0],[16,0],[16.4,1],[16.7,1],[16.9,0],[18.4,0],[18.65,1],[38.1,1],[38.5,0],[44.2,0]]);
      const clicks=[[.95,550,294],[3.7,720,369],[13.55,720,756],[15.4,720,389],[16.55,495,386],[18.85,610,475],[23.3,460,454],[31.5,720,511],[33.8,551,282],[34.95,615,560],[37.9,720,629]];
      const ripple=[[0,{left:'550px',top:'294px',opacity:0,transform:'scale(.65)'}]];
      clicks.forEach(([at,x,y])=>{const releaseAt=at===15.4?at+.2:at+.4;ripple.push([at-.15,{left:`${x}px`,top:`${y}px`,opacity:0,transform:'scale(.65)'}],[at,{left:`${x}px`,top:`${y}px`,opacity:.9,transform:'scale(1)'}],[releaseAt,{left:`${x}px`,top:`${y}px`,opacity:0,transform:'scale(1.4)'}]);});
      ripple.push([44.2,{left:'550px',top:'294px',opacity:0,transform:'scale(.65)'}]);animate('.web-click-ripple',ripple);
      browser.dataset.duration = String(duration);
      sync();
    }
    function scheduleLayout() { if (!scheduled) { scheduled=true; requestAnimationFrame(layout); } }
    controls.forEach(button => {
      button.addEventListener('pointerdown',event=>event.stopPropagation());
      button.addEventListener('click',()=>{
        selectedTime=button.dataset.webFlow==='seo'?16200:0;
        animations.forEach(animation=>{animation.currentTime=selectedTime;});sync();
      });
    });
    new ResizeObserver(scheduleLayout).observe(display);
    browser.querySelectorAll('img').forEach(img=>img.addEventListener('load',scheduleLayout,{once:true}));
    controllers.push({sync});scheduleLayout();
  });
  function syncAll(){controllers.forEach(controller=>controller.sync());}
  document.addEventListener('portfolio:motionchange',syncAll);
  document.addEventListener('visibilitychange',syncAll);
  motion.addEventListener('change',syncAll);
})();
