import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/** Journeys | Packages switch shared by both library pages. */
@Component({
  selector: 'app-journeys-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="nav nav-pills gap-1 mb-4" [attr.aria-label]="'JOURNEY.TITLE' | translate">
      <a class="nav-link" routerLink="/journeys" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        {{ 'JOURNEY.TITLE' | translate }}
      </a>
      <a class="nav-link" routerLink="/journeys/packages" routerLinkActive="active">
        {{ 'PACKAGE.TITLE' | translate }}
      </a>
    </nav>
  `,
})
export class JourneysTabsComponent {}
