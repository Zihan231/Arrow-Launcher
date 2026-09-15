# Arrow Launcher

A mobile-first, endless Canvas puzzle game built with HTML, CSS, and vanilla JavaScript.

## Run

Open `index.html` directly, or serve the folder with any static web server:

```sh
npx serve .
```

## Gameplay

Tap a curved arrow to launch its entire path in the direction of its head. If another path blocks its travel lane, the arrow returns and one life is lost. Remove every arrow to reveal the next procedural artwork.

Progress, settings, best level, completions, and perfect clears are saved in `localStorage`.

## Controls

- Tap/click an arrow: launch
- `H`: hint
- `R`: restart
- `Esc`: pause/resume

All artwork and puzzle geometry are procedurally drawn on the Canvas; there are no external runtime assets or dependencies.
