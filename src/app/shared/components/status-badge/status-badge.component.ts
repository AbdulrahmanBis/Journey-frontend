import { Component, Input, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { EnumValue, statusChipClass } from '../../../core/models/enums';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="badge rounded-pill d-inline-flex align-items-center gap-1" [ngClass]="chipClass">
      <span class="status-dot"></span>
      {{ label }}
    </span>
  `,
  styles: [
    `
      .status-dot {
        flex-shrink: 0;
        width: 0.375rem;
        height: 0.375rem;
        border-radius: 50%;
        background: currentColor;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  private lang = inject(LanguageService);

  @Input({ required: true }) status!: EnumValue;

  /** Enum wording comes from the API triple, picked for the active language. */
  get label(): string {
    return this.lang.label(this.status);
  }

  /** Keyed off the local slug, not the server text, so styling survives relabelling. */
  get chipClass(): string {
    return statusChipClass(this.status);
  }
}
