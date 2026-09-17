import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Announcement } from '../../../core/models/models';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { ToastService } from '../../../core/services/toast.service';
import { AnnouncementModalComponent } from '../../../shared/components/announcement-modal/announcement-modal.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

/**
 * The top of every dashboard: announcements addressed to the viewer that are still within their
 * show-until date and that they have not dismissed.
 *
 * A notification links here as `/dashboard?announcement=<id>`, which opens that announcement — even
 * one that has expired or was dismissed, since the link should always show what it promised.
 */
@Component({
  selector: 'app-announcement-strip',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AnnouncementModalComponent, TimeAgoPipe],
  templateUrl: './announcement-strip.component.html',
  styleUrl: './announcement-strip.component.scss',
})
export class AnnouncementStripComponent implements OnInit {
  private service = inject(AnnouncementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  /** How many show before "show more". */
  readonly collapsedCount = 2;

  items: Announcement[] = [];
  expanded = false;
  opened: Announcement | null = null;

  get visible(): Announcement[] {
    return this.expanded ? this.items : this.items.slice(0, this.collapsedCount);
  }

  /** The open one is on this dashboard, so it can be dismissed from the modal. */
  get openedIsListed(): boolean {
    return !!this.opened && this.items.some((a) => a.id === this.opened!.id);
  }

  ngOnInit(): void {
    this.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('announcement');
      if (id && id !== this.opened?.id) this.openById(id);
    });
  }

  load(): void {
    this.service.active().subscribe({
      next: (items) => (this.items = items),
      error: () => (this.items = []),
    });
  }

  open(a: Announcement): void {
    this.opened = a;
  }

  close(): void {
    this.opened = null;
    if (this.route.snapshot.queryParamMap.has('announcement')) {
      this.router.navigate([], { relativeTo: this.route, queryParams: { announcement: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  dismiss(a: Announcement): void {
    this.items = this.items.filter((x) => x.id !== a.id);
    if (this.opened?.id === a.id) this.close();
    this.service.dismiss(a.id).subscribe({
      error: () => {
        this.toast.error(this.translate.instant('ANNOUNCEMENTS.DISMISS_FAILED'));
        this.load();
      },
    });
  }

  private openById(id: string): void {
    const listed = this.items.find((a) => a.id === id);
    if (listed) {
      this.opened = listed;
      return;
    }
    this.service.get(id).subscribe({
      next: (a) => (this.opened = a),
      error: () => {
        this.toast.error(this.translate.instant('ANNOUNCEMENTS.GONE'));
        this.close();
      },
    });
  }
}
