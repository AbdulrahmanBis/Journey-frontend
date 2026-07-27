import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  template: `
    <div class="ring-wrap" [style.width.px]="size" [style.height.px]="size">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size">
        <circle
          [attr.cx]="size / 2"
          [attr.cy]="size / 2"
          [attr.r]="radius"
          fill="none"
          stroke="var(--border)"
          [attr.stroke-width]="stroke"
        />
        <circle
          [attr.cx]="size / 2"
          [attr.cy]="size / 2"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="ringColor"
          [attr.stroke-width]="stroke"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset"
          [attr.transform]="'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'"
        />
      </svg>
      <span class="ring-label" [style.fontSize.px]="size / 4.2">{{ percent }}%</span>
    </div>
  `,
  styles: [
    `
      .ring-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      svg {
        width: 100%;
        height: 100%;
        transition: stroke-dashoffset 0.4s ease;
      }
      .ring-label {
        position: absolute;
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--ink);
      }
    `,
  ],
})
export class ProgressRingComponent {
  @Input() percent = 0;
  @Input() size = 56;
  @Input() stroke = 6;

  get radius(): number {
    return this.size / 2 - this.stroke;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get dashOffset(): number {
    return this.circumference * (1 - Math.min(100, Math.max(0, this.percent)) / 100);
  }

  get ringColor(): string {
    if (this.percent >= 100) return 'var(--status-completed)';
    if (this.percent > 0) return 'var(--brand)';
    return 'var(--status-new)';
  }
}
