import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { QuillEditorComponent } from 'ngx-quill';
import { cleanEditorHtml } from '../../../shared/directives/editor-html';
import { Department } from '../../../core/models/models';
import { ORG_WIDE_ROLES } from '../../../core/models/enums';
import { AnnouncementPayload, AnnouncementService } from '../../../core/services/announcement.service';
import { AuthService } from '../../../core/services/auth.service';
import { DepartmentService } from '../../../core/services/department.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { isoInDays, todayIso } from '../../../shared/components/due-badge/due-badge.component';

/**
 * Write or edit an announcement. HR and Admin choose the audience; a Manager's always goes to their own
 * department. Links may point at pages of this site (e.g. a catalog journey) — they open in the app.
 */
@Component({
  selector: 'app-announcement-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, QuillEditorComponent],
  templateUrl: './announcement-form.component.html',
})
export class AnnouncementFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AnnouncementService);
  private departmentService = inject(DepartmentService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  lang = inject(LanguageService);

  readonly defaultShowDays = 14;
  readonly today = todayIso();
  readonly maxDate = isoInDays(365);

  id: string | null = null;
  loading = true;
  saving = false;
  error = '';

  title = '';
  body = '';
  orgWide = true;
  selectedDepartments = new Set<string>();
  showUntil = isoInDays(this.defaultShowDays);
  notifyAgain = false;

  departments: Department[] = [];

  /** Links are the point (sending people to a journey or a form); images belong elsewhere, as in journeys. */
  quillModules = {
    toolbar: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'blockquote'],
      ['clean'],
    ],
  };

  get isEdit(): boolean { return !!this.id; }

  get isOrgWide(): boolean { return this.auth.hasRole(...ORG_WIDE_ROLES); }

  get ownDepartment(): string {
    const d = this.auth.currentUser?.department;
    return d ? this.lang.label(d) : '';
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.isOrgWide) {
      this.departmentService.list().subscribe({ next: (list) => (this.departments = list) });
    }
    if (!this.id) {
      this.loading = false;
      return;
    }
    this.service.get(this.id).subscribe({
      next: (a) => {
        if (!a.canEdit) {
          this.router.navigate(['/announcements']);
          return;
        }
        this.title = a.title;
        this.body = a.body;
        this.orgWide = a.orgWide;
        this.selectedDepartments = new Set(a.departments.map((d) => d.id));
        this.showUntil = a.showUntil;
        this.loading = false;
      },
      error: () => {
        this.toast.error(this.translate.instant('ANNOUNCEMENTS.GONE'));
        this.router.navigate(['/announcements']);
      },
    });
  }

  toggleDepartment(id: string, checked: boolean): void {
    checked ? this.selectedDepartments.add(id) : this.selectedDepartments.delete(id);
  }

  save(): void {
    this.error = '';
    const plain = (this.body ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!this.title.trim()) { this.error = this.translate.instant('ANNOUNCEMENTS.NEEDS_TITLE'); return; }
    if (!plain) { this.error = this.translate.instant('ANNOUNCEMENTS.NEEDS_BODY'); return; }
    if (this.isOrgWide && !this.orgWide && !this.selectedDepartments.size) {
      this.error = this.translate.instant('ANNOUNCEMENTS.NEEDS_AUDIENCE');
      return;
    }

    const payload: AnnouncementPayload = {
      title: this.title.trim(),
      body: cleanEditorHtml(this.body),
      orgWide: this.isOrgWide && this.orgWide,
      departmentIds: this.isOrgWide && !this.orgWide ? [...this.selectedDepartments] : [],
      showUntil: this.showUntil || null,
      notifyAgain: this.isEdit && this.notifyAgain,
    };
    this.saving = true;
    const request = this.isEdit ? this.service.update(this.id!, payload) : this.service.create(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.translate.instant(this.isEdit ? 'ANNOUNCEMENTS.UPDATED' : 'ANNOUNCEMENTS.PUBLISHED'));
        this.router.navigate(['/announcements']);
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.message ?? this.translate.instant('COMMON.SAVE_FAILED');
      },
    });
  }
}
