import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { ROLE_LABEL, UserRole } from '../../../core/models/enums';
import { User } from '../../../core/models/models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private toast = inject(ToastService);

  roleLabel = ROLE_LABEL;
  roles = Object.values(UserRole);
  userId: string | null = null;
  isEdit = false;
  loading = true;
  saving = false;
  error = '';

  name = '';
  email = '';
  password = '';
  role: UserRole = UserRole.Learner;
  seniorId = '';
  seniors: User[] = [];

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
          this.role = user.role;
          this.seniorId = user.seniorId ?? '';
          this.seniors = seniors;
          this.loading = false;
        },
        error: () => { this.toast.error('User not found.'); this.router.navigate(['/admin/users']); },
      });
    } else {
      this.userService.getSeniors().subscribe({ next: (s) => { this.seniors = s; this.loading = false; } });
    }
  }

  submit(): void {
    this.error = '';
    if (!this.name.trim() || !this.email.trim()) { this.error = 'Name and email are required.'; return; }
    if (!this.isEdit && !this.password.trim()) { this.error = 'Set a password for the new account.'; return; }

    this.saving = true;
    const seniorId = this.role === UserRole.Learner ? this.seniorId || undefined : undefined;

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
        this.toast.success(this.isEdit ? 'User updated.' : 'User created.');
        this.router.navigate(['/admin/users']);
      },
      error: (err: any) => { this.saving = false; this.error = err?.error?.message ?? 'Save failed.'; },
    });
  }
}
