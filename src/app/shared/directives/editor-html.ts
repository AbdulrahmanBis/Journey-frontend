/**
 * Tidies HTML from the Quill editor before it is saved.
 *
 * Quill 2 writes every space as `&nbsp;`, which stops text from wrapping between words. Ordinary
 * spaces are restored; a genuine run of spaces collapses to one, which HTML does anyway.
 */
export function cleanEditorHtml(html: string | null | undefined): string {
  return (html ?? '').replace(/&nbsp;/g, ' ').trim();
}
