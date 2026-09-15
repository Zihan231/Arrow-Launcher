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
    back: $('#backButton'), pause: $('#pauseButton'), restart: $('#restartButton'), hint: $('#hintButton'), hintTitle: $('#hintTitle'), hintDetail: $('#hintDetail'), theme: $('#themeButton'),
    level: $('#levelNumber'), shape: $('#shapeLabel'), lives: $('#lives'), progress: $('#progressFill'), progressText: $('#progressText'), streak: $('#streakCount'), toast: $('#boardToast'),
    backdrop: $('#modalBackdrop'), pauseModal: $('#pauseModal'), settingsModal: $('#settingsModal'), successModal: $('#successModal'), failModal: $('#failModal'),
    resume: $('#resumeButton'), pauseRestart: $('#pauseRestartButton'), pauseHome: $('#pauseHomeButton'), menuSettings: $('#menuSettingsButton'), settingsClose: $('#settingsClose'),
    next: $('#nextButton'), retry: $('#retryButton'), failHome: $('#failHomeButton'), sound: $('#soundToggle'), haptic: $('#hapticToggle'), contrast: $('#contrastToggle'),
    bossBadge: $('#bossBadge'), testNext: $('#testNextButton'), resultEyebrow: $('#resultEyebrow'), resultTitle: $('#resultTitle'), nextLabel: $('#nextLabel'),
    resultScore: $('#resultScore'), resultMoves: $('#resultMoves'), resultMistakes: $('#resultMistakes'), resultStreak: $('#resultStreak'), confetti: $('#confetti')
  };
  const ctx = els.canvas.getContext('2d', { alpha: false });

  const defaults = { level: 1, best: 1, cleared: 0, perfect: 0, bosses: 0, bossPending: false, sound: true, haptics: true, contrast: false, theme: 0 };
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
  let audioMaster = null;
  let testingPreview = false;
  let hintsRemaining = Infinity;
  let completionPending = false;
  let completionCommitted = false;
  let completionPresented = false;
  let completionTimer = 0;

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

  const inTriangle = (x, y, centerX, topY, baseY, halfWidth) =>
    y >= topY && y <= baseY && Math.abs(x - centerX) <= ((y - topY) / (baseY - topY)) * halfWidth;

  const bossSilhouettes = [
    { name: 'CROWN OF PATHS', id: 'boss-crown', test: (x, y) => {
      const crown = inTriangle(x, y, -.58, -.78, .18, .36) || inTriangle(x, y, 0, -.88, .18, .4) || inTriangle(x, y, .58, -.78, .18, .36);
      const body = y >= .05 && y < .52 && Math.abs(x) < .86;
      const base = y >= .48 && y < .7 && Math.abs(x) < .72;
      return crown || body || base;
    }},
    { name: 'ROYAL SHIELD', id: 'boss-shield', test: (x, y) => {
      if (y < -.78 || y > .82) return false;
      const width = y < .05 ? .84 : .84 * Math.max(0, 1 - (y - .05) / .77);
      return Math.abs(x) < width;
    }},
    { name: 'ETERNAL EYE', id: 'boss-eye', test: (x, y) => {
      const outer = (x / .96) ** 2 + (y / .55) ** 2 < 1;
      const rays = (Math.abs(x) < .13 && Math.abs(y) < .82) || (Math.abs(y) < .1 && Math.abs(x) < .94);
      return outer || rays;
    }},
    { name: 'PHOENIX SEAL', id: 'boss-phoenix', test: (x, y) => {
      const wings = ((Math.abs(x) - .48) / .48) ** 2 + ((y + .18) / .48) ** 2 < 1;
      const body = Math.abs(x) < .14 && y > -.62 && y < .65;
      const tail = y > .35 && Math.abs(x) < .52 * (1 - (y - .35) / .5);
      return wings || body || tail;
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

  function makeLevel(levelNumber, generationSalt = 0, isBoss = false) {
    const random = mulberry32((levelNumber * 9277 + 43103 + generationSalt * 7919 + (isBoss ? 104729 : 0)) >>> 0);
    const bossNumber = isBoss ? levelNumber / 10 : 0;
    const shape = isBoss ? bossSilhouettes[(bossNumber - 1) % bossSilhouettes.length] : silhouettes[(levelNumber - 1) % silhouettes.length];
    const normalGrowth = Math.min(4, Math.floor((levelNumber - 1) / 10));
    const bossGrowth = isBoss ? Math.min(3, Math.floor((bossNumber - 1) / 3)) : 0;
    const cols = isBoss ? 27 + bossGrowth * 2 : 21 + normalGrowth * 2;
    const rows = isBoss ? 33 + bossGrowth * 2 : 27 + normalGrowth * 2;
    const bossGap = 11.5 - Math.min(1.2, Math.max(0, bossNumber - 1) * .1);
    const gap = isBoss ? Math.min(bossGap, 280 / (cols - 1), 372 / (rows - 1)) : Math.min(13.5, 280 / (cols - 1), 372 / (rows - 1));
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
    const target = isBoss
      ? Math.min(76, 56 + bossNumber * 2)
      : Math.min(64, 24 + Math.floor(levelNumber * .8));
    let paths = [];
    for (let attempt = 0; attempt < 18; attempt++) {
      paths = carvePaths(cells, valid, target, levelNumber, random, isBoss, bossNumber);
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
    const dependencyBias = isBoss ? Math.min(1, .94 + bossNumber * .015) : Math.min(.98, .45 + levelNumber * .02);
    if (!assignSolvableDirections(arrowObjects, random, dependencyBias) && generationSalt < 80) {
      return makeLevel(levelNumber, generationSalt + 1, isBoss);
    }
    return { number: levelNumber, isBoss, bossNumber, shape, arrows: arrowObjects, total: arrowObjects.length, gap, cells, x0, y0, cols, rows };
  }

  function carvePaths(cells, valid, target, levelNumber, random, isBoss = false, bossNumber = 0) {
    const available = new Set(cells.map(p => key(p.c, p.r)));
    const paths = [];
    let covered = 0;
    const desiredCoverage = isBoss ? Math.min(.98, .93 + bossNumber * .005) : Math.min(.95, .76 + levelNumber * .004);
    const maxPaths = isBoss ? Math.min(80, target + 4) : Math.min(68, target + 6);
    const maxLen = isBoss ? Math.min(45, 14 + Math.floor(bossNumber / 2)) : Math.min(30, 7 + Math.floor(levelNumber / 6));
    const minLen = isBoss ? 6 : Math.min(7, 3 + Math.floor(levelNumber / 12));
    const turnBias = isBoss ? 1 : Math.min(1, .55 + levelNumber * .015);
    let safety = 0;
    while ((paths.length < target || covered < cells.length * desiredCoverage) && paths.length < maxPaths && available.size > 2 && safety++ < 1800) {
      const candidates = shuffle(cells.filter(p => available.has(key(p.c, p.r))), random)
        .map(point => ({
          ...point,
          freedom: dirs.reduce((count, direction) => count + (available.has(key(point.c + direction.x, point.r + direction.y)) ? 1 : 0), 0)
        }))
        .sort((a, b) => b.freedom - a.freedom);
      if (!candidates.length) break;
      const start = candidates[0];
      const wanted = minLen + Math.floor(random() * Math.max(1, maxLen - minLen + 1));
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
        options.forEach(option => {
          const isTurn = previousDir && (option.d.x !== previousDir.x || option.d.y !== previousDir.y);
          const onward = dirs.reduce((count, direction) => {
            const nextKey = key(option.c + direction.x, option.r + direction.y);
            return count + (available.has(nextKey) && !local.has(nextKey) ? 1 : 0);
          }, 0);
          option.score = onward * 1.05 + (isTurn ? 2.2 + turnBias * 2.6 : 0) + random() * .7;
        });
        options.sort((a, b) => b.score - a.score);
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
    // Shape topology can occasionally consume the available cells in fewer
    // long routes than the level's arrow target. Split only the longest routes
    // so later levels still meet their minimum arrow-count difficulty.
    while (paths.length < Math.min(target, maxPaths)) {
      let longestIndex = -1;
      for (let i = 0; i < paths.length; i++) {
        if (paths[i].length >= 4 && (longestIndex < 0 || paths[i].length > paths[longestIndex].length)) longestIndex = i;
      }
      if (longestIndex < 0) break;
      const longest = paths[longestIndex];
      const middle = Math.floor(longest.length / 2);
      paths.splice(longestIndex, 1, longest.slice(0, middle), longest.slice(middle));
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
    const clearance = save.contrast ? 6.4 : 5.4;
    const endpoint = moving.points[moving.points.length - 1];
    // Only the arrowhead's forward ray determines whether an arrow can leave.
    const head = { x: endpoint.x + direction.x * 6.5, y: endpoint.y + direction.y * 6.5 };
    for (const b of bSamples) {
      const perpendicular = direction.x ? Math.abs(b.y - head.y) : Math.abs(b.x - head.x);
      const ahead = direction.x ? (b.x - head.x) * direction.x : (b.y - head.y) * direction.y;
      if (perpendicular < clearance && ahead > 0) return true;
    }
    return false;
  }

  function blockersFor(arrow, arrows = level.arrows, direction = arrow.direction) {
    return arrows.filter(other =>
      !other.released && other.animation?.type !== 'release' && other !== arrow && blocksMoving(arrow, other, direction)
    );
  }

  function assignSolvableDirections(arrows, random, dependencyBias = .25) {
    const remaining = arrows.slice();
    const solvedEarlier = [];
    let order = 0;
    while (remaining.length) {
      const safeOptions = [];
      for (const arrow of remaining) {
        for (const reversed of shuffle([false, true], random)) {
          const oriented = reversed ? arrow.points.slice().reverse() : arrow.points.slice();
          const last = oriented[oriented.length - 1];
          const previous = oriented[oriented.length - 2];
          const direction = { x: Math.sign(last.x - previous.x), y: Math.sign(last.y - previous.y) };
          const candidate = { points: oriented };
          const ownBody = { points: oriented.slice(0, -1) };
          // The head follows the real final segment, so it is never separated
          // from the body by a tiny artificial elbow.
          if (blocksMoving(candidate, ownBody, direction)) continue;
          if (!remaining.some(other => other !== arrow && blocksMoving(candidate, other, direction))) {
            const blockerScore = solvedEarlier.reduce((count, earlier) => count + (blocksMoving(candidate, earlier, direction) ? 1 : 0), 0);
            safeOptions.push({ arrow, direction, points: oriented, blockerScore });
          }
        }
      }
      if (!safeOptions.length) return false;
      let choices = safeOptions;
      if (random() < dependencyBias) {
        const strongestDependency = Math.max(...safeOptions.map(option => option.blockerScore));
        choices = safeOptions.filter(option => option.blockerScore === strongestDependency);
      }
      const chosen = choices[Math.floor(random() * choices.length)];
      chosen.arrow.points = chosen.points;
      chosen.arrow._samples = null;
      chosen.arrow.direction = { ...chosen.direction };
      chosen.arrow.order = order++;
      solvedEarlier.push(chosen.arrow);
      remaining.splice(remaining.indexOf(chosen.arrow), 1);
    }
    arrows.forEach(arrow => { arrow._samples = null; });
    const solutionOrder = arrows.slice().sort((a, b) => a.order - b.order);
    return solutionOrder.every((arrow, index) =>
      !solutionOrder.slice(index + 1).some(other => blocksMoving(arrow, other, arrow.direction))
    );
  }

  function startGame(levelNumber = save.level, bossMode = save.bossPending, previewMode = false) {
    clearTimeout(completionTimer);
    completionTimer = 0;
    completionPending = false;
    completionCommitted = false;
    completionPresented = false;
    closeModal();
    testingPreview = previewMode;
    state = 'playing';
    showScreen(els.game);
    lives = 3; moves = 0; mistakes = 0; streak = 0; bestStreak = 0; score = 0;
    hintArrow = null; hintUntil = 0; particles = []; runningAnimation = false;
    level = makeLevel(Math.max(1, levelNumber), 0, Boolean(bossMode));
    if (level.isBoss) {
      lives = Math.max(1, 3 - Math.floor((level.bossNumber - 1) / 2));
      hintsRemaining = Math.max(0, 3 - Math.floor((level.bossNumber + 1) / 2));
    } else {
      hintsRemaining = Infinity;
    }
    els.game.classList.toggle('boss-level', level.isBoss);
    els.level.textContent = level.number;
    const bossRank = level.bossNumber < 3 ? 'HARD' : level.bossNumber < 5 ? 'BRUTAL' : 'LEGENDARY';
    els.shape.textContent = level.isBoss ? `BOSS ${level.bossNumber} • ${bossRank} • ${level.shape.name}` : level.shape.name;
    updateHintButton();
    updateTestButton();
    updateHUD();
    resizeCanvas();
    toast(level.isBoss ? `${lives} ${lives === 1 ? 'life' : 'lives'} • No skipping` : 'Find the loose arrow', level.isBoss ? 2100 : 1600);
    sound('start');
  }

  function restartLevel() { startGame(level ? level.number : save.level, level ? level.isBoss : save.bossPending, testingPreview); }
  function showScreen(screen) {
    [els.menu, els.game].forEach(s => s.classList.toggle('active', s === screen));
  }
  function showMenu() {
    clearTimeout(completionTimer);
    completionTimer = 0;
    completionPending = false;
    testingPreview = false;
    closeModal();
    showScreen(els.menu);
    state = 'menu';
    updateMenu();
  }

  function updateTestButton() {
    if (!level) return;
    if (level.isBoss) els.testNext.textContent = `TEST: LEVEL ${level.number + 10} →`;
    else if (level.number % 10 === 0) els.testNext.textContent = `TEST: BOSS ${level.number / 10} →`;
    else els.testNext.textContent = `TEST: LEVEL ${Math.ceil(level.number / 10) * 10} →`;
  }

  function previewNextMilestone() {
    if (!level) return startGame(10, false, true);
    if (level.isBoss) startGame(level.number + 10, false, true);
    else if (level.number % 10 === 0) startGame(level.number, true, true);
    else startGame(Math.ceil(level.number / 10) * 10, false, true);
  }
  function updateMenu() {
    const bossWaiting = save.bossPending;
    els.menuLevel.textContent = bossWaiting ? `Boss ${save.level / 10} • Level ${save.level}` : `Level ${save.level}`;
    els.playLabel.textContent = bossWaiting ? 'FACE THE BOSS' : save.cleared ? 'CONTINUE' : 'BEGIN JOURNEY';
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
    const scale = Math.min(rect.width / W, rect.height / H);
    els.canvas._scale = scale || 1;
    els.canvas._offsetX = Math.max(0, (rect.width - W * els.canvas._scale) / 2);
    els.canvas._offsetY = Math.max(0, (rect.height - H * els.canvas._scale) / 2);
    els.canvas._dpr = dpr;
  }

  function setupContext() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = save.contrast ? '#fbf7ef' : '#f7f1e7';
    ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
    const scale = els.canvas._dpr * els.canvas._scale;
    ctx.setTransform(scale, 0, 0, scale, els.canvas._dpr * els.canvas._offsetX, els.canvas._dpr * els.canvas._offsetY);
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
    const color = save.contrast ? '#11100f' : level?.isBoss ? '#4b3020' : theme.ink[0];
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
      ctx.strokeStyle = theme.glow; ctx.lineWidth = 6.5;
      ctx.globalAlpha = .2;
      routedPath(displayPoints, offset); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = 'rgba(40,29,20,.13)'; ctx.shadowBlur = 1.5; ctx.shadowOffsetY = 1;
    ctx.strokeStyle = color; ctx.lineWidth = save.contrast ? 3.5 : 2.75;
    routedPath(displayPoints, offset); ctx.stroke();

    const tipPoint = displayPoints[displayPoints.length - 1];
    const tip = { x: tipPoint.x + offset.x + arrow.direction.x * 6.5, y: tipPoint.y + offset.y + arrow.direction.y * 6.5 };
    const back = { x: tip.x - arrow.direction.x * 8.5, y: tip.y - arrow.direction.y * 8.5 };
    const perp = { x: -arrow.direction.y, y: arrow.direction.x };
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(back.x + perp.x * 3.25, back.y + perp.y * 3.25);
    ctx.lineTo(back.x - perp.x * 3.25, back.y - perp.y * 3.25);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  function drawBackground(now) {
    ctx.fillStyle = save.contrast ? '#fbf7ef' : '#f7f1e7';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    const gridGap = level?.gap || 18;
    const gridOriginX = level ? ((level.x0 % gridGap) + gridGap) % gridGap : 18;
    const gridOriginY = level ? ((level.y0 % gridGap) + gridGap) % gridGap : 18;
    ctx.fillStyle = save.contrast ? 'rgba(50,43,36,.29)' : level?.isBoss ? 'rgba(139,91,26,.24)' : 'rgba(72,61,50,.20)';
    const dotRadius = save.contrast ? 1 : .86;
    for (let y = gridOriginY; y < H; y += gridGap) {
      for (let x = gridOriginX; x < W; x += gridGap) {
        ctx.beginPath(); ctx.arc(x, y, dotRadius, 0, TAU); ctx.fill();
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
    if (state !== 'playing' || !level || lives <= 0 || level.arrows.some(arrow => arrow.animation?.type === 'shake')) return;
    const rect = els.canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left - els.canvas._offsetX) / els.canvas._scale,
      y: (event.clientY - rect.top - els.canvas._offsetY) / els.canvas._scale
    };
    if (point.x < 0 || point.x > W || point.y < 0 || point.y > H) return;
    const arrow = hitArrow(point);
    if (!arrow) return;
    event.preventDefault();
    launchArrow(arrow);
  }

  function launchArrow(arrow) {
    if (!arrow || arrow.released || arrow.animation) return;
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
      sound('success'); haptic(11);
    } else {
      runningAnimation = true;
      lives--; mistakes++; streak = 0;
      arrow.animation = { type: 'shake', start: performance.now(), duration: 430 };
      sound(lives ? 'error' : 'fail'); haptic([34, 35, 34]);
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
      score += (level.isBoss ? 3000 : 500) + (mistakes === 0 ? (level.isBoss ? 1200 : 500) : 0) + lives * 100;
      completionPending = true;
      commitLevelCompletion();
      completionTimer = setTimeout(completeLevel, 480);
    }
  }

  function commitLevelCompletion() {
    if (completionCommitted || testingPreview) return;
    completionCommitted = true;
    save.cleared++;
    if (level.isBoss) {
      save.bosses++;
      save.bossPending = false;
      save.level = level.number + 1;
      els.nextLabel.textContent = 'Continue journey';
    } else if (level.number % 10 === 0) {
      save.bossPending = true;
      save.level = level.number;
      els.nextLabel.textContent = 'Face the boss';
    } else {
      save.level = level.number + 1;
      els.nextLabel.textContent = 'Next artwork';
    }
    if (!mistakes) save.perfect++;
    save.best = Math.max(save.best, save.level);
    persist();
    updateMenu();
  }

  function completeLevel() {
    if (completionPresented || !level || !level.arrows.every(arrow => arrow.released)) return;
    completionPresented = true;
    completionPending = false;
    clearTimeout(completionTimer);
    completionTimer = 0;
    sound('complete'); haptic([18, 40, 18, 40, 45]);
    els.resultScore.textContent = score.toLocaleString();
    els.resultMoves.textContent = moves;
    els.resultMistakes.textContent = mistakes;
    els.resultStreak.textContent = bestStreak;
    els.resultEyebrow.textContent = level.isBoss ? 'BOSS CONQUERED' : 'ARTWORK UNTANGLED';
    els.resultTitle.textContent = level.isBoss ? 'A magnificent victory.' : 'Beautifully done.';
    if (testingPreview) {
      els.nextLabel.textContent = 'Next test level';
      makeConfetti(level.isBoss ? 42 : 24);
      showModal(els.successModal);
      return;
    }
    commitLevelCompletion();
    makeConfetti(level.isBoss ? 42 : 24);
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
    if (state !== 'playing' || level.arrows.some(arrow => arrow.animation?.type === 'shake')) return;
    if (level.isBoss && hintsRemaining <= 0) {
      toast('No hints available for this boss', 1700);
      sound('error');
      haptic(18);
      return;
    }
    const safe = level.arrows.filter(a => !a.released && !a.animation && blockersFor(a).length === 0);
    if (!safe.length) return;
    if (level.isBoss) {
      hintsRemaining -= 1;
      updateHintButton();
    }
    hintArrow = safe[Math.floor(Math.random() * safe.length)]; hintUntil = performance.now() + 2500;
    toast('This arrow can escape', 1700); sound('hint'); haptic(8);
  }

  function updateHintButton() {
    if (!level?.isBoss) {
      els.hintTitle.textContent = 'Need a hint?';
      els.hintDetail.textContent = 'Reveal a free arrow';
      els.hint.classList.remove('depleted');
      return;
    }

    if (hintsRemaining > 0) {
      els.hintTitle.textContent = `${hintsRemaining} ${hintsRemaining === 1 ? 'hint' : 'hints'} left`;
      els.hintDetail.textContent = 'Boss assistance';
    } else {
      els.hintTitle.textContent = 'No hints';
      els.hintDetail.textContent = 'Boss rules';
    }
    els.hint.classList.toggle('depleted', hintsRemaining <= 0);
  }

  function cycleTheme() {
    save.theme = (save.theme + 1) % themes.length; persist();
    if (level) level.arrows.forEach((arrow, i) => arrow.colorIndex = (i * 2 + level.number) % themes[save.theme].ink.length);
    toast(`${themes[save.theme].name} palette`, 1100); sound('tap');
  }

  function makeConfetti(count = 24) {
    els.confetti.innerHTML = '';
    const colors = ['#e56c50', '#3f827b', '#d3a65e', '#8d6b8c'];
    for (let i = 0; i < count; i++) {
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
      const ac = audioContext;
      if (ac.state === 'suspended') ac.resume();
      if (!audioMaster) {
        audioMaster = ac.createGain();
        const compressor = ac.createDynamicsCompressor();
        audioMaster.gain.value = .9;
        compressor.threshold.value = -18;
        compressor.knee.value = 18;
        compressor.ratio.value = 7;
        compressor.attack.value = .003;
        compressor.release.value = .2;
        audioMaster.connect(compressor).connect(ac.destination);
      }
      const cues = {
        tap: [
          { from: 350, to: 410, length: .055, volume: .065 }
        ],
        start: [
          { from: 280, to: 360, length: .09, volume: .075, wave: 'triangle' },
          { from: 440, to: 560, length: .15, volume: .09 }
        ],
        success: [
          { from: 520, to: 790, length: .095, volume: .105, wave: 'triangle' },
          { from: 840, to: 1180, length: .16, volume: .1 }
        ],
        error: [
          { from: 220, to: 135, length: .16, volume: .12, wave: 'square' },
          { from: 145, to: 105, length: .15, volume: .09, wave: 'triangle' }
        ],
        fail: [
          { from: 270, to: 155, length: .2, volume: .12, wave: 'sawtooth' },
          { from: 160, to: 76, length: .36, volume: .13, wave: 'triangle' },
          { from: 105, to: 58, length: .42, volume: .095, wave: 'sine' }
        ],
        hint: [
          { from: 610, to: 710, length: .08, volume: .075 },
          { from: 840, to: 980, length: .14, volume: .085 }
        ],
        complete: [
          { from: 523.25, to: 523.25, length: .14, volume: .105, wave: 'triangle', at: 0 },
          { from: 659.25, to: 659.25, length: .15, volume: .11, wave: 'triangle', at: .11 },
          { from: 783.99, to: 783.99, length: .17, volume: .115, wave: 'triangle', at: .22 },
          { from: 1046.5, to: 1046.5, length: .25, volume: .125, wave: 'triangle', at: .33 },
          { from: 130.81, to: 130.81, length: .64, volume: .06, wave: 'triangle', at: .48 },
          { from: 523.25, to: 523.25, length: .62, volume: .06, wave: 'sine', at: .48 },
          { from: 659.25, to: 659.25, length: .62, volume: .062, wave: 'sine', at: .48 },
          { from: 783.99, to: 783.99, length: .66, volume: .068, wave: 'sine', at: .48 },
          { from: 1046.5, to: 1046.5, length: .72, volume: .105, wave: 'sine', at: .48 }
        ]
      };
      const noiseCues = {
        success: { length: .09, volume: .055, frequency: 1900, filter: 'highpass' },
        error: { length: .1, volume: .07, frequency: 520, filter: 'lowpass' },
        fail: { length: .22, volume: .085, frequency: 280, filter: 'lowpass' }
      };
      const notes = cues[type] || cues.tap;
      const cueStart = ac.currentTime + .005;
      let cursor = cueStart;
      const noiseCue = noiseCues[type];
      if (noiseCue) {
        const frameCount = Math.max(1, Math.floor(ac.sampleRate * noiseCue.length));
        const buffer = ac.createBuffer(1, frameCount, ac.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frameCount, 2.2);
        const source = ac.createBufferSource(), filter = ac.createBiquadFilter(), gain = ac.createGain();
        source.buffer = buffer;
        filter.type = noiseCue.filter;
        filter.frequency.value = noiseCue.frequency;
        gain.gain.setValueAtTime(noiseCue.volume, cursor);
        gain.gain.exponentialRampToValueAtTime(.0001, cursor + noiseCue.length);
        source.connect(filter).connect(gain).connect(audioMaster);
        source.start(cursor); source.stop(cursor + noiseCue.length + .01);
      }
      notes.forEach(note => {
        const noteStart = note.at === undefined ? cursor : cueStart + note.at;
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.type = note.wave || 'sine';
        osc.frequency.setValueAtTime(note.from, noteStart);
        osc.frequency.exponentialRampToValueAtTime(note.to, noteStart + note.length);
        gain.gain.setValueAtTime(.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(note.volume, noteStart + .014);
        gain.gain.exponentialRampToValueAtTime(.0001, noteStart + note.length);
        osc.connect(gain).connect(audioMaster);
        osc.start(noteStart); osc.stop(noteStart + note.length + .025);
        if (note.at === undefined) cursor += note.length * .64;
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

  els.play.addEventListener('click', () => startGame(save.level, save.bossPending));
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
  els.next.addEventListener('click', () => testingPreview ? previewNextMilestone() : startGame(save.level, save.bossPending));
  els.testNext.addEventListener('click', previewNextMilestone);
  els.menuSettings.addEventListener('click', () => showModal(els.settingsModal));
  els.settingsClose.addEventListener('click', () => { closeModal(); state = els.menu.classList.contains('active') ? 'menu' : 'playing'; });
  els.sound.addEventListener('click', () => { save.sound = !save.sound; persist(); updateSettings(); sound('tap'); });
  els.haptic.addEventListener('click', () => { save.haptics = !save.haptics; persist(); updateSettings(); haptic(12); });
  els.contrast.addEventListener('click', () => { save.contrast = !save.contrast; persist(); updateSettings(); });
  els.canvas.addEventListener('pointerdown', canvasPointer, { passive: false });
  window.addEventListener('resize', resizeCanvas);
  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(els.shell);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing' && !completionPending) showModal(els.pauseModal);
    else if (!document.hidden && completionPending) completeLevel();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (els.backdrop.classList.contains('show')) closeModal();
      else if (state === 'playing') showModal(els.pauseModal);
    }
    if (event.key.toLowerCase() === 'h') useHint();
    if (event.key.toLowerCase() === 'r' && state === 'playing') restartLevel();
  });

  function validateGenerated(number, bossMode = false) {
    const generated = makeLevel(number, 0, bossMode);
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
