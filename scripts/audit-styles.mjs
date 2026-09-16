// Style audit — proves the app is on Bootstrap everywhere, not just on new screens.
//
//   node scripts/audit-styles.mjs            report and exit 1 on any violation
//   node scripts/audit-styles.mjs --summary  counts per rule only
//
// Rules:
//   legacy-token     var(--brand), var(--text-muted), var(--status-…) … the pre-Bootstrap design
//                    tokens. Components use Bootstrap's --bs-* custom properties instead.
//   colour-literal   #hex / rgb() / hsl() outside src/theme/_variables.scss. rgba(var(--bs-…-rgb), a)
//                    is allowed: it is a theme token with an alpha.
//   inline-style     static style="…" in a template. Dynamic [style.x] bindings for genuinely
//                    computed values (a progress width) are fine.
//   physical-side    margin-left, padding-right, left:, text-align: right … in app styles. These
//                    do not mirror in Arabic; use the logical equivalents (margin-inline-start,
//                    inset-inline-end, text-align: start).
//   unknown-class    a class in a template that no stylesheet defines — Bootstrap, the global
//                    styles, or that component's own styles. Catches leftovers and typos.
//   legacy-class     a pre-Bootstrap class with a Bootstrap equivalent (btn-ghost, field, muted…),
//                    even if something re-defined it.
//   stale-theme      src/theme/generated is out of date with src/theme.
//
// A line can opt out of physical-side or colour-literal with a trailing comment that says why:
//   left: 0; right: 0;  /* audit-allow: full-width overlay, symmetric */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');
const read = (p) => fs.readFileSync(p, 'utf8');

