import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { EnumValue, ORG_WIDE_ROLES, RoleCode, USER_ROLES } from '../../../core/models/enums';
import { User } from '../../../core/models/models';
import { DepartmentPickerComponent } from '../../../shared/components/department-picker/department-picker.component';
import { Observable, forkJoin, of } from 'rxjs';
import { apiErrorMessage, openErrorPage } from '../../../core/services/api-error';

/** Roles each account manager may hand out — mirrors AccessPolicy.requireCanAssign on the server. */
const ASSIGNABLE_ROLES: Record<number, readonly number[]> = {
  [RoleCode.Admin]: USER_ROLES.map((r) => r.code),
  [RoleCode.Hr]: USER_ROLES.map((r) => r.code).filter((c) => c !== RoleCode.Admin),
  [RoleCode.Manager]: [RoleCode.Manager, RoleCode.Senior, RoleCode.Learner],
};

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DepartmentPickerComponent, TranslatePipe],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  RoleCode = RoleCode;
  roles: readonly EnumValue[] = [];
  userId: string | null = null;
  isEdit = false;
  loading = true;
  saving = false;
  error = '';

  name = '';
  email = '';
  password = '';
  /** Numeric role code — this is what the API expects. */
  role: number = RoleCode.Learner;
  departmentId: string | null = null;
  seniorId = '';
  seniors: User[] = [];

  /** The loaded user's senior, so saving can tell "cleared" from "never had one". */
  private originalSeniorId = '';

  /** HR and Admin place people in any department; a Manager only in their own. */
  get isOrgWide(): boolean {
    return this.auth.hasRole(...ORG_WIDE_ROLES);
  }

  /** Role wording follows the active language, from the enum triple. */
  roleLabel(role: EnumValue): string {
    return this.lang.label(role);
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.userId;

    const allowed = ASSIGNABLE_ROLES[this.auth.currentUser?.role?.code ?? -1] ?? [];
    this.roles = USER_ROLES.filter((r) => allowed.includes(r.code));

    // The cached session user may predate departments, so a Manager's own is read fresh.
    const self$: Observable<User | null> = this.isOrgWide ? of(null) : this.userService.getById(this.auth.currentUser!.id);
    const target$: Observable<User | null> = this.isEdit ? this.userService.getById(this.userId!) : of(null);

    forkJoin({ self: self$, target: target$ }).subscribe({
      next: ({ self, target }) => {
        if (target) {
          this.name = target.name;
          this.email = target.email;
          this.role = target.role?.code ?? RoleCode.Learner;
          this.departmentId = target.department?.id ?? null;
          this.seniorId = this.originalSeniorId = target.seniorId ?? '';
        }
        if (self) this.departmentId = self.department?.id ?? null;
        this.loadSeniors();
      },
      error: (err) => openErrorPage(this.router, err),
    });
  }

  onDepartmentChange(departmentId: string | null): void {
    this.departmentId = departmentId;
    this.loadSeniors();
  }

  /** Only seniors in the chosen department can mentor this learner. */
  private loadSeniors(): void {
    if (!this.departmentId) {
      this.seniors = [];
      this.seniorId = '';
      this.loading = false;
      return;
    }
    this.userService.getSeniors(this.departmentId).subscribe({
      next: (seniors) => {
        this.seniors = seniors;
        if (!seniors.some((s) => s.id === this.seniorId)) this.seniorId = '';
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  submit(): void {
    this.error = '';
    if (!this.name.trim() || !this.email.trim()) {
      this.error = this.translate.instant('USER.NAME_EMAIL_REQUIRED');
      return;
    }
    if (!this.isEdit && !this.password.trim()) {
      this.error = this.translate.instant('USER.PASSWORD_REQUIRED');
      return;
    }
    if (!this.departmentId) {
      this.error = this.translate.instant('DEPARTMENT.REQUIRED');
      return;
    }

    this.saving = true;
    const seniorId = this.role === RoleCode.Learner ? this.seniorId || undefined : undefined;

    const request = this.isEdit
      ? this.userService.updateUser(this.userId!, {
          name: this.name.trim(),
          email: this.email.trim(),
          role: this.role,
          departmentId: this.departmentId,
          seniorId,
          // A missing seniorId means "unchanged" to the API, so un-assigning must be explicit.
          ...(!seniorId && this.originalSeniorId ? { clearSenior: true } : {}),
          ...(this.password.trim() ? { password: this.password.trim() } : {}),
        })
      : this.userService.createUser({
          name: this.name.trim(),
          email: this.email.trim(),
          password: this.password.trim(),
          role: this.role,
          departmentId: this.departmentId,
          seniorId,
        });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.translate.instant(this.isEdit ? 'USER.UPDATED' : 'USER.CREATED'));
        this.router.navigate(['/admin/users']);
      },
      error: (err: any) => {
        this.saving = false;
        this.error = apiErrorMessage(err) ?? this.translate.instant('USER.SAVE_FAILED');
      },
    });
  }
}
