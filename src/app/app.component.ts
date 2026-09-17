import { Component, inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { NotificationBellComponent } from './shared/components/notification-bell/notification-bell.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { GlobalSearchComponent } from './shared/components/global-search/global-search.component';
import { IntroGuideComponent } from './shared/components/intro-guide/intro-guide.component';
import { IntroGuideService } from './core/services/intro-guide.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, NotificationBellComponent, GlobalSearchComponent, IntroGuideComponent, ToastContainerComponent, TranslatePipe, AsyncPipe, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  auth = inject(AuthService);
  guide = inject(IntroGuideService);
}
