import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, debounceTime, switchMap, tap } from 'rxjs';
import { CatalogQuery, CatalogService, CatalogSort } from '../../core/services/catalog.service';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogPage, Facet } from '../../core/models/models';
import { RoleCode } from '../../core/models/enums';
import { CatalogCardComponent } from '../../shared/components/catalog-card/catalog-card.component';

const SORTS: readonly CatalogSort[] = ['relevance', 'title', 'newest', 'popular'];

/**
 * The library: every journey and package, for everyone. All state (search, type, tag, status,
 * sort) lives in the URL, so the nav search can land here, and a filtered view can be shared or
 * bookmarked. Filtering, facet counts and ranking come from the server.
 */
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CatalogCardComponent],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalog = inject(CatalogService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  lang = inject(LanguageService);

  readonly sorts = SORTS;

  query: CatalogQuery = {};
  /** What's typed in the page's search box, applied after a short pause. */
  searchText = '';
  page: CatalogPage | null = null;
  loading = true;

  private typed$ = new Subject<string>();
  /** The last search this page put in the URL, so a reply to it never overwrites newer typing. */
  private sentQ: string | null = null;
  private reload$ = new Subject<void>();

  get isLearner(): boolean { return this.auth.hasRole(RoleCode.Learner); }

  get hasFilters(): boolean {
    return !!(this.query.q || this.query.type || this.query.tag || this.query.status);
  }

  /** "All" in the status tabs: the sum of the statuses, i.e. every result before status filtering. */
  get allStatusCount(): number {
    return (this.page?.statuses ?? []).reduce((sum, s) => sum + s.count, 0);
  }

  get allTypeCount(): number {
    return (this.page?.types ?? []).reduce((sum, t) => sum + t.count, 0);
  }

  ngOnInit(): void {
    // The URL is the source of truth; every change to it reloads.
    this.route.queryParamMap
      .pipe(
        tap((params) => {
          this.query = {
            q: params.get('q'),
            type: numberOrNull(params.get('type')),
            tag: params.get('tag'),
            status: numberOrNull(params.get('status')),
            sort: (SORTS as readonly string[]).includes(params.get('sort') ?? '') ? (params.get('sort') as CatalogSort) : null,
          };
          if (this.query.q !== this.sentQ) this.searchText = this.query.q ?? '';
          this.sentQ = null;
          this.loading = true;
        }),
        switchMap(() => this.catalog.browse(this.query)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => { this.page = page; this.loading = false; },
        error: () => { this.loading = false; },
      });

    this.typed$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((text) => {
        const q = text.trim() || null;
        if (q === (this.query.q ?? null)) return;
        this.sentQ = q;
        this.update({ q }, true);
      });

    // After an enrollment or assignment on this page, refresh counts and statuses in place.
    this.reload$
      .pipe(switchMap(() => this.catalog.browse(this.query)), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => (this.page = page));
  }

  onType(text: string): void { this.typed$.next(text); }

  setType(value: string | null): void { this.update({ type: value ? Number(value) : null }); }
  setTag(value: string | null): void { this.update({ tag: this.query.tag === value ? null : value }); }
  setStatus(value: string | null): void { this.update({ status: value ? Number(value) : null }); }
  setSort(value: CatalogSort): void { this.update({ sort: value }); }

  clear(): void {
    this.searchText = '';
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  refresh(): void { this.reload$.next(); }

  isActive(facet: Facet, current: number | string | null | undefined): boolean {
    return current !== null && current !== undefined && String(current) === facet.value;
  }

  trackEntry = (_: number, e: { id: string; type: { code: number } }) => `${e.type.code}:${e.id}`;

  /** Relevance only makes sense with a search; without one the server sorts by title. */
  get effectiveSort(): CatalogSort {
    return this.query.sort ?? (this.query.q ? 'relevance' : 'title');
  }

  private update(changes: Partial<CatalogQuery>, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: changes,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}

function numberOrNull(value: string | null): number | null {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : null;
}
