import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ROLE_LABEL, UserRole } from '../../../core/models/enums';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  UserRole = UserRole;
  roleLabel = ROLE_LABEL;

  get user() {
    return this.auth.currentUser!;
  }

  get canManageJourneys(): boolean {
    return this.auth.hasRole(UserRole.Senior, UserRole.Manager, UserRole.Admin);
  }

  get canManageUsers(): boolean {
    return this.auth.hasRole(UserRole.Manager, UserRole.Admin);
  }

  logout(): void {
    this.auth.logout();
    this.toast.show('Signed out. See you next time!');
    this.router.navigate(['/login']);
  }
}
