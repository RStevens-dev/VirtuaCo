# VirtuaCo — Warehouse 01

Big Box Bulk Retailer VR Experience.

An independent, browser-based, first-person warehouse shopping concept inspired by the discovery and scale of big-box bulk retail. All products, packaging, prices and stock are illustrative. VirtuaCo is not affiliated with Costco or any retailer; no payments, real inventory or accounts.

## Play
GitHub Pages (after the repository owner enables it): https://rstevens-dev.github.io/VirtuaCo/

From this repository's **Settings → Pages**, select **Deploy from a branch → main → / (root) → Save**. The project contains only static files and requires no build or paid hosting. GitHub Pages is intended here for an unpaid, noncommercial demo.

To run locally, from the repository root:
```sh
python3 -m http.server 8000
```
Open http://localhost:8000. A WebGL-capable browser and an internet connection to the pinned Three.js CDN are required. Opening index.html directly with file:// may fail due to module restrictions.

## Controls
| Desktop | Action |
| --- | --- |
| WASD / arrows | Move |
| Mouse / drag | Look around |
| Shift | Walk faster |
| E / click | Inspect product or price placard |
| M | Map and department teleport |
| F | Find products and navigate to displays |
| B | Basket |
| H | Help |
| Esc | Release mouse / close panel |

Touch devices have a directional pad, drag-to-look and Inspect button. Browser compatibility and performance depend on hardware. This is a flat-screen 3D experience, not a WebXR headset implementation.

## Warehouse design

The supplied hand-drawn reference floor plan is represented by 82 departments and 371 fixtures in a 132 × 77 meter fictional building. The entrance is at the upper right, matching the updated Coomera reference. All 40 numbered aisles (100–115 and 300–323) are represented. The central seasonal area, checkout, electronics, furniture, produce, bakery, meat, pharmacy, restrooms, food court and service counters preserve the reference's relative arrangement.

Pallet racks are procedural modules:
- Green steel upright frames, punched holes, base plates, diagonal braces and orange horizontal beams.
- **Bottom:** wooden pallets with open-top corrugated trays, carton stacks and visible gaps reflecting simulated inventory.
- **Second level:** customer-facing hero products and white price placards. These are interactive.
- **Upper levels:** deterministic assorted surplus cartons, legacy-style products and fictional archive finds. These are decorative rather than shoppable.

Cold cases, flat display tables, furniture, electronics and service counters have their own geometry. The warehouse uses instanced rendering for repeated parts, generated textures, an industrial shell and simple warehouse lighting. Package art is procedural placeholder artwork. Optional CC0 models add a reusable water bottle and cut avocado to select displays. See ASSET_CREDITS.md.

## Inventory signals

The catalog has 81 fictional SKUs. The in-memory stock map is the single source of truth for the visualizer. Product details expose a 0–120 unit slider. Adjusting a rack SKU rebuilds its bottom displays across the warehouse, not its hero shelf or decorative surplus.

| Units | Bottom display |
| --- | --- |
| 0 | Empty pallet |
| 1–19 | Sparse open tray or carton |
| 20–59 | Partial pallet |
| 60–120 | Full pallet stacks and trays |

The visualizer's thresholds are illustrative and not calibrated to real case packs. To integrate authorized inventory data later, replace the simulated values with a provider and invoke `setStock(id, units)`; keep credentials and any private provider calls on a backend, never in the browser. Display freshness and availability disclaimers before enabling real data. For non-rack fixtures the stock state appears in the inspector but does not change floor geometry.

The basket is a local, persistent simulation. It does not decrement warehouse stock, send data, or submit orders. Inventory edits reset on reload.

## Files
- `index.html` — app shell, welcome experience, controls, accessibility labels
- `style.css` — responsive interface
- `world.js` — reference-map layout, fixtures, product catalog, stock-state rules, deterministic random generator
- `assets.js` — optional licensed GLB registry and loader with fallback
- `main.js` — Three.js scene, geometry, rendering, inventory updates, movement, collision, interaction, map, search and basket
- `test/world.test.js` — geometry, reachability, catalog, stock thresholds and HUD regression tests
- `.nojekyll` — direct static Pages hosting

## Test
With Node.js 20+:
```sh
npm run check
```
There are no npm dependencies to install. The checks verify the fixture bounds, non-overlap, entrance connectivity, product placement coverage, deterministic randomness, inventory boundaries and HUD element references. They are not a substitute for testing actual WebGL rendering, touch controls and frame rate in a real browser.

## Roadmap
Real product photography and licensed product data; finer environmental detailing and audio; accessibility and mobile performance testing; multiple warehouse layouts; authorized inventory adapter; optional WebXR.
