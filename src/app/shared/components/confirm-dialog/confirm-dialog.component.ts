import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf, TranslatePipe],
  template: `
    <div class="modal-backdrop" *ngIf="open" (click)="cancel()">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <h3>{{ title }}</h3>
        <p class="muted" style="margin-top: 10px; line-height: 1.55;">{{ message }}</p>
        <div class="flex gap-12 justify-between" style="margin-top: 24px;">
          <button class="btn btn-ghost w-full" (click)="cancel()">
            {{ cancelLabel ?? ('COMMON.CANCEL' | translate) }}
          </button>
          <button class="btn w-full" [class.btn-danger]="danger" [class.btn-primary]="!danger" (click)="confirm()">
            {{ confirmLabel ?? ('COMMON.CONFIRM' | translate) }}
          </button>
        </div>
      </div>
    </div>
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
