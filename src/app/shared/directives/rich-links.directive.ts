import { Directive, ElementRef, EventEmitter, HostListener, Output, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Makes links inside editor HTML behave: a link to a page of this site (`/catalog/journeys/…`, or the
 * full site URL) navigates in the app without a reload; any other link opens in a new tab.
 *
 *   <div class="rich-content" appRichLinks [innerHTML]="html" (navigated)="close()"></div>
 */
@Directive({
  selector: '[appRichLinks]',
  standalone: true,
})
export class RichLinksDirective {
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  /** Emits after an in-app navigation, e.g. so a modal can close. */
  @Output() navigated = new EventEmitter<string>();

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement | null)?.closest('a');
    if (!anchor || !this.host.nativeElement.contains(anchor)) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let url: URL;
    try {
      url = new URL(href, window.location.origin);
    } catch {
      return;
    }

    event.preventDefault();
    const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1;
    if (url.origin === window.location.origin && !modified) {
      const path = url.pathname + url.search + url.hash;
      this.router.navigateByUrl(path);
      this.navigated.emit(path);
    } else {
      window.open(url.href, '_blank', 'noopener');
    }
  }
}
