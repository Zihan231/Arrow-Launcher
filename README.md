# Arrow Launcher

A relaxing, mobile-first endless puzzle game built with pure HTML5 Canvas, Vanilla CSS, and JavaScript. Zero external runtime dependencies.

The interface seamlessly adapts across mobile phones, tablets, landscape screens, and desktop displays with responsive glassmorphic UI rails while preserving the puzzle board's aspect ratio.

---

## 🚀 Quick Start

Open `index.html` directly in any modern browser, or launch with any local static server:

```sh
npx serve .
```

---

## 📁 Source Code Architecture

| File | Type | Description |
| :--- | :--- | :--- |
| **[`index.html`](file:///c:/My%20projects/Games/Arrow-Launcher/index.html)** | Structure | Semantic HTML5 markup, screen layouts (Menu & Game HUD), modals (Tutorial Lesson, Pause, Settings, Victory, Defeat), and SVG icons. |
| **[`game.js`](file:///c:/My%20projects/Games/Arrow-Launcher/game.js)** | Logic | Complete game engine: procedural silhouette maze carving, dependency graph solver, physics simulation, hold-to-preview trajectory helper, Web Audio API sound synthesizers, input manager, and `localStorage` persistence. |
| **[`styles.css`](file:///c:/My%20projects/Games/Arrow-Launcher/styles.css)** | Styling | Custom design system: CSS variables, warm parchment textures, glassmorphism, responsive breakpoints, animations, and high-contrast accessibility mode. |
| **[`icon.svg`](file:///c:/My%20projects/Games/Arrow-Launcher/icon.svg)** | Asset | 512×512 authentic non-overlapping vector app icon and browser favicon. |
| **[`logo.svg`](file:///c:/My%20projects/Games/Arrow-Launcher/logo.svg)** | Asset | Scalable non-overlapping branding logo with editorial typography. |

---

## 🎮 Gameplay & Rules

- **Tap to Launch**: Tap an unblocked arrow to launch its entire path forward off the board.
- **Collisions**: If an arrow strikes another path, it rebounds to its starting position and costs one life (heart ♥).
- **Hold to Preview (Trajectory Helper)**:
  - **Press & Hold (>= 200ms)** on any arrow to project its forward path.
  - **Red Beam**: Indicates the path collides with an obstacle arrow.
  - **Green Beam**: Indicates a safe escape route off the board.
  - **Release**: Cancels the preview without launching the arrow.
- **Boss Levels**: Every 10th level unlocks a mandatory Boss Art piece with maximum path complexity, tighter grids, and higher dependency depth.
- **Interactive Lesson**: First-time players land on a quick visual lesson followed by a hands-on **4-move practice level** before advancing to Level 1.

---

## ⌨️ Controls

- **Tap / Click**: Launch arrow (quick tap)
- **Hold (Touch/Mouse)**: Trajectory preview helper (Green = Safe, Red = Blocked)
- **H**: Use hint (highlights a free arrow)
- **R**: Restart current level
- **Esc**: Pause / resume game

---

## 💾 Progress & Persistence

All player data (highest level, cleared count, perfect completions, settings, sound toggles, and lesson progress) is saved locally in `localStorage`.
