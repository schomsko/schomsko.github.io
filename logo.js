// Animated ASCII wordmark.
// The static art inside <pre id="logo"> is the fallback (no JS, reduced motion);
// '#' marks letter cells, '_' marks the blinking cursor.
(() => {
  const pre = document.getElementById('logo');
  if (!pre) return;

  const staticArt = pre.textContent.replace(/^\n+|\n+$/g, '');
  const art = staticArt.split('\n');
  const rows = art.length;
  const cols = Math.max(...art.map((l) => l.length));

  const LETTER = 1;
  const CURSOR = 2;
  const grid = art.map((line) =>
    Array.from({ length: cols }, (_, x) => (line[x] === '#' ? LETTER : line[x] === '_' ? CURSOR : 0))
  );
  const lit = [];
  grid.forEach((row, y) => row.forEach((c, x) => c === LETTER && lit.push([x, y])));

  const RAMP = ['*', '%', '#', '@'];
  const NOISE = '01<>/\\|{}[]()$%&*+=?!~^';
  const FRAME_MS = 33;
  const CELL_ASPECT = 1.7; // a character cell is about 1.7x taller than wide
  const rnd = (n) => Math.floor(Math.random() * n);
  const noise = () => NOISE[rnd(NOISE.length)];

  let start;
  let startAt;
  let lockAt;
  let introEnd;
  let twinkles;
  let glitch;
  let nextGlitch;
  let pointer;
  let last;
  let raf;
  let visible = true;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function reset(now) {
    start = now;
    startAt = grid.map((row, y) => row.map((_, x) => x * 34 + rnd(260)));
    lockAt = startAt.map((row) => row.map((s) => s + 500 + rnd(500)));
    introEnd = Math.max(...lockAt.flat()) + 200;
    twinkles = [];
    glitch = null;
    nextGlitch = introEnd + 2500;
  }

  function spawnTwinkle() {
    const [x, y] = lit[rnd(lit.length)];
    const nx = x + rnd(3) - 1;
    const ny = y + rnd(3) - 1;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || grid[ny][nx]) return;
    twinkles.push({ x: nx, y: ny, ttl: 5 + rnd(8), ch: '.:+*'[rnd(4)] });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || now - last < FRAME_MS) return;
    last = now;

    const t = now - start;
    const s = now / 1000;
    const idle = t > introEnd;

    const out = [];
    for (let y = 0; y < rows; y++) {
      const line = [];
      for (let x = 0; x < cols; x++) {
        let ch = ' ';
        const cell = grid[y][x];
        if (cell === LETTER) {
          if (t >= startAt[y][x]) {
            if (t < lockAt[y][x]) ch = noise();
            else if (t < lockAt[y][x] + 120) ch = '@';
            else {
              const v = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(x * 0.3 - s * 2.2 + y * 0.15));
              ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
            }
          }
        } else if (cell === CURSOR && idle) {
          ch = Math.floor(t / 530) % 2 ? ' ' : '_';
        }
        if (pointer && cell === LETTER && t >= lockAt[y][x]) {
          const dx = x - pointer.x;
          const dy = (y - pointer.y) * CELL_ASPECT;
          if (dx * dx + dy * dy < 20) ch = noise();
        }
        line.push(ch);
      }
      out.push(line);
    }

    if (idle) {
      if (twinkles.length < 14 && Math.random() < 0.4) spawnTwinkle();
      twinkles = twinkles.filter((k) => --k.ttl > 0);
      twinkles.forEach((k) => {
        if (out[k.y][k.x] === ' ') out[k.y][k.x] = k.ch;
      });

      if (!glitch && t > nextGlitch) {
        glitch = {
          until: t + 160,
          shifts: Array.from({ length: 1 + rnd(3) }, () => ({ y: rnd(rows), dx: (rnd(2) ? 1 : -1) * (1 + rnd(3)) })),
        };
      }
      if (glitch) {
        if (t > glitch.until) {
          glitch = null;
          nextGlitch = t + 3500 + rnd(4000);
        } else {
          glitch.shifts.forEach(({ y, dx }) => {
            const row = out[y].map((c) => (c !== ' ' && Math.random() < 0.2 ? noise() : c));
            const pad = Array(Math.abs(dx)).fill(' ');
            out[y] = dx > 0 ? pad.concat(row).slice(0, cols) : row.slice(-dx).concat(pad);
          });
        }
      }
    }

    pre.textContent = out.map((l) => l.join('')).join('\n');
  }

  function play() {
    if (raf) return;
    reset(performance.now());
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    pre.textContent = staticArt;
  }

  function sync() {
    if (reduced.matches) stop();
    else play();
  }

  pre.addEventListener('pointermove', (e) => {
    const r = pre.getBoundingClientRect();
    pointer = { x: ((e.clientX - r.left) / r.width) * cols, y: ((e.clientY - r.top) / r.height) * rows };
  });
  pre.addEventListener('pointerleave', () => {
    pointer = null;
  });
  pre.addEventListener('click', () => {
    if (raf) reset(performance.now());
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(pre);
  }

  reduced.addEventListener('change', sync);
  sync();
})();
