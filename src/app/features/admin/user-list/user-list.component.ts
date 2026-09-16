import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { User } from '../../../core/models/models';
import { RoleCode, roleSlug } from '../../../core/models/enums';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent, TranslatePipe],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  RoleCode = RoleCode;
  roleSlug = roleSlug;

  users: User[] = [];
  loading = true;
  deletingUser: User | null = null;

  get seniors(): User[] { return this.users.filter((u) => u.role?.code === RoleCode.Senior); }

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
    this.userService.getUsers().subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: () => { this.loading = false; this.toast.error(this.translate.instant('USER.LOAD_FAILED')); },
    });
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
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('USER.DELETE_FAILED')),
    });
  }

  reassignSenior(learner: User, seniorId: string): void {
    this.userService.assignLearnerToSenior(learner.id, seniorId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('USER.REASSIGNED', { name: learner.name }));
        this.refresh();
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('USER.REASSIGN_FAILED')),
    });
  }
}
