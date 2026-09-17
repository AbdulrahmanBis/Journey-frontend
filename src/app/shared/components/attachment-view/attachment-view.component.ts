import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { Attachment } from '../../../core/models/models';
import { AttachmentKindCode, codeOf, toEmbedUrl } from '../../../core/models/enums';
import { FileService } from '../../../core/services/file.service';
import { LanguageService } from '../../../core/services/language.service';

/**
 * Renders a journey item's attachments: images inline, PDFs in an embedded viewer, uploaded video
 * in a seekable player, YouTube/Vimeo as embeds, and links/documents as cards.
 *
 * <p>Word documents are a download link on purpose — browsers cannot render .docx, and the online
 * Office/Google viewers need a publicly reachable URL, which these files are not (they sit behind
 * auth).
 */
@Component({
  selector: 'app-attachment-view',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './attachment-view.component.html',
  styleUrl: './attachment-view.component.scss',
})
export class AttachmentViewComponent {
  private sanitizer = inject(DomSanitizer);
  private files = inject(FileService);
  private lang = inject(LanguageService);

  /**
   * Frame addresses, worked out once per attachment.
   *
   * <p>A sanitized URL is a new object every time it is built, so calling the sanitizer from the template made
   * every change detection pass look like a new {@code src} — and each click re-loaded the PDF viewer, fetching
   * the file again. These are kept until the attachments themselves change.
   */
  private frames = new Map<string, SafeResourceUrl>();

  @Input() set attachments(value: Attachment[] | null | undefined) {
    this.items = value ?? [];
    this.frames.clear();
  }

  items: Attachment[] = [];

  K = AttachmentKindCode;

  /** Hosts allowed to render inside a frame. Anything else falls back to a plain link card. */
  private static readonly EMBED_HOSTS = [
    'youtube.com',
    'www.youtube.com',
    'youtube-nocookie.com',
    'player.vimeo.com',
    'vimeo.com',
    'docs.google.com',
    'drive.google.com',
    'onedrive.live.com',
    'sharepoint.com',
    '1drv.ms',
  ];

  trackAttachment(_index: number, a: Attachment): string {
    return a.id ?? a.storageKey ?? a.url ?? String(_index);
  }

  is(a: Attachment, kind: number): boolean {
    return codeOf(a.kind) === kind;
  }

  /** Kind name in the active language, straight from the API triple. */
  kindLabel(a: Attachment): string {
    return this.lang.label(a.kind);
  }

  /** What to show as the attachment's name. */
  title(a: Attachment): string {
    return a.label?.trim() || a.originalName?.trim() || a.url?.trim() || this.kindLabel(a);
  }

  mediaUrl(a: Attachment): string {
    return this.files.mediaUrl(a.storageKey);
  }

  size(a: Attachment): string {
    return this.files.formatSize(a.sizeBytes);
  }

  /**
   * True when this URL may be framed. Arbitrary pages are NOT framed by default: an embed runs
   * third-party code in the page, so only known-safe hosts get a frame and everything else
   * degrades to a link the learner clicks deliberately.
   */
  canEmbed(a: Attachment): boolean {
    const raw = toEmbedUrl(a.url);
    if (!raw.toLowerCase().startsWith('https://')) return false;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      return AttachmentViewComponent.EMBED_HOSTS.some(
        (h) => host === h || host.endsWith('.' + h),
      );
    } catch {
      return false;
    }
  }

  /** Angular blocks iframe srcs unless explicitly trusted; only called after canEmbed() passes. */
  embedUrl(a: Attachment): SafeResourceUrl {
    return this.frame('embed:' + (a.url ?? ''), () => toEmbedUrl(a.url));
  }

  /** PDFs are served from our own origin, so framing them is safe. */
  pdfUrl(a: Attachment): SafeResourceUrl {
    return this.frame('pdf:' + (a.storageKey ?? a.id ?? ''), () => this.mediaUrl(a));
  }

  /** The same object for the same attachment, so the frame is never reloaded by a redraw. */
  private frame(key: string, build: () => string): SafeResourceUrl {
    const existing = this.frames.get(key);
    if (existing) return existing;
    const url = this.sanitizer.bypassSecurityTrustResourceUrl(build());
    this.frames.set(key, url);
    return url;
  }

  externalUrl(a: Attachment): string {
    return (a.url ?? '').trim();
  }
}
