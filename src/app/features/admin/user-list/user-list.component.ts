import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { User } from '../../../core/models/models';
import { ORG_WIDE_ROLES, RoleCode, roleChipClass } from '../../../core/models/enums';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DepartmentPickerComponent } from '../../../shared/components/department-picker/department-picker.component';
import { apiErrorMessage } from '../../../core/services/api-error';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent, DepartmentPickerComponent, TranslatePipe],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private auth = inject(AuthService);

  RoleCode = RoleCode;
  roleChipClass = roleChipClass;

  users: User[] = [];
  loading = true;
  deletingUser: User | null = null;
  /** HR/Admin only; null = every department. A Manager only ever gets their own. */
  departmentId: string | null = null;

  get isOrgWide(): boolean { return this.auth.hasRole(...ORG_WIDE_ROLES); }

  /** A learner's senior must be in the learner's department (the server enforces it too). */
  seniorsFor(learner: User): User[] {
    return this.users.filter(
      (u) => u.role?.code === RoleCode.Senior && u.department?.id === learner.department?.id,
    );
  }

  /** Mirrors AccessPolicy.canManageAccount: HR can't touch Admin; a Manager can't touch HR or Admin. */
  canManage(user: User): boolean {
    const target = user.role?.code;
    if (this.auth.hasRole(RoleCode.Admin)) return true;
    if (this.auth.hasRole(RoleCode.Hr)) return target !== RoleCode.Admin;
    return target !== RoleCode.Admin && target !== RoleCode.Hr;
  }

  isSelf(user: User): boolean { return user.id === this.auth.currentUser?.id; }

  departmentLabel(user: User): string { return this.lang.label(user.department) || '—'; }

  isLearner(user: User): boolean { return user.role?.code === RoleCode.Learner; }

  /** Role wording follows the active language, from the enum triple. */
  roleLabel(user: User): string { return this.lang.label(user.role); }

  get deleteMessage(): string {
    return this.translate.instant('USER.REMOVE_MESSAGE', { name: this.deletingUser?.name ?? '' });
  }

  seniorName(seniorId: string | undefined): string {
    return this.users.find((u) => u.id === seniorId)?.name ?? '—';
  }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading = true;
    this.userService.getUsers(this.departmentId).subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: () => { this.loading = false; this.toast.error(this.translate.instant('USER.LOAD_FAILED')); },
    });
  }

  onDepartmentChange(departmentId: string | null): void {
    this.departmentId = departmentId;
    this.refresh();
  }

  edit(user: User): void { this.router.navigate(['/admin/users', user.id, 'edit']); }
  askDelete(user: User): void { this.deletingUser = user; }

  confirmDelete(): void {
    if (!this.deletingUser) return;
    const name = this.deletingUser.name;
    this.userService.deleteUser(this.deletingUser.id).subscribe({
      next: () => {
        this.deletingUser = null;
        this.toast.success(this.translate.instant('USER.REMOVED', { name }));
        this.refresh();
      },
      error: (err: any) => this.toast.error(apiErrorMessage(err) ?? this.translate.instant('USER.DELETE_FAILED')),
    });
  }

  reassignSenior(learner: User, seniorId: string): void {
    this.userService.assignLearnerToSenior(learner.id, seniorId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('USER.REASSIGNED', { name: learner.name }));
        this.refresh();
      },
      error: (err: any) => this.toast.error(apiErrorMessage(err) ?? this.translate.instant('USER.REASSIGN_FAILED')),
    });
  }
}
