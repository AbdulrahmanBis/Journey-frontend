import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { ORG_WIDE_ROLES, STAFF_ROLES, USER_ADMIN_ROLES, roleChipClass } from '../../../core/models/enums';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  auth = inject(AuthService);
  lang = inject(LanguageService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  roleChipClass = roleChipClass;

  get user() {
    return this.auth.currentUser!;
  }

  /** Role wording comes from the API triple, not the i18n files. */
  get roleLabel(): string {
    return this.lang.label(this.user?.role);
  }

  /** Shows the language you'd switch *to*, so the button is self-explanatory. */
  get otherLanguageLabel(): string {
    const target = this.lang.current() === 'english' ? 'arabic' : 'english';
    return this.lang.languages.find((l) => l.code === target)!.label;
  }

  switchLanguage(): void {
    this.lang.toggle();
  }

  get canManageJourneys(): boolean {
    return this.auth.hasRole(...STAFF_ROLES);
  }

  get canManageUsers(): boolean {
    return this.auth.hasRole(...USER_ADMIN_ROLES);
  }

  get canManageDepartments(): boolean {
    return this.auth.hasRole(...ORG_WIDE_ROLES);
  }

  logout(): void {
    this.auth.logout();
    this.toast.show(this.translate.instant('AUTH.SIGNED_OUT'));
    this.router.navigate(['/login']);
  }
}
