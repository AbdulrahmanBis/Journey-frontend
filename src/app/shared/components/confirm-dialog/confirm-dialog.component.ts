import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalComponent, TranslatePipe],
  template: `
    <app-modal [open]="open" (dismissed)="cancel()">
      <h3 class="h5 mb-2">{{ title }}</h3>
      <p class="text-body-secondary">{{ message }}</p>
      <div modal-actions>
        <button class="btn btn-outline-secondary flex-fill" (click)="cancel()">
          {{ cancelLabel ?? ('COMMON.CANCEL' | translate) }}
        </button>
        <button class="btn flex-fill" [class.btn-danger]="danger" [class.btn-primary]="!danger" (click)="confirm()">
          {{ confirmLabel ?? ('COMMON.CONFIRM' | translate) }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  @Input() open = false;
  /** Callers pass already-translated text for these, since the wording is context-specific. */
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel?: string;
  @Input() cancelLabel?: string;
  @Input() danger = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
