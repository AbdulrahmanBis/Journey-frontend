import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="modal-backdrop" *ngIf="open" (click)="cancel()">
      <div class="modal-panel" (click)="$event.stopPropagation()">
        <h3>{{ title }}</h3>
        <p class="muted" style="margin-top: 10px; line-height: 1.55;">{{ message }}</p>
        <div class="flex gap-12 justify-between" style="margin-top: 24px;">
          <button class="btn btn-ghost w-full" (click)="cancel()">{{ cancelLabel }}</button>
          <button class="btn w-full" [class.btn-danger]="danger" [class.btn-primary]="!danger" (click)="confirm()">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
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
