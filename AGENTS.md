# VirtuaCo engineering instructions

Adapted from [Ponytail](https://github.com/DietrichGebert/ponytail) and [Superpowers](https://github.com/obra/superpowers). These are project rules, not installed plugins.

## Workflow
- Read this file and the relevant implementation, tests and current CI results before editing.
- Trace the actual execution path. Reproduce a reported bug or obtain concrete evidence before proposing a fix.
- Define a small acceptance test and a scoped plan for nontrivial changes. User has delegated routine decisions; ask only when essential.
- Prefer existing code, browser capabilities, standard libraries and existing dependencies. Add the smallest maintainable solution. Never trade away validation, accessibility, security or error handling for brevity.
- For risky behavior, write a regression test, observe the intended failure, implement the fix, observe the pass, then refactor. Do not weaken tests to make them pass.
- Prefer a branch for risky or multi-file changes; inspect the diff and dependent code before merging. Avoid unrelated rewrites and overlapping deployments.
- Run npm run check and inspect fresh CI results for the exact revision. Browser behavior requires browser tests; physical iOS claims require real-device evidence. Syntax checks are not runtime tests.
- Report committed, deployed, tested and visually/device verified as separate states. Include remaining risks, skipped checks and evidence links. Never claim success based on an unobserved workflow.

## Product and warehouse invariants
- Only sourced real products are selectable. Never invent product IDs, prices, local availability or exact stock quantities.
- Orlando delivery listing evidence is distinct from South Orlando #1235 in-store stock. Keep source, timestamp, currency and price type.
- No arbitrary catalogue cap. Physical displays and memory residency are separately bounded. Exact 3D models require documented identity and reuse rights; genuine photos need suitable rights. Unmatched scans must remain inactive.
- Unbranded bottom cartons may represent explicitly simulated fullness; upper wrapped reserve pallets are decorative and independent of stock. Neither is a stock claim.
- Preserve mobile joystick and independent camera finger tracking; prevent stuck movement. Check iOS WebKit and desktop controls.
- Prefer batching, shared textures, bounded streaming and disposal. Measure frame rate, draw calls and memory where possible rather than asserting performance gains.
- Keep free GitHub Pages hosting and avoid adding paid services without approval.

## Review checklist
Check startup and zero-model states, empty/malformed catalogue inputs, unknown prices, touch cancellation, collision-free movement, image failures, GPU resource cleanup, and regression tests. Prioritize correctness, then measured performance, then polish. Record deferred work honestly.
