# UX/UI Improvement Plan — Mostre!me

## High Impact

**1. Active nav state is missing**
The sidebar nav items have no `.active` class applied based on `request.path`. Users can't tell where they are inside Cultura or Eleições.

**2. Font size is too small for a data-heavy app**
`#meio` uses 13px. Tables use 14px headers at 14px base. This hurts readability when scanning dense civic data. Bumping the base to 15–16px would help significantly.

**3. Table min-width forces horizontal scroll on desktop too**
`.table { min-width: 880px }` — even on a 1024px screen with a 260px sidebar, the table overflows. Removing or lowering this, and letting columns be flexible, would help.

**4. Stale content hurts trust**
- `"Julho de 2014 · subversão v0.1"` is visible in the Cultura home card
- `"Copyfight 2014"` / `"Copyfight 2016"` in the footers
- These signal abandonment to first-time visitors. Even just updating the year matters.

---

## Medium Impact

**5. `cursor: crosshair` on logo/status/manifesto**
This is a leftover quirk. Users expect `pointer` on clickable things and `default` on static text. `crosshair` confuses intent.

**6. Heavy text-shadow on dark backgrounds**
`text-shadow: 2px 3px gray` / `4px 4px gray` on dark cards gives a boxy, dated feel. Removing or softening to `0 1px 2px rgba(0,0,0,0.4)` would modernize the look significantly.

**7. Loading spinner is a GIF**
`load.gif` works but looks old. A CSS spinner or Bootstrap's native spinner would be more consistent.

**8. `<p>` tag wrapping the D3 chart**
`%p#chart` — a paragraph tag holding an SVG chart is semantically wrong and may cause layout quirks. Use `%div#chart`.

**9. Ad placeholder has hardcoded `height:400px; width:200px`**
Even when hidden via `#ad:empty { display: none }`, the inline style can still cause layout flash. The CSS rule should be the sole authority.

**10. Footer `height: 21px`**
On desktop, `#rodape` is 21px tall with no padding — very cramped. Any text taller than that clips.

---

## Lower Impact / Polish

**11. Chevron icons on every nav item** (`bi-chevron-right.float-end`) add noise without value since these are plain links, not accordions.

**12. `.reorder` cursor is `n-resize`**
Sortable column headers use `n-resize` — this suggests vertical resize to users. `pointer` or a sort icon would be more intuitive.

**13. D3.js v3 is from 2012**
Still works, but upgrading to v7 would give much better responsive SVG handling and API improvements.

**14. No empty state for filtered results**
If filters return 0 rows, the table body is just empty. An explicit "Nenhum resultado encontrado" message would reduce confusion.

---

## Quick Wins (easiest to implement)

| Fix | Where |
|---|---|
| Update years in footers | `layouts/cultura.haml`, `layouts/eleicoes.haml` |
| Remove `cursor: crosshair` | `application.css` `.logo`, `.status`, `.manifesto` |
| Soften text-shadow | `application.css` `.titulo`, `.logo`, `.status` |
| Fix `%p#chart` → `%div#chart` | `cultura/index.haml` |
| Add active class to nav | Both layout files, using `request.path` |
| Increase `#meio` font-size to 15px | `application.css` |
