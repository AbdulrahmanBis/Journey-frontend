import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

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
      this.error = this.translate.instant('AUTH.PASSWORDS_DONT_MATCH');
      return;
    }
    this.loading = true;
    this.auth.signup({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: (user) => {
        this.loading = false;
        this.toast.success(this.translate.instant('AUTH.ACCOUNT_CREATED', { name: user.name.split(' ')[0] }));
        this.router.navigate(['/dashboard']);
      },
      error: (err: Error) => {
        this.loading = false;
        this.error = err.message;
      },
    });
  }
}
