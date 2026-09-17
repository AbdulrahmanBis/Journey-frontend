import { Pipe, PipeTransform } from '@angular/core';
import { normalizeEditorHtml } from '../directives/editor-html';

/**
 * Editor HTML, ready for [innerHTML]. Content saved before the editor's list markup was normalised
 * still carries it, so it is rebuilt here on the way to the page (see normalizeEditorHtml).
 */
@Pipe({ name: 'richHtml', standalone: true })
export class RichHtmlPipe implements PipeTransform {
  transform(html: string | null | undefined): string {
    return normalizeEditorHtml(html);
  }
}
