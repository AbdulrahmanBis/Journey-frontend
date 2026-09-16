import { Component, Input, inject } from '@angular/core';
import { EnumValue, statusSlug } from '../../../core/models/enums';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge" [style.color]="color" [style.background]="bg">
      <span class="badge-dot" [style.background]="color"></span>
      {{ label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  private lang = inject(LanguageService);

  @Input({ required: true }) status!: EnumValue;

  /** Enum wording comes from the API triple, picked for the active language. */
  get label(): string {
    return this.lang.label(this.status);
  }

  /** CSS keys off the local slug, not the server text, so styling survives relabelling. */
  get color(): string {
    return `var(--status-${statusSlug(this.status)})`;
  }

  get bg(): string {
    return `var(--status-${statusSlug(this.status)}-bg)`;
  }
}
