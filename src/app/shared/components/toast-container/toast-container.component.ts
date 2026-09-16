import { Component, inject } from '@angular/core';
import { AsyncPipe, NgClass, NgFor } from '@angular/common';
import { ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [AsyncPipe, NgClass, NgFor],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3">
      <div
        class="toast show toast-accent"
        role="status"
        aria-live="polite"
        *ngFor="let t of toast.toasts$ | async"
        [ngClass]="accentClass(t.type)"
      >
        <div class="toast-body">{{ t.message }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      /* A coloured bar on the reading-start edge says what kind of message it is. */
      .toast-accent { border-inline-start: 3px solid var(--toast-accent); }
      .toast-info { --toast-accent: var(--bs-primary); }
      .toast-success { --toast-accent: var(--bs-completed); }
      .toast-error { --toast-accent: var(--bs-cancelled); }
    `,
  ],
})
export class ToastContainerComponent {
  toast = inject(ToastService);

  accentClass(type: ToastType): string {
    return `toast-${type}`;
  }
}
