(() => {
  document.querySelectorAll('.cinema-screen').forEach(screen => {
    function align() {
      screen.style.setProperty('--projection-scale', String(screen.clientWidth / 832));
    }
    new ResizeObserver(align).observe(screen);
    align();
  });
})();
