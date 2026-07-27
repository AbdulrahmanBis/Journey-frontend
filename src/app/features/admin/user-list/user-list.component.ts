import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models/models';
import { ROLE_LABEL, UserRole } from '../../../core/models/enums';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);

  roleLabel = ROLE_LABEL;
  UserRole = UserRole;
  users: User[] = [];
  loading = true;
  deletingUser: User | null = null;

  get seniors(): User[] { return this.users.filter((u) => u.role === UserRole.Senior); }

  seniorName(seniorId: string | undefined): string {
    return this.users.find((u) => u.id === seniorId)?.name ?? '—';
  }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: () => { this.loading = false; this.toast.error('Could not load users.'); },
    });
  }

  edit(user: User): void { this.router.navigate(['/admin/users', user.id, 'edit']); }
  askDelete(user: User): void { this.deletingUser = user; }

  confirmDelete(): void {
    if (!this.deletingUser) return;
    const name = this.deletingUser.name;
    this.userService.deleteUser(this.deletingUser.id).subscribe({
      next: () => { this.deletingUser = null; this.toast.success(`${name} removed.`); this.refresh(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Delete failed.'),
    });
  }

  reassignSenior(learner: User, seniorId: string): void {
    this.userService.assignLearnerToSenior(learner.id, seniorId).subscribe({
      next: () => { this.toast.success(`${learner.name} reassigned.`); this.refresh(); },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Reassign failed.'),
    });
  }
}
