import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { RoleCode, roleSlug } from '../../../core/models/enums';

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

  roleSlug = roleSlug;

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
    return this.auth.hasRole(RoleCode.Senior, RoleCode.Manager, RoleCode.Admin);
  }

  get canManageUsers(): boolean {
    return this.auth.hasRole(RoleCode.Manager, RoleCode.Admin);
  }

  logout(): void {
    this.auth.logout();
    this.toast.show(this.translate.instant('AUTH.SIGNED_OUT'));
    this.router.navigate(['/login']);
  }
}
