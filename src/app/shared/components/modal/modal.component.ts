import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

/**
 * Bootstrap's modal markup with Angular owning the open state — no Bootstrap JavaScript.
 *
 * Content is projected into the modal body; put actions in an element with the `modal-actions`
 * attribute to get the footer layout:
 *
 *   <app-modal [open]="editing" (dismissed)="editing = false">
 *     <h3 class="h5 mb-2">Title</h3>
 *     <p>Body…</p>
 *     <div modal-actions>
 *       <button class="btn btn-outline-secondary flex-fill">Cancel</button>
 *       <button class="btn btn-primary flex-fill">Save</button>
 *     </div>
 *   </app-modal>
 *
 * Clicking the backdrop or pressing Escape emits `dismissed`; closing is the parent's decision.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [NgIf],
  template: `
    <ng-container *ngIf="open">
      <div class="modal-backdrop show"></div>
      <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" (click)="dismissed.emit()">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-body">
              <ng-content></ng-content>
            </div>
            <div class="modal-footer border-0 pt-0 flex-nowrap gap-2">
              <ng-content select="[modal-actions]"></ng-content>
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [
    `
      /* The projected wrapper should not break the footer's flex row. */
      :host ::ng-deep [modal-actions] {
        display: contents;
      }
    `,
  ],
})
export class ModalComponent {
  @Input() open = false;
  @Output() dismissed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.dismissed.emit();
  }
}
