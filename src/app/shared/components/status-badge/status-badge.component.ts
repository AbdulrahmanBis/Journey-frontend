import { Component, Input } from '@angular/core';
import { Status, STATUS_LABEL } from '../../../core/models/enums';

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
  @Input({ required: true }) status!: Status;

  get label(): string {
    return STATUS_LABEL[this.status];
  }

  get color(): string {
    return `var(--status-${this.status})`;
  }

  get bg(): string {
    return `var(--status-${this.status}-bg)`;
  }
}
