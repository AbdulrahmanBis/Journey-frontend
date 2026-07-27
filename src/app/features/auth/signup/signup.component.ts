import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  error = '';

  submit(): void {
    this.error = '';
    if (!this.name || !this.email || !this.password) return;
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    this.loading = true;
    this.auth.signup({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: (user) => {
        this.loading = false;
        this.toast.success(`Account created — welcome aboard, ${user.name.split(' ')[0]}!`);
        this.router.navigate(['/dashboard']);
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message;
      },
    });
  }
}
