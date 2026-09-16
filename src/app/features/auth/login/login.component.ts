import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  email = '';
  password = '';
  loading = false;
  error = '';

  submit(): void {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: (user) => {
        this.loading = false;
        this.toast.success(this.translate.instant('AUTH.WELCOME_TOAST', { name: user.name.split(' ')[0] }));
        this.router.navigate(['/dashboard']);
      },
      error: (err: Error) => { this.loading = false; this.error = err.message; },
    });
  }
}
