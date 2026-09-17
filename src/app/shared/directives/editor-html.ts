/**
 * Tidies HTML from the Quill editor.
 *
 * Two things need fixing before the editor's markup can be shown anywhere else:
 *
 * <ul>
 *   <li>Quill 2 writes every space as `&nbsp;`, which stops text wrapping between words.</li>
 *   <li>Quill 2 writes *every* list as `<ol>` and marks each line with `data-list="bullet|ordered"`,
 *       nesting with `ql-indent-N` classes. Angular's sanitizer drops `data-list` on the way into
 *       [innerHTML], so a bulleted list arrived numbered and sub-steps lost their level. The list is
 *       rebuilt here as ordinary nested `<ul>` / `<ol>`, which survives sanitizing and needs no
 *       editor stylesheet.</li>
 * </ul>
 */

/** Restores ordinary spaces; a genuine run collapses to one, which HTML does anyway. */
export function cleanEditorHtml(html: string | null | undefined): string {
  return normalizeEditorHtml((html ?? '').replace(/&nbsp;/g, ' ')).trim();
}

/** Quill list markup → nested `<ul>` / `<ol>`. Anything else is returned untouched. */
export function normalizeEditorHtml(html: string | null | undefined): string {
  const source = html ?? '';
  if (!source.includes('data-list')) return source;
  if (typeof document === 'undefined') return source;

  const holder = document.createElement('div');
  holder.innerHTML = source;
  holder.querySelectorAll('ol').forEach(rebuildList);
  return holder.innerHTML;
}

/** Indent level from the `ql-indent-N` class Quill puts on a nested line. */
function levelOf(item: Element): number {
  const match = /ql-indent-(\d+)/.exec(item.className);
  return match ? Number(match[1]) : 0;
}

function rebuildList(list: HTMLOListElement): void {
  const items = Array.from(list.children).filter((child) => child.tagName === 'LI');
  if (!items.some((item) => item.hasAttribute('data-list'))) return;

  const fragment = document.createDocumentFragment();
  // One entry per open level: the list element that items of that level are appended to.
  const open: { level: number; kind: string; element: HTMLElement }[] = [];

  for (const item of items) {
    const kind = item.getAttribute('data-list') === 'bullet' ? 'ul' : 'ol';
    const level = levelOf(item);

    while (open.length && (open[open.length - 1].level > level
      || (open[open.length - 1].level === level && open[open.length - 1].kind !== kind))) {
      open.pop();
    }

    if (!open.length || open[open.length - 1].level < level) {
      const nested = document.createElement(kind);
      const parent = open[open.length - 1];
      if (parent) {
        // A deeper level belongs inside the line above it.
        (parent.element.lastElementChild ?? parent.element).appendChild(nested);
      } else {
        fragment.appendChild(nested);
      }
      open.push({ level, kind, element: nested });
    }

    const line = document.createElement('li');
    line.innerHTML = item.innerHTML;
    open[open.length - 1].element.appendChild(line);
  }

  list.replaceWith(fragment);
}
