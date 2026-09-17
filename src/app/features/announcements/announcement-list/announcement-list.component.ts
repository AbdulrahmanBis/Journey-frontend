import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Announcement } from '../../../core/models/models';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { ORG_WIDE_ROLES } from '../../../core/models/enums';
import { AnnouncementModalComponent, audienceLabel } from '../../../shared/components/announcement-modal/announcement-modal.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DepartmentPickerComponent } from '../../../shared/components/department-picker/department-picker.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

/**
 * Past and current announcements. HR and Admin see every announcement and can narrow to what reached
 * one department; a Manager sees what reached their own department and edits only their own posts.
 */
@Component({
  selector: 'app-announcement-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, AnnouncementModalComponent, ConfirmDialogComponent, DepartmentPickerComponent, TimeAgoPipe],
  templateUrl: './announcement-list.component.html',
})
export class AnnouncementListComponent implements OnInit {
  private service = inject(AnnouncementService);
  private auth = inject(AuthService);
  private lang = inject(LanguageService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  items: Announcement[] = [];
  loading = true;
  failed = false;
  departmentId: string | null = null;
  /** Current = still showing on dashboards. */
  view: 'current' | 'past' = 'current';

  opened: Announcement | null = null;
  deleting: Announcement | null = null;

  get isOrgWide(): boolean {
    return this.auth.hasRole(...ORG_WIDE_ROLES);
  }

  get current(): Announcement[] { return this.items.filter((a) => a.active); }
  get past(): Announcement[] { return this.items.filter((a) => !a.active); }
  get shown(): Announcement[] { return this.view === 'current' ? this.current : this.past; }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.failed = false;
    this.service.list(this.departmentId).subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.failed = true;
      },
    });
  }

  onDepartmentChange(id: string | null): void {
    this.departmentId = id;
    this.load();
  }

  audience(a: Announcement): string {
    return audienceLabel(a, this.lang, this.translate);
  }

  showUntil(a: Announcement): string {
    return new Date(a.showUntil + 'T00:00:00').toLocaleDateString(this.lang.current() === 'arabic' ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  confirmDelete(): void {
    const target = this.deleting;
    this.deleting = null;
    if (!target) return;
    this.service.delete(target.id).subscribe({
      next: () => {
        this.items = this.items.filter((a) => a.id !== target.id);
        this.toast.success(this.translate.instant('ANNOUNCEMENTS.DELETED'));
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.DELETE_FAILED')),
    });
  }
}
