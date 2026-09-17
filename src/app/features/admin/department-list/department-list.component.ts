import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DepartmentService } from '../../../core/services/department.service';
import { ToastService } from '../../../core/services/toast.service';
import { Department } from '../../../core/models/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { apiErrorMessage } from '../../../core/services/api-error';

/** HR and Admin: the departments people belong to. Journeys are company-wide and not listed here. */
@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, ModalComponent, TranslatePipe],
  templateUrl: './department-list.component.html',
})
export class DepartmentListComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  departments: Department[] = [];
  loading = true;

  /** Open editor: `null` id means a new department. */
  editing: { id: string | null; english: string; arabic: string } | null = null;
  saving = false;
  error = '';

  deleting: Department | null = null;

  get deleteMessage(): string {
    return this.translate.instant('DEPARTMENT.DELETE_MESSAGE', { name: this.deleting?.english ?? '' });
  }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading = true;
    this.departmentService.list().subscribe({
      next: (departments) => { this.departments = departments; this.loading = false; },
      error: () => { this.loading = false; this.toast.error(this.translate.instant('DEPARTMENT.LOAD_FAILED')); },
    });
  }

  add(): void {
    this.error = '';
    this.editing = { id: null, english: '', arabic: '' };
  }

  rename(department: Department): void {
    this.error = '';
    this.editing = { id: department.id, english: department.english, arabic: department.arabic };
  }

  save(): void {
    if (!this.editing) return;
    const payload = { english: this.editing.english.trim(), arabic: this.editing.arabic.trim() };
    if (!payload.english || !payload.arabic) {
      this.error = this.translate.instant('DEPARTMENT.NAMES_REQUIRED');
      return;
    }
    this.saving = true;
    const request = this.editing.id
      ? this.departmentService.rename(this.editing.id, payload)
      : this.departmentService.create(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.translate.instant(this.editing?.id ? 'DEPARTMENT.RENAMED' : 'DEPARTMENT.CREATED'));
        this.editing = null;
        this.refresh();
      },
      error: (err: any) => {
        this.saving = false;
        this.error = apiErrorMessage(err) ?? this.translate.instant('DEPARTMENT.SAVE_FAILED');
      },
    });
  }

  askDelete(department: Department): void { this.deleting = department; }

  confirmDelete(): void {
    if (!this.deleting) return;
    const name = this.deleting.english;
    this.departmentService.delete(this.deleting.id).subscribe({
      next: () => {
        this.deleting = null;
        this.toast.success(this.translate.instant('DEPARTMENT.DELETED', { name }));
        this.refresh();
      },
      error: (err: any) => {
        this.deleting = null;
        // 409 = people still belong to it; the server message says so.
        this.toast.error(apiErrorMessage(err) ?? this.translate.instant('DEPARTMENT.DELETE_FAILED'));
      },
    });
  }
}
