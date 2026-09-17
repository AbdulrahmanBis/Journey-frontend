import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

/**
 * A left-hand panel that sits beside the page on wide screens and folds behind a toggle on narrow
 * ones — the catalog's filters and the journey outline. Content is projected:
 *
 *   <app-side-panel [label]="'LOG.CONTENTS' | translate" breakpoint="lg">…</app-side-panel>
 */
@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [NgClass],
  template: `
    <button
      type="button"
      class="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center mb-2"
      [ngClass]="'d-' + breakpoint + '-none'"
      [attr.aria-expanded]="open"
      (click)="open = !open"
    >
      <span>{{ label }}</span>
      <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>
    <div [ngClass]="open ? '' : 'd-none d-' + breakpoint + '-block'">
      <ng-content></ng-content>
    </div>
  `,
})
export class SidePanelComponent {
  @Input() label = '';
  /** Bootstrap breakpoint from which the panel is always shown. */
  @Input() breakpoint: 'lg' | 'xl' = 'lg';
  open = false;
}
