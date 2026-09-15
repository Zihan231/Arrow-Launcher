# Arrow Launcher

A mobile-first, endless Canvas puzzle game built with HTML, CSS, and vanilla JavaScript.

The interface adapts across small phones, landscape devices, tablets, laptops, and large desktop displays. Wide screens use dedicated information and control rails while the puzzle canvas keeps its original proportions.

## Run

Open `index.html` directly, or serve the folder with any static web server:

```sh
npx serve .
```

## Gameplay

Tap a curved arrow to launch its entire path in the direction of its head. If another path blocks its travel lane, the arrow returns and one life is lost. Remove every arrow to reveal the next procedural artwork.

Every ten normal levels unlock a separate mandatory Boss Level with an exclusive silhouette, maximum path complexity, tighter spacing, and denser coverage. The next normal level remains locked until its boss is defeated.

Difficulty rises continuously through higher arrow-count targets, denser silhouette coverage, longer paths, more turns, tighter grids, and deeper removal dependencies. Normal arrows can grow to 30 grid points, while boss arrows can reach 45. Boss difficulty also scales with the boss number: later bosses target up to 76 arrows, while lives fall from three to one and hints fall from two to none.

The in-game `TEST` button previews milestone content in this order: Level 10 → Boss 1 → Level 20 → Boss 2, continuing indefinitely. Test previews never modify saved progression.

Progress, settings, best level, completions, and perfect clears are saved in `localStorage`.

## Controls

- Tap/click an arrow: launch
- `H`: hint
- `R`: restart
- `Esc`: pause/resume

All artwork and puzzle geometry are procedurally drawn on the Canvas; there are no external runtime assets or dependencies.
