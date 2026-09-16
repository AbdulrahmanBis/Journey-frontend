import { Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';

/**
 * The search box in the top bar, on every page. Enter opens the catalog with the query; on the
 * catalog itself the box mirrors the current search. Press "/" anywhere to jump to it.
 */
@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <form class="global-search flex-grow-1" role="search" (ngSubmit)="submit()">
      <input
        #box
        type="search"
        name="q"
        class="form-control"
        autocomplete="off"
        [(ngModel)]="text"
        [placeholder]="'CATALOG.NAV_SEARCH' | translate"
        [attr.aria-label]="'CATALOG.NAV_SEARCH' | translate"
      />
    </form>
  `,
  styles: [
    `
      .global-search { max-width: 28rem; }
    `,
  ],
})
export class GlobalSearchComponent implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  @ViewChild('box') box?: ElementRef<HTMLInputElement>;

  text = '';

  ngOnInit(): void {
    this.syncFromUrl();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFromUrl());
  }

  submit(): void {
    const q = this.text.trim();
    this.router.navigate(['/catalog'], { queryParams: q ? { q } : {} });
    this.box?.nativeElement.blur();
  }

  /** "/" focuses search, unless the user is already typing somewhere. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
    event.preventDefault();
    this.box?.nativeElement.focus();
  }

  private syncFromUrl(): void {
    const tree = this.router.parseUrl(this.router.url);
    const onCatalog = tree.root.children['primary']?.segments.map((s) => s.path).join('/') === 'catalog';
    this.text = onCatalog ? (tree.queryParams['q'] ?? '') : '';
  }
}
