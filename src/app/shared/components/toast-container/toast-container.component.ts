import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [AsyncPipe, NgFor],
  template: `
    <div class="toast-stack">
      <div class="toast" [class]="t.type" *ngFor="let t of toast.toasts$ | async">
        <span>{{ t.message }}</span>
      </div>
    </div>
  `,
})
export class ToastContainerComponent {
  toast = inject(ToastService);
}
