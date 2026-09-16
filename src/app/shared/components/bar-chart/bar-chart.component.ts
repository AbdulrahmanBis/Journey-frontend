import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { HoursBucket } from '../../../core/models/metrics';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [NgFor, NgIf, TranslatePipe],
  template: `
    <div *ngIf="buckets.length">
      <div class="bar-chart-track" [style.height.px]="height">
        <div class="bar-col" *ngFor="let b of buckets">
          <span class="bar-value" *ngIf="b.hours > 0">{{ b.hours }}</span>
          <div
            class="bar"
            [style.height.%]="maxHours ? (b.hours / maxHours) * 100 : 0"
            [style.minHeight.px]="b.hours > 0 ? 3 : 0"
          ></div>
        </div>
      </div>
      <div class="bar-chart-labels">
        <span class="bar-label" *ngFor="let b of buckets">{{ b.label }}</span>
      </div>
    </div>
    <p class="small text-body-tertiary py-2" *ngIf="!buckets.length">
      {{ 'METRICS.NO_HOURS' | translate }}
    </p>
  `,
  styles: [
    `
      :host { display: block; }
      .bar-chart-track {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        border-bottom: 1px solid var(--bs-border-color);
      }
      .bar-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        height: 100%;
        min-width: 0;
      }
      .bar-value {
        font-family: var(--bs-font-monospace);
        font-size: 10px;
        color: var(--bs-tertiary-color);
        margin-bottom: 3px;
        white-space: nowrap;
      }
      .bar {
        width: 100%;
        max-width: 26px;
        background: var(--bs-primary);
        border-radius: var(--bs-border-radius) var(--bs-border-radius) 0 0;
        transition: height 0.3s ease;
      }
      .bar-chart-labels {
        display: flex;
        gap: 6px;
        margin-top: 6px;
      }
      .bar-label {
        flex: 1;
        text-align: center;
        font-size: 10.5px;
        color: var(--bs-tertiary-color);
        font-family: var(--bs-font-monospace);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ],
})
export class BarChartComponent {
  @Input() buckets: HoursBucket[] = [];
  @Input() height = 120;

  get maxHours(): number {
    return Math.max(...this.buckets.map((b) => b.hours), 1);
  }
}