function walk(dir, exts, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

const appDir = path.join(root, 'src', 'app');
const globalScss = path.join(root, 'src', 'styles.scss');
const themeVariables = path.join(root, 'src', 'theme', '_variables.scss');
const bootstrapCss = path.join(root, 'src', 'theme', 'generated', 'bootstrap.ltr.css');
const quillCss = path.join(root, 'node_modules', 'quill', 'dist', 'quill.snow.css');

const violations = [];
const report = (rule, file, line, detail) => violations.push({ rule, file: rel(file), line, detail });

// ---------------------------------------------------------------------------------------------
// Sources

const templates = walk(appDir, ['.html']);
const componentStyles = walk(appDir, ['.scss']);
const componentTs = walk(appDir, ['.component.ts']);

/** Inline `template:` and `styles:` blocks inside component .ts files. */
function inlineBlocks(tsFile) {
  const src = read(tsFile);
  const template = src.match(/template:\s*`([\s\S]*?)`/);
  const styles = [...src.matchAll(/styles:\s*\[\s*`([\s\S]*?)`/g)].map((m) => m[1]);
  return { template: template ? template[1] : null, styles: styles.join('\n') };
}

/** Lines of a text with 1-based numbers, skipping comment-only lines. */
function lines(text) {
  return text.split(/\r?\n/).map((t, i) => ({ t, n: i + 1 }));
}

const allowed = (t) => /audit-allow:/.test(t);

// ---------------------------------------------------------------------------------------------
// legacy-token, colour-literal, physical-side — over every app stylesheet and inline style

const LEGACY_TOKEN =
  /var\(\s*--(navy|navy-deep|ink|ink-soft|brand|brand-dark|brand-soft|brand-tint|bg|surface|surface-raised|border|border-strong|text|text-muted|text-faint|text-on-ink|text-on-ink-muted|status-[\w-]*|role-[\w-]*|font-display|font-body|font-mono|radius-sm|radius-md|radius-lg|shadow-sm|shadow-md|shadow-lg|ease|pill-color)\b/;
const LEGACY_TOKEN_DYNAMIC = /--(status|role)-['"`]\s*\+|--pill-color/;
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/;
const COLOUR_OK = /rgba?\(\s*var\(--bs-[\w-]+-rgb\)/g;
const PHYSICAL =
  /\b(margin|padding|border)-(left|right)\b|(^|[\s;{])(left|right)\s*:|text-align\s*:\s*(left|right)\b|float\s*:\s*(left|right)\b|border-(top|bottom)-(left|right)-radius/;

function scanStyles(file, text, offset = 0) {
  let inComment = false;
  for (const { t, n } of lines(text)) {
    const line = n + offset;
    // Strip block comments so explanations can mention old names.
    let code = t;
    if (inComment) {
      const end = code.indexOf('*/');
      if (end === -1) continue;
      code = code.slice(end + 2);
      inComment = false;
    }
    code = code.replace(/\/\*.*?\*\//g, '');
    const open = code.indexOf('/*');
    if (open !== -1) { code = code.slice(0, open); inComment = true; }
    code = code.replace(/\/\/.*$/, '');
    if (!code.trim()) continue;

    if (LEGACY_TOKEN.test(code) || LEGACY_TOKEN_DYNAMIC.test(code)) report('legacy-token', file, line, t.trim());
    if (!allowed(t) && COLOUR.test(code.replace(COLOUR_OK, ''))) report('colour-literal', file, line, t.trim());
    if (!allowed(t) && PHYSICAL.test(code)) report('physical-side', file, line, t.trim());
  }
}

for (const f of [globalScss, ...componentStyles]) scanStyles(f, read(f));
for (const f of componentTs) {
  const { styles } = inlineBlocks(f);
  if (styles) scanStyles(f, styles);
}

// Legacy tokens can also hide in template bindings: [style.--pill-color]="'var(--status-' + …"
for (const f of [...templates, ...componentTs]) {
  const text = f.endsWith('.ts') ? inlineBlocks(f).template : read(f);
  if (!text) continue;
  for (const { t, n } of lines(text)) {
    if (LEGACY_TOKEN.test(t) || LEGACY_TOKEN_DYNAMIC.test(t)) report('legacy-token', f, n, t.trim());
    if (/\sstyle="/.test(t)) report('inline-style', f, n, t.trim());
    const styleBinding = t.match(/\[style[.\w-]*\]="([^"]*)"/);
    if (styleBinding && COLOUR.test(styleBinding[1].replace(COLOUR_OK, ''))) {
      report('colour-literal', f, n, t.trim());
    }
  }
}

// ---------------------------------------------------------------------------------------------
// unknown-class, legacy-class

/** Every class selector defined in a stylesheet (CSS or SCSS source). */
function definedClasses(text) {
  const set = new Set();
  // Drop comments, url(...) and strings first so data URIs and quoted text do not look like
  // selectors. Comments go first: an apostrophe in prose ("sentence's") would otherwise open a
  // "string" that swallows every rule up to the next quote. Strings never span lines in CSS.
  const cleaned = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/url\([^)]*\)/g, '')
    .replace(/"[^"\n]*"|'[^'\n]*'/g, '');
  for (const m of cleaned.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) set.add(m[1]);
  // SCSS parent-suffix selectors: .bell { &-item {} } defines .bell-item
  for (const m of cleaned.matchAll(/\.([_a-zA-Z][\w-]*)\s*\{[^{}]*?&-([\w-]+)/g)) set.add(`${m[1]}-${m[2]}`);
  return set;
}

const globalClasses = new Set([
  ...definedClasses(fs.existsSync(bootstrapCss) ? read(bootstrapCss) : ''),
  ...definedClasses(read(globalScss)),
  ...definedClasses(fs.existsSync(quillCss) ? read(quillCss) : ''),
]);

const LEGACY_CLASSES = new Set([
  'card-pad', 'card-hover', 'btn-ghost', 'btn-icon', 'btn-block', 'btn-ink',
  'field', 'hint', 'field-error', 'input', 'textarea', 'select', 'select-sm',
  'flex', 'flex-col', 'gap-8', 'gap-12', 'gap-16', 'items-center', 'justify-between', 'w-full',
  'muted', 'faint', 'mono', 'divider', 'modal-panel', 'toast-stack',
  'page-head', 'page-sub', 'stat-strip', 'journey-grid', 'pill', 'status-override',
  'user-table', 'tag', 'role-chip',
]);

/** Template classes: static class="…" tokens and [class.x] names. Dynamic [class]/[ngClass] are listed separately. */
function templateClasses(text) {
  const found = [];
  for (const { t, n } of lines(text)) {
    for (const m of t.matchAll(/(?<![\w\[.-])class="([^"]*)"/g)) {
      for (const c of m[1].split(/\s+/)) if (c && !/[{}()'"$+|]/.test(c)) found.push({ c, n });
    }
    for (const m of t.matchAll(/\[class\.([\w-]+)\]/g)) found.push({ c: m[1], n });
    // Literal class names inside [ngClass]/[class] expressions, e.g. [class]="'btn-' + x" is skipped,
    // but { 'is-active': cond } is checked.
    for (const m of t.matchAll(/\[(?:ngClass|class)\]="([^"]*)"/g)) {
      for (const k of m[1].matchAll(/'([\w-]+)'\s*:/g)) found.push({ c: k[1], n });
    }
  }
  return found;
}

function componentStylesFor(file) {
  const base = file.replace(/\.(html|ts)$/, '');
  const scss = `${base}.scss`;
  const ts = `${base}.ts`;
  let text = fs.existsSync(scss) ? read(scss) : '';
  if (fs.existsSync(ts)) text += inlineBlocks(ts).styles;
  return definedClasses(text);
}

const dynamicClassBindings = [];
for (const f of [...templates, ...componentTs]) {
  const text = f.endsWith('.ts') ? inlineBlocks(f).template : read(f);
  if (!text) continue;
  const own = componentStylesFor(f);
  for (const { c, n } of templateClasses(text)) {
    if (LEGACY_CLASSES.has(c)) report('legacy-class', f, n, c);
    else if (!globalClasses.has(c) && !own.has(c)) report('unknown-class', f, n, c);
  }
  for (const { t, n } of lines(text)) {
    if (/\[(class|ngClass)\]="[^"]*\+/.test(t)) dynamicClassBindings.push(`${rel(f)}:${n}`);
  }
}

// ---------------------------------------------------------------------------------------------
// stale-theme

try {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'build-theme.mjs'), '--check'], { stdio: 'pipe' });
} catch {
  report('stale-theme', path.join(root, 'src', 'theme', 'generated'), 0, 'run: npm run theme');
}

// ---------------------------------------------------------------------------------------------
// Output

const byRule = {};
for (const v of violations) (byRule[v.rule] ||= []).push(v);

const summaryOnly = process.argv.includes('--summary');
const RULES = ['legacy-token', 'colour-literal', 'inline-style', 'physical-side', 'unknown-class', 'legacy-class', 'stale-theme'];
for (const rule of RULES) {
  const list = byRule[rule] || [];
  console.log(`${list.length === 0 ? '✔' : '✘'} ${rule.padEnd(15)} ${list.length}`);
  if (!summaryOnly) for (const v of list) console.log(`    ${v.file}:${v.line}  ${v.detail}`);
}
if (!summaryOnly && dynamicClassBindings.length) {
  console.log(`\n  (not checked — computed class names, review by hand: ${dynamicClassBindings.join(', ')})`);
}
console.log(violations.length === 0 ? '\nstyle audit: clean' : `\nstyle audit: ${violations.length} violation(s)`);
process.exit(violations.length === 0 ? 0 : 1);
