import { Component, inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastContainerComponent, AsyncPipe, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  auth = inject(AuthService);
}
