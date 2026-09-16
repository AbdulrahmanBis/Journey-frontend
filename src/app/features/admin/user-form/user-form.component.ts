import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { EnumValue, RoleCode, USER_ROLES } from '../../../core/models/enums';
import { User } from '../../../core/models/models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  RoleCode = RoleCode;
  roles = USER_ROLES;
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
  seniorId = '';
  seniors: User[] = [];

  /** Role wording follows the active language, from the enum triple. */
  roleLabel(role: EnumValue): string {
    return this.lang.label(role);
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.userId;

    if (this.isEdit) {
      forkJoin({
        user: this.userService.getById(this.userId!),
        seniors: this.userService.getSeniors(),
      }).subscribe({
        next: ({ user, seniors }: { user: User; seniors: User[] }) => {
          this.name = user.name;
          this.email = user.email;
          this.role = user.role?.code ?? RoleCode.Learner;
          this.seniorId = user.seniorId ?? '';
          this.seniors = seniors;
          this.loading = false;
        },
        error: () => {
          this.toast.error(this.translate.instant('USER.NOT_FOUND'));
          this.router.navigate(['/admin/users']);
        },
      });
    } else {
      this.userService.getSeniors().subscribe({ next: (s) => { this.seniors = s; this.loading = false; } });
    }
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

    this.saving = true;
    const seniorId = this.role === RoleCode.Learner ? this.seniorId || undefined : undefined;

    const request = this.isEdit
      ? this.userService.updateUser(this.userId!, {
          name: this.name.trim(),
          email: this.email.trim(),
          role: this.role,
          seniorId,
          ...(this.password.trim() ? { password: this.password.trim() } : {}),
        })
      : this.userService.createUser({
          name: this.name.trim(),
          email: this.email.trim(),
          password: this.password.trim(),
          role: this.role,
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
        this.error = err?.error?.message ?? this.translate.instant('USER.SAVE_FAILED');
      },
    });
  }
}
