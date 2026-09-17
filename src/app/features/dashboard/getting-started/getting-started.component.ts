import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { EnumValue, RoleCode, codeOf } from '../../../core/models/enums';
import { API_BASE } from '../../../core/services/api.config';

interface GettingStarted {
  role: EnumValue;
  dismissed: boolean;
  steps: { key: string; done: boolean; link?: string }[];
}

/**
 * First steps for managers, seniors and HR, at the top of their dashboard. Each step ticks itself from real
 * data (the server decides); the person can hide the card for good.
 */
@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, RouterLink, TranslatePipe],
  template: `
    <section class="card card-body mb-4 gap-3" *ngIf="data && !data.dismissed && data.steps.length">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <span class="page-eyebrow">{{ 'START.EYEBROW' | translate }}</span>
          <h2 class="h5 mb-1">{{ (allDone ? 'START.ALL_DONE' : 'START.TITLE') | translate }}</h2>
          <p class="small text-body-secondary mb-0" dir="auto">{{ 'START.PROGRESS' | translate: { done: doneCount, total: data.steps.length } }}</p>
        </div>
        <button type="button" class="btn btn-link btn-sm link-secondary px-0" (click)="dismiss()">{{ 'START.HIDE' | translate }}</button>
      </div>
      <div class="progress progress-thin" role="progressbar" [attr.aria-valuenow]="doneCount" aria-valuemin="0" [attr.aria-valuemax]="data.steps.length">
        <div class="progress-bar" [style.width.%]="(doneCount * 100) / data.steps.length"></div>
      </div>
      <ol class="list-unstyled mb-0 d-flex flex-column gap-2">
        <li class="d-flex align-items-start gap-2" *ngFor="let step of data.steps">
          <span class="badge rounded-pill mt-1" [ngClass]="step.done ? 'bg-completed-subtle text-completed-emphasis' : 'bg-light text-body-tertiary'" aria-hidden="true">{{ step.done ? '✓' : '·' }}</span>
          <span class="flex-grow-1">
            <span class="d-block fw-semibold" [class.text-body-tertiary]="step.done">{{ prefix + step.key + '.TITLE' | translate }}</span>
            <span class="d-block small text-body-secondary" *ngIf="!step.done">{{ prefix + step.key + '.HINT' | translate }}</span>
          </span>
          <a class="btn btn-outline-primary btn-sm flex-shrink-0" *ngIf="!step.done && step.link" [routerLink]="step.link">{{ 'START.GO' | translate }}</a>
        </li>
      </ol>
    </section>
  `,
})
export class GettingStartedComponent implements OnInit {
  private http = inject(HttpClient);

  data: GettingStarted | null = null;

  get doneCount(): number { return this.data?.steps.filter((s) => s.done).length ?? 0; }
  get allDone(): boolean { return !!this.data && this.doneCount === this.data.steps.length; }

  /** Step wording is per role: START.MANAGER.SENIORS.TITLE and so on. */
  get prefix(): string {
    const code = codeOf(this.data?.role);
    return code === RoleCode.Manager ? 'START.MANAGER.' : code === RoleCode.Senior ? 'START.SENIOR.' : 'START.HR.';
  }

  ngOnInit(): void {
    this.http.get<GettingStarted>(`${API_BASE}/getting-started`).subscribe({
      next: (data) => (this.data = data),
      error: () => (this.data = null),
    });
  }

  dismiss(): void {
    if (this.data) this.data = { ...this.data, dismissed: true };
    this.http.post(`${API_BASE}/getting-started/dismiss`, {}).subscribe({ error: () => undefined });
  }
}
