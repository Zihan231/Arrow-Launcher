(() => {
  'use strict';

  const W = 360;
  const H = 500;
  const STORAGE_KEY = 'arrowLauncher.save.v1';
  const TAU = Math.PI * 2;

  const $ = (selector) => document.querySelector(selector);
  const els = {
    app: $('#app'), menu: $('#menuScreen'), game: $('#gameScreen'), canvas: $('#gameCanvas'), shell: $('#canvasShell'),
    play: $('#playButton'), playLabel: $('#playLabel'), menuLevel: $('#menuLevel'), best: $('#bestLevel'), cleared: $('#clearedCount'), perfect: $('#perfectCount'),
    back: $('#backButton'), pause: $('#pauseButton'), restart: $('#restartButton'), hint: $('#hintButton'), theme: $('#themeButton'),
    level: $('#levelNumber'), shape: $('#shapeLabel'), lives: $('#lives'), progress: $('#progressFill'), progressText: $('#progressText'), streak: $('#streakCount'), toast: $('#boardToast'),
    backdrop: $('#modalBackdrop'), pauseModal: $('#pauseModal'), settingsModal: $('#settingsModal'), successModal: $('#successModal'), failModal: $('#failModal'),
    resume: $('#resumeButton'), pauseRestart: $('#pauseRestartButton'), pauseHome: $('#pauseHomeButton'), menuSettings: $('#menuSettingsButton'), settingsClose: $('#settingsClose'),
    next: $('#nextButton'), retry: $('#retryButton'), failHome: $('#failHomeButton'), sound: $('#soundToggle'), haptic: $('#hapticToggle'), contrast: $('#contrastToggle'),
    resultScore: $('#resultScore'), resultMoves: $('#resultMoves'), resultMistakes: $('#resultMistakes'), resultStreak: $('#resultStreak'), confetti: $('#confetti')
  };
  const ctx = els.canvas.getContext('2d', { alpha: false });

  const defaults = { level: 1, best: 1, cleared: 0, perfect: 0, sound: true, haptics: true, contrast: false, theme: 0 };
  let save = loadSave();
  let state = 'menu';
  let level = null;
  let lives = 3;
  let moves = 0;
  let mistakes = 0;
  let streak = 0;
  let bestStreak = 0;
  let score = 0;
  let runningAnimation = false;
  let pausedAt = 0;
  let particles = [];
  let hintArrow = null;
  let hintUntil = 0;
  let toastTimer = 0;
  let lastFrame = performance.now();
  let audioContext = null;

  const themes = [
    { name: 'Terra', ink: ['#4a3427', '#80513b', '#326d68', '#bd624b', '#9b7139'], glow: '#e56c50' },
    { name: 'Lagoon', ink: ['#173f43', '#29686b', '#4b8581', '#b2684a', '#79624c'], glow: '#3f827b' },
    { name: 'Indigo', ink: ['#34324f', '#55527d', '#7a6280', '#b15f57', '#826b3e'], glow: '#625d96' }
  ];

  const silhouettes = [
    { name: 'HEART STUDY', id: 'heart', test: (x, y) => {
      const yy = y + .13;
      return Math.pow(x * x + yy * yy - .68, 3) - x * x * yy * yy * yy < 0;
    }},
    { name: 'BUTTERFLY NO. 4', id: 'butterfly', test: (x, y) => {
      const ax = Math.abs(x);
      const wing = ((ax - .48) / .43) ** 2 + ((y + .05) / (.68 - .18 * ax)) ** 2 < 1;
      const lower = ((ax - .38) / .32) ** 2 + ((y - .48) / .36) ** 2 < 1;
      return wing || lower || (ax < .11 && y > -.66 && y < .72);
    }},
    { name: 'GOLDEN TROPHY', id: 'trophy', test: (x, y) => {
      const bowl = y < .05 && y > -.68 && Math.abs(x) < .67 - (y + .1) * .3;
      const handles = y > -.5 && y < -.05 && Math.abs(x) > .55 && Math.abs(x) < .92;
      const stem = y >= .02 && y < .58 && Math.abs(x) < .14;
      const base = y >= .48 && y < .72 && Math.abs(x) < .48;
      return bowl || handles || stem || base;
    }},
    { name: 'ANCIENT OAK', id: 'tree', test: (x, y) => {
      const crown = (x * x / .82 + (y + .34) * (y + .34) / .28 < 1) ||
        ((x + .52) ** 2 / .23 + (y + .19) ** 2 / .2 < 1) || ((x - .52) ** 2 / .23 + (y + .19) ** 2 / .2 < 1);
      const trunk = y > -.12 && y < .75 && Math.abs(x) < .13 + y * .18;
      return crown || trunk;
    }},
    { name: 'SAILOR’S ANCHOR', id: 'anchor', test: (x, y) => {
      const ring = x * x + (y + .64) * (y + .64) < .13;
      const stem = Math.abs(x) < .12 && y > -.55 && y < .55;
      const bar = Math.abs(y + .32) < .1 && Math.abs(x) < .54;
      const hook = y > .3 && y < .72 && (Math.abs(x) < .82) && (Math.abs(x) > .2 || y > .56);
      return ring || stem || bar || hook;
    }},
    { name: 'MOONLIT FISH', id: 'fish', test: (x, y) => {
      const body = ((x + .12) / .78) ** 2 + (y / .52) ** 2 < 1;
      const tail = x > .48 && x < .98 && Math.abs(y) < (x - .42) * .95;
      return body || tail;
    }},
    { name: 'WILDFLOWER', id: 'flower', test: (x, y) => {
      const a = Math.atan2(y + .14, x), r = Math.hypot(x, y + .14);
      const petals = r < .68 + .14 * Math.cos(a * 6) && r > .12;
      const stem = y > .4 && Math.abs(x) < .1;
      return petals || stem;
    }},
    { name: 'RISING STAR', id: 'star', test: (x, y) => {
      const a = Math.atan2(y, x) - Math.PI / 2;
      const r = Math.hypot(x, y);
      const edge = .48 + .29 * Math.cos(5 * a);
      return r < edge;
    }}
  ];

  function loadSave() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch (_) { return { ...defaults }; }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  function mulberry32(seed) {
    return function random() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const shuffle = (arr, random) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const key = (c, r) => `${c},${r}`;
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

  function makeLevel(levelNumber, generationSalt = 0) {
    const random = mulberry32((levelNumber * 9277 + 43103 + generationSalt * 7919) >>> 0);
    const shape = silhouettes[(levelNumber - 1) % silhouettes.length];
    const cols = levelNumber < 12 ? 13 : levelNumber < 45 ? 15 : 17;
    const rows = levelNumber < 12 ? 18 : levelNumber < 45 ? 20 : 22;
    const gap = Math.min(19, 288 / (cols - 1), 382 / (rows - 1));
    const x0 = W / 2 - (cols - 1) * gap / 2;
    const y0 = H / 2 - (rows - 1) * gap / 2 - 5;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) / (cols * .47);
        const y = (r - (rows - 1) / 2) / (rows * .48);
        if (shape.test(x, y)) cells.push({ c, r });
      }
    }
    const valid = new Set(cells.map(p => key(p.c, p.r)));
    const target = Math.min(32, 11 + Math.floor(Math.sqrt(levelNumber) * 2.1) + Math.floor(levelNumber / 32));
    let paths = [];
    for (let attempt = 0; attempt < 18; attempt++) {
      paths = carvePaths(cells, valid, target, levelNumber, random);
      if (paths.length >= Math.min(7, target - 1)) break;
    }
    const arrowObjects = paths.map((gridPoints, i) => ({
      id: `L${levelNumber}A${i}`,
      points: gridPoints.map(p => ({ x: x0 + p.c * gap, y: y0 + p.r * gap })),
      direction: null,
      released: false,
      offset: { x: 0, y: 0 },
      animation: null,
      colorIndex: (i + Math.floor(random() * 3)) % themes[save.theme].ink.length,
      order: -1
    }));
    if (!assignSolvableDirections(arrowObjects, random) && generationSalt < 80) {
      return makeLevel(levelNumber, generationSalt + 1);
    }
    return { number: levelNumber, shape, arrows: arrowObjects, total: arrowObjects.length, gap, cells, x0, y0, cols, rows };
  }

  function carvePaths(cells, valid, target, levelNumber, random) {
    const available = new Set(cells.map(p => key(p.c, p.r)));
    const paths = [];
    let covered = 0;
    const desiredCoverage = levelNumber < 10 ? .7 : levelNumber < 35 ? .76 : .82;
    const maxPaths = Math.min(36, target + 11);
    const maxLen = Math.min(10, 6 + Math.floor(levelNumber / 28));
    let safety = 0;
    while ((paths.length < target || covered < cells.length * desiredCoverage) && paths.length < maxPaths && available.size > 2 && safety++ < 1100) {
      const candidates = shuffle(cells.filter(p => available.has(key(p.c, p.r))), random);
      if (!candidates.length) break;
      const start = candidates[0];
      const wanted = 2 + Math.floor(random() * Math.max(2, maxLen - 1));
      const path = [start];
      const local = new Set([key(start.c, start.r)]);
      let current = start;
      let previousDir = null;
      for (let step = 1; step < wanted; step++) {
        let options = dirs.map(d => ({ c: current.c + d.x, r: current.r + d.y, d }))
          .filter(p => valid.has(key(p.c, p.r)) && available.has(key(p.c, p.r)) && !local.has(key(p.c, p.r)))
          .filter(p => !dirs.some(neighbor => {
            const neighborKey = key(p.c + neighbor.x, p.r + neighbor.y);
            return neighborKey !== key(current.c, current.r) && local.has(neighborKey);
          }));
        if (!options.length) break;
        options = shuffle(options, random).sort((a, b) => {
          const aTurn = previousDir && (a.d.x !== previousDir.x || a.d.y !== previousDir.y) ? 1 : 0;
          const bTurn = previousDir && (b.d.x !== previousDir.x || b.d.y !== previousDir.y) ? 1 : 0;
          return (bTurn - aTurn) * (random() > .34 ? 1 : -1);
        });
        const next = options[0];
        path.push({ c: next.c, r: next.r });
        local.add(key(next.c, next.r));
        previousDir = next.d;
        current = next;
      }
      if (path.length >= 2) {
        path.forEach(p => available.delete(key(p.c, p.r)));
        paths.push(path);
        covered += path.length;
      } else {
        available.delete(key(start.c, start.r));
      }
    }
    return paths;
  }

  function samplesFor(points) {
    const samples = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const count = Math.max(1, Math.ceil(dist / 5));
      for (let j = 0; j < count; j++) {
        const t = j / count;
        samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    samples.push(points[points.length - 1]);
    return samples;
  }

  function blocksMoving(moving, obstacle, direction) {
    const bSamples = obstacle._samples || (obstacle._samples = samplesFor(obstacle.points));
    const clearance = save.contrast ? 8.5 : 7.25;
    const endpoint = moving.points[moving.points.length - 1];
    // Only the arrowhead's forward ray determines whether an arrow can leave.
    const head = { x: endpoint.x + direction.x * 8.5, y: endpoint.y + direction.y * 8.5 };
    for (const b of bSamples) {
      const perpendicular = direction.x ? Math.abs(b.y - head.y) : Math.abs(b.x - head.x);
      const ahead = direction.x ? (b.x - head.x) * direction.x : (b.y - head.y) * direction.y;
      if (perpendicular < clearance && ahead > 0) return true;
    }
    return false;
  }

  function blockersFor(arrow, arrows = level.arrows, direction = arrow.direction) {
    return arrows.filter(other => !other.released && other !== arrow && blocksMoving(arrow, other, direction));
  }

  function assignSolvableDirections(arrows, random) {
    const remaining = arrows.slice();
    let order = 0;
    while (remaining.length) {
      const safeOptions = [];
      for (const arrow of remaining) {
        for (const reversed of shuffle([false, true], random)) {
          const oriented = reversed ? arrow.points.slice().reverse() : arrow.points.slice();
          const last = oriented[oriented.length - 1];
          const previous = oriented[oriented.length - 2];
          const incoming = { x: Math.sign(last.x - previous.x), y: Math.sign(last.y - previous.y) };
          for (const direction of shuffle(dirs.slice(), random)) {
            // Continue forward or make a crisp 90-degree final turn; never double back.
            if (incoming.x * direction.x + incoming.y * direction.y < 0) continue;
            const lead = { x: last.x + direction.x * 6, y: last.y + direction.y * 6 };
            const candidatePoints = oriented.concat(lead);
            const candidate = { points: candidatePoints };
            const ownBody = { points: oriented.slice(0, -1) };
            // Reject heads aimed through another part of their own routed line.
            if (blocksMoving(candidate, ownBody, direction)) continue;
            if (!remaining.some(other => other !== arrow && blocksMoving(candidate, other, direction))) {
              safeOptions.push({ arrow, direction, points: candidatePoints });
            }
          }
        }
      }
      if (!safeOptions.length) return false;
      const chosen = safeOptions[Math.floor(random() * safeOptions.length)];
      chosen.arrow.points = chosen.points;
      chosen.arrow._samples = null;
      chosen.arrow.direction = { ...chosen.direction };
      chosen.arrow.order = order++;
      remaining.splice(remaining.indexOf(chosen.arrow), 1);
    }
    arrows.forEach(arrow => { arrow._samples = null; });
    const solutionOrder = arrows.slice().sort((a, b) => a.order - b.order);
    return solutionOrder.every((arrow, index) =>
      !solutionOrder.slice(index + 1).some(other => blocksMoving(arrow, other, arrow.direction))
    );
  }

  function startGame(levelNumber = save.level) {
    closeModal();
    state = 'playing';
    showScreen(els.game);
    lives = 3; moves = 0; mistakes = 0; streak = 0; bestStreak = 0; score = 0;
    hintArrow = null; hintUntil = 0; particles = []; runningAnimation = false;
    level = makeLevel(Math.max(1, levelNumber));
    els.level.textContent = level.number;
    els.shape.textContent = level.shape.name;
    updateHUD();
    resizeCanvas();
    toast('Find the loose arrow', 1600);
    sound('start');
  }

  function restartLevel() { startGame(level ? level.number : save.level); }
  function showScreen(screen) {
    [els.menu, els.game].forEach(s => s.classList.toggle('active', s === screen));
  }
  function showMenu() {
    state = 'menu'; closeModal(); showScreen(els.menu); updateMenu();
  }
  function updateMenu() {
    els.menuLevel.textContent = `Level ${save.level}`;
    els.playLabel.textContent = save.cleared ? 'CONTINUE' : 'BEGIN JOURNEY';
    els.best.textContent = save.best;
    els.cleared.textContent = save.cleared;
    els.perfect.textContent = save.perfect;
  }

  function updateHUD() {
    els.lives.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const drop = document.createElement('i');
      drop.className = `life-drop${i >= lives ? ' lost' : ''}`;
      els.lives.appendChild(drop);
    }
    els.lives.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'}`);
    const removed = level ? level.arrows.filter(a => a.released).length : 0;
    const progress = level ? Math.round(removed / level.total * 100) : 0;
    els.progress.style.width = `${progress}%`;
    els.progressText.textContent = `${progress}%`;
    els.streak.textContent = streak;
  }

  function resizeCanvas() {
    const rect = els.shell.getBoundingClientRect();
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    els.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    els.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    els.canvas._scaleX = rect.width / W;
    els.canvas._scaleY = rect.height / H;
    els.canvas._dpr = dpr;
  }

  function setupContext() {
    ctx.setTransform(els.canvas._dpr * els.canvas._scaleX, 0, 0, els.canvas._dpr * els.canvas._scaleY, 0, 0);
  }

  function routedPath(points, offset = { x: 0, y: 0 }) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x + offset.x, points[0].y + offset.y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x + offset.x, points[i].y + offset.y);
  }

  function polylineLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    return length;
  }

  function pointAlongPath(points, cumulative, distance) {
    const clamped = Math.max(0, Math.min(distance, cumulative[cumulative.length - 1]));
    for (let i = 1; i < cumulative.length; i++) {
      if (clamped <= cumulative[i]) {
        const segmentLength = cumulative[i] - cumulative[i - 1];
        const t = segmentLength ? (clamped - cumulative[i - 1]) / segmentLength : 0;
        return {
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
        };
      }
    }
    return { ...points[points.length - 1] };
  }

  function slicePath(points, startDistance, endDistance) {
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    const sliced = [pointAlongPath(points, cumulative, startDistance)];
    for (let i = 1; i < points.length - 1; i++) {
      if (cumulative[i] > startDistance && cumulative[i] < endDistance) sliced.push({ ...points[i] });
    }
    const end = pointAlongPath(points, cumulative, endDistance);
    const previous = sliced[sliced.length - 1];
    if (Math.hypot(end.x - previous.x, end.y - previous.y) > .01) sliced.push(end);
    return sliced;
  }

  function drawArrow(arrow, now) {
    if (arrow.released) return;
    let offset = arrow.offset;
    let displayPoints = arrow.points;
    if (arrow.animation?.type === 'shake') {
      const t = Math.min(1, (now - arrow.animation.start) / arrow.animation.duration);
      const power = (1 - t) * 7;
      const perpendicular = { x: -arrow.direction.y, y: arrow.direction.x };
      offset = { x: perpendicular.x * Math.sin(t * Math.PI * 8) * power, y: perpendicular.y * Math.sin(t * Math.PI * 8) * power };
      if (t >= 1) { arrow.animation = null; arrow.offset = { x: 0, y: 0 }; runningAnimation = false; }
    } else if (arrow.animation?.type === 'release') {
      const t = Math.min(1, (now - arrow.animation.start) / arrow.animation.duration);
      const ease = t * t * (3 - 2 * t);
      const travelled = arrow.animation.distance * ease;
      displayPoints = slicePath(arrow.animation.route, travelled, arrow.animation.bodyLength + travelled);
      offset = { x: 0, y: 0 };
      if (t >= 1) finishRelease(arrow);
    }

    const theme = themes[save.theme];
    const color = save.contrast ? '#11100f' : theme.ink[0];
    const highlighted = arrow === hintArrow && now < hintUntil;
    if (arrow.animation?.type === 'release' && now - arrow.animation.lastTrail > 48) {
      const trailPoint = displayPoints[displayPoints.length - 1];
      particles.push({
        x: trailPoint.x, y: trailPoint.y,
        vx: -arrow.direction.x * .25 + (Math.random() - .5) * .45,
        vy: -arrow.direction.y * .25 + (Math.random() - .5) * .45,
        born: now, life: 280 + Math.random() * 150, color, size: .8 + Math.random() * 1.2
      });
      arrow.animation.lastTrail = now;
    }
    ctx.save();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.miterLimit = 2;
    if (highlighted) {
      ctx.shadowColor = theme.glow; ctx.shadowBlur = 8 + Math.sin(now / 110) * 3;
      ctx.strokeStyle = theme.glow; ctx.lineWidth = 8;
      ctx.globalAlpha = .2;
      routedPath(displayPoints, offset); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = 'rgba(40,29,20,.13)'; ctx.shadowBlur = 1.5; ctx.shadowOffsetY = 1;
    ctx.strokeStyle = color; ctx.lineWidth = save.contrast ? 4.5 : 3.6;
    routedPath(displayPoints, offset); ctx.stroke();

    const tipPoint = displayPoints[displayPoints.length - 1];
    const tip = { x: tipPoint.x + offset.x + arrow.direction.x * 8.5, y: tipPoint.y + offset.y + arrow.direction.y * 8.5 };
    const back = { x: tip.x - arrow.direction.x * 11, y: tip.y - arrow.direction.y * 11 };
    const perp = { x: -arrow.direction.y, y: arrow.direction.x };
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(back.x + perp.x * 5.2, back.y + perp.y * 5.2);
    ctx.lineTo(back.x - perp.x * 5.2, back.y - perp.y * 5.2);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  function drawBackground(now) {
    ctx.fillStyle = save.contrast ? '#fbf7ef' : '#f7f1e7';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.fillStyle = 'rgba(72,61,50,.13)';
    const drift = Math.sin(now / 1800) * .3;
    for (let y = 18; y < H; y += 18) {
      for (let x = 18; x < W; x += 18) {
        ctx.beginPath(); ctx.arc(x + drift, y, .72, 0, TAU); ctx.fill();
      }
    }
    if (level) {
      ctx.fillStyle = 'rgba(211,166,94,.025)';
      for (const cell of level.cells) {
        ctx.beginPath();
        ctx.arc(level.x0 + cell.c * level.gap, level.y0 + cell.r * level.gap, level.gap * .48, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function spawnReleaseParticles(arrow) {
    const p = arrow.points[arrow.points.length - 1];
    const color = save.contrast ? '#11100f' : themes[save.theme].ink[0];
    for (let i = 0; i < 9; i++) particles.push({
      x: p.x, y: p.y, vx: arrow.direction.x * (1 + Math.random() * 2) + (Math.random() - .5) * 1.7,
      vy: arrow.direction.y * (1 + Math.random() * 2) + (Math.random() - .5) * 1.7,
      born: performance.now(), life: 430 + Math.random() * 220, color, size: 1.4 + Math.random() * 2
    });
  }
  function drawParticles(now) {
    particles = particles.filter(p => now - p.born < p.life);
    for (const p of particles) {
      const age = now - p.born, t = age / p.life;
      p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy *= .97;
      ctx.globalAlpha = 1 - t; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t * .45), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(50, now - lastFrame); lastFrame = now;
    if (state !== 'menu' && level) {
      setupContext(); drawBackground(now);
      const active = level.arrows.filter(a => !a.released);
      active.sort((a, b) => a.points.length - b.points.length).forEach(a => drawArrow(a, now));
      drawParticles(now, dt);
    }
    requestAnimationFrame(frame);
  }

  function pointSegmentDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function hitArrow(point) {
    let best = null, bestDistance = 19;
    for (const arrow of level.arrows) {
      if (arrow.released || arrow.animation) continue;
      for (let i = 0; i < arrow.points.length - 1; i++) {
        const d = pointSegmentDistance(point, arrow.points[i], arrow.points[i + 1]);
        if (d < bestDistance) { bestDistance = d; best = arrow; }
      }
    }
    return best;
  }

  function canvasPointer(event) {
    if (state !== 'playing' || runningAnimation || !level) return;
    const rect = els.canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width * W, y: (event.clientY - rect.top) / rect.height * H };
    const arrow = hitArrow(point);
    if (!arrow) return;
    event.preventDefault();
    launchArrow(arrow);
  }

  function launchArrow(arrow) {
    moves++;
    const blockers = blockersFor(arrow);
    if (!blockers.length) {
      runningAnimation = true;
      streak++; bestStreak = Math.max(bestStreak, streak);
      score += 100 + Math.min(200, streak * 12);
      const bodyLength = polylineLength(arrow.points);
      const head = arrow.points[arrow.points.length - 1];
      const edgeDistance = arrow.direction.x > 0 ? W - head.x : arrow.direction.x < 0 ? head.x : arrow.direction.y > 0 ? H - head.y : head.y;
      const distance = bodyLength + edgeDistance + 42;
      const routeEnd = {
        x: head.x + arrow.direction.x * (distance + 20),
        y: head.y + arrow.direction.y * (distance + 20)
      };
      arrow.animation = {
        type: 'release', start: performance.now(),
        duration: Math.max(720, Math.min(1180, 610 + distance * .72)),
        distance, bodyLength, route: arrow.points.concat(routeEnd), lastTrail: 0
      };
      spawnReleaseParticles(arrow);
      sound('release'); haptic(11);
    } else {
      runningAnimation = true;
      lives--; mistakes++; streak = 0;
      arrow.animation = { type: 'shake', start: performance.now(), duration: 430 };
      sound('error'); haptic([34, 35, 34]);
      toast(lives ? 'That path is still tangled' : 'No drops left', 1200);
      updateHUD();
      if (!lives) setTimeout(() => { if (state === 'playing') showModal(els.failModal); }, 560);
    }
  }

  function finishRelease(arrow) {
    if (arrow.released) return;
    arrow.released = true; arrow.animation = null; runningAnimation = false;
    updateHUD();
    if (level.arrows.every(a => a.released)) {
      runningAnimation = true;
      score += 500 + (mistakes === 0 ? 500 : 0) + lives * 100;
      setTimeout(completeLevel, 480);
    }
  }

  function completeLevel() {
    if (state !== 'playing') return;
    sound('complete'); haptic([18, 40, 18, 40, 45]);
    els.resultScore.textContent = score.toLocaleString();
    els.resultMoves.textContent = moves;
    els.resultMistakes.textContent = mistakes;
    els.resultStreak.textContent = bestStreak;
    save.cleared++;
    if (!mistakes) save.perfect++;
    save.level = level.number + 1;
    save.best = Math.max(save.best, save.level);
    persist(); updateMenu(); makeConfetti();
    showModal(els.successModal);
  }

  function showModal(modal) {
    pausedAt = performance.now();
    state = modal === els.settingsModal && els.menu.classList.contains('active') ? 'menu-modal' : 'paused';
    [els.pauseModal, els.settingsModal, els.successModal, els.failModal].forEach(m => m.classList.toggle('active', m === modal));
    els.backdrop.classList.add('show'); els.backdrop.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    els.backdrop.classList.remove('show'); els.backdrop.setAttribute('aria-hidden', 'true');
    [els.pauseModal, els.settingsModal, els.successModal, els.failModal].forEach(m => m.classList.remove('active'));
    if (level && els.game.classList.contains('active')) state = 'playing';
  }

  function toast(text, duration = 1200) {
    clearTimeout(toastTimer); els.toast.textContent = text; els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), duration);
  }

  function useHint() {
    if (state !== 'playing' || runningAnimation) return;
    const safe = level.arrows.filter(a => !a.released && blockersFor(a).length === 0);
    if (!safe.length) return;
    hintArrow = safe[Math.floor(Math.random() * safe.length)]; hintUntil = performance.now() + 2500;
    toast('This arrow can escape', 1700); sound('hint'); haptic(8);
  }

  function cycleTheme() {
    save.theme = (save.theme + 1) % themes.length; persist();
    if (level) level.arrows.forEach((arrow, i) => arrow.colorIndex = (i * 2 + level.number) % themes[save.theme].ink.length);
    toast(`${themes[save.theme].name} palette`, 1100); sound('tap');
  }

  function makeConfetti() {
    els.confetti.innerHTML = '';
    const colors = ['#e56c50', '#3f827b', '#d3a65e', '#8d6b8c'];
    for (let i = 0; i < 24; i++) {
      const bit = document.createElement('i');
      bit.style.left = `${5 + Math.random() * 90}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = `${Math.random() * .7}s`;
      bit.style.setProperty('--drift', `${-55 + Math.random() * 110}px`);
      els.confetti.appendChild(bit);
    }
  }

  function sound(type) {
    if (!save.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const ac = audioContext, now = ac.currentTime;
      const tones = {
        tap: [[360, .045]], start: [[280, .06], [420, .09]], release: [[510, .05], [720, .08]],
        error: [[150, .12], [115, .12]], hint: [[620, .06], [820, .1]], complete: [[440, .09], [554, .09], [659, .18]]
      }[type] || [[350, .05]];
      let cursor = now;
      tones.forEach(([freq, length]) => {
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.type = type === 'error' ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(freq, cursor);
        gain.gain.setValueAtTime(.0001, cursor); gain.gain.exponentialRampToValueAtTime(.055, cursor + .012); gain.gain.exponentialRampToValueAtTime(.0001, cursor + length);
        osc.connect(gain).connect(ac.destination); osc.start(cursor); osc.stop(cursor + length + .02); cursor += length * .72;
      });
    } catch (_) {}
  }
  function haptic(pattern) { if (save.haptics && navigator.vibrate) navigator.vibrate(pattern); }

  function updateSettings() {
    [[els.sound, save.sound], [els.haptic, save.haptics], [els.contrast, save.contrast]].forEach(([el, on]) => {
      el.classList.toggle('on', on); el.setAttribute('aria-checked', String(on));
    });
    els.app.classList.toggle('high-contrast', save.contrast);
  }

  els.play.addEventListener('click', () => startGame(save.level));
  els.back.addEventListener('click', showMenu);
  els.pause.addEventListener('click', () => { if (state === 'playing') showModal(els.pauseModal); });
  els.restart.addEventListener('click', restartLevel);
  els.hint.addEventListener('click', useHint);
  els.theme.addEventListener('click', cycleTheme);
  els.resume.addEventListener('click', closeModal);
  els.pauseRestart.addEventListener('click', restartLevel);
  els.pauseHome.addEventListener('click', showMenu);
  els.retry.addEventListener('click', restartLevel);
  els.failHome.addEventListener('click', showMenu);
  els.next.addEventListener('click', () => startGame(save.level));
  els.menuSettings.addEventListener('click', () => showModal(els.settingsModal));
  els.settingsClose.addEventListener('click', () => { closeModal(); state = els.menu.classList.contains('active') ? 'menu' : 'playing'; });
  els.sound.addEventListener('click', () => { save.sound = !save.sound; persist(); updateSettings(); sound('tap'); });
  els.haptic.addEventListener('click', () => { save.haptics = !save.haptics; persist(); updateSettings(); haptic(12); });
  els.contrast.addEventListener('click', () => { save.contrast = !save.contrast; persist(); updateSettings(); });
  els.canvas.addEventListener('pointerdown', canvasPointer, { passive: false });
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') showModal(els.pauseModal); });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (els.backdrop.classList.contains('show')) closeModal();
      else if (state === 'playing') showModal(els.pauseModal);
    }
    if (event.key.toLowerCase() === 'h') useHint();
    if (event.key.toLowerCase() === 'r' && state === 'playing') restartLevel();
  });

  function validateGenerated(number) {
    const generated = makeLevel(number);
    const remaining = generated.arrows.slice();
    let removed = 0;
    while (remaining.length) {
      const index = remaining.findIndex(arrow => !remaining.some(other => other !== arrow && blocksMoving(arrow, other, arrow.direction)));
      if (index < 0) return { valid: false, arrows: generated.total, removed };
      remaining.splice(index, 1); removed++;
    }
    return { valid: true, arrows: generated.total, removed };
  }

  updateSettings(); updateMenu(); resizeCanvas(); requestAnimationFrame(frame);
  window.ArrowLauncher = { makeLevel, validateGenerated, blockersFor, restart: restartLevel, get state() { return { level, lives, moves, mistakes }; } };
})();
