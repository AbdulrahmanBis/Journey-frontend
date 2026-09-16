# Styling

The app is styled with **Bootstrap 5.3**, themed to the DigiNation palette, in English and Arabic.
There is no hand-rolled design system alongside it — `npm run audit:styles` enforces that.

## Where things live

| File | What goes in it |
|---|---|
| `src/theme/_variables.scss` | **The only place colours, fonts, radii and shadows are defined.** Bootstrap variable overrides. |
| `src/theme/_colors.scss` | App colours added to Bootstrap's theme map: statuses (`new`, `reflect`, `response`, `completed`, `cancelled`), roles (`admin`, `manager`, `hr`, `senior`, `learner`), `navy`. |
| `src/theme/_maps.scss` | Their soft ("subtle") backgrounds and emphasis text. |
| `src/theme/bootstrap.scss` | The Bootstrap build. Not imported by Angular — see below. |
| `src/theme/_tokens.scss` | Bootstrap functions/variables/mixins with no CSS output, for a component that needs a breakpoint mixin. |
| `src/theme/generated/` | Built output, committed. **Never edit by hand.** |
| `src/styles.scss` | Only what Bootstrap has no equivalent for: page eyebrow/title, avatars, brand mark, `.user-content`, `.ltr-data`, sign-in screen, Arabic typography. |
| `*.component.scss` | Only what is genuinely unique to that component (the journey rail, the Quill overrides). |

## Why Bootstrap is built by a script

Bootstrap does not use logical properties; its right-to-left support is a **second stylesheet**
made by running the compiled CSS through RTLCSS. The Angular CLI cannot turn one stylesheet into
two, so `scripts/build-theme.mjs` does:

```
src/theme/bootstrap.scss ──sass──► generated/bootstrap.ltr.css
                                 └─rtlcss──► generated/bootstrap.rtl.css
```

Both are bundled by `angular.json` without being injected. `index.html` writes both `<link>`s before
first paint, disabled according to the saved language, and `LanguageService` swaps them when the
language changes — instantly, with no reload and no flash of the wrong direction.

`npm start` and `npm run build` rebuild the theme first. While editing theme files, run
`npm run theme:watch` alongside `ng serve`.

## Rules

1. **Use a Bootstrap class before writing CSS.** Layout (`d-flex`, `gap-3`, `row`/`col`), spacing
   (`mt-3`, `px-2`), text (`small`, `fw-semibold`, `text-body-secondary`), components (`card`,
   `btn`, `form-control`, `badge`, `table`, `list-group`).
2. **No colour literals.** Use `var(--bs-primary)`, `var(--bs-border-color)`,
   `var(--bs-completed)`… A new colour goes in `_variables.scss` and, if it should get utility
   classes, `_colors.scss` + `_maps.scss`.
3. **No inline `style=""`.** Dynamic `[style.width.%]` for a computed value is fine.
4. **Logical properties only** in app styles: `margin-inline-start`, `padding-inline-end`,
   `inset-inline-start`, `border-inline-start`, `text-align: start`. Only Bootstrap goes through
   RTLCSS; anything we write must mirror on its own. In templates, Bootstrap's `ms-*`, `me-*`,
   `start-*`, `end-*`, `text-start` are fine — the RTL build flips them.
5. **Author text gets `.user-content`** (journey titles, descriptions, notes, prompts, answers). It
   is in whatever language the author typed, not the UI language.
6. **Genuinely left-to-right data gets `.ltr-data`** (emails, ids, bare numbers) — never a sentence
   that merely contains a number.

## Shared pieces

| Need | Use |
|---|---|
| A status or role chip | `<span class="badge rounded-pill" [ngClass]="statusChipClass(s)">` / `roleChipClass(r)` |
| A status badge with a dot | `<app-status-badge [status]="…">` |
| A toggle pair / status pills | `class="btn btn-sm rounded-pill" [ngClass]="toggleButtonClass(active, 'completed')"` |
| A learner's journey as a card | `<app-journey-card [view]="…" (opened)="…">` |
| A dialog | `<app-modal [open]="…" (dismissed)="…">` with actions in `<div modal-actions>` |
| A yes/no confirmation | `<app-confirm-dialog>` |
| Empty state | `<div class="card text-center text-body-secondary py-5 px-4">` |
| Page header | `.page-eyebrow` + `h1.page-title` + `p.text-body-secondary.mt-1` |

Modals, dropdowns and toasts use Bootstrap's **markup** with Angular owning their open state, so no
Bootstrap JavaScript is loaded.

## The audit

```bash
npm run audit:styles
```

Fails on: pre-Bootstrap tokens (`var(--brand)`…), colour literals, inline styles, left/right
properties in app styles, classes no stylesheet defines, pre-Bootstrap class names, and a stale
generated theme. It must report **clean** before a change is merged. At the end of the Bootstrap
migration it went from 805 violations to 0.
