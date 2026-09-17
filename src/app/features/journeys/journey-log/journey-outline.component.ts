import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { JourneyOutline, OutlineItem, OutlineUnit } from '../../../core/models/models';
import { AttemptStatusCode, StatusCode, codeOf, statusSlug } from '../../../core/models/enums';
import { DueBadgeComponent } from '../../../shared/components/due-badge/due-badge.component';

/** What is selected in the journey log. */
export type LogStep =
  | { kind: 'item'; unit: OutlineUnit; item: OutlineItem }
  | { kind: 'quiz'; unit: OutlineUnit }
  | { kind: 'unit'; unit: OutlineUnit };

/** Stable key for a step, for highlighting and the URL. */
export function stepKey(step: LogStep | null): string {
  if (!step) return '';
  return step.kind === 'item' ? 'item:' + step.item.progressId : step.kind + ':' + step.unit.learnerUnitId;
}

/**
 * The journey log's contents: units (expandable) with their items and quiz, and the final exam.
 * Free navigation — selecting a step never changes progress; the page decides what opening means.
 */
@Component({
  selector: 'app-journey-outline',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, TranslatePipe, DueBadgeComponent],
  templateUrl: './journey-outline.component.html',
  styleUrl: './journey-outline.component.scss',
})
export class JourneyOutlineComponent implements OnChanges {
  lang = inject(LanguageService);

  @Input({ required: true }) outline!: JourneyOutline;
  @Input() selectedKey = '';
  @Output() select = new EventEmitter<LogStep>();
  @Output() openExam = new EventEmitter<void>();

  readonly statusSlug = statusSlug;
  expanded = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    // Keep the unit holding the selection open, without collapsing ones the user opened.
    if (changes['selectedKey'] || changes['outline']) {
      const unit = this.outline?.units.find((u) => this.contains(u, this.selectedKey));
      if (unit) this.expanded.add(unit.learnerUnitId);
      else if (this.outline?.units.length && !this.expanded.size) this.expanded.add(this.outline.units[0].learnerUnitId);
    }
  }

  toggle(unit: OutlineUnit): void {
    this.expanded.has(unit.learnerUnitId) ? this.expanded.delete(unit.learnerUnitId) : this.expanded.add(unit.learnerUnitId);
  }

  isDone(item: OutlineItem): boolean { return codeOf(item.status) === StatusCode.Completed; }
  isStarted(item: OutlineItem): boolean { return codeOf(item.status) === StatusCode.Reflect; }

  unitDone(unit: OutlineUnit): boolean { return codeOf(unit.status) === StatusCode.Completed; }

  key(kind: 'item' | 'quiz' | 'unit', id: string): string { return kind + ':' + id; }

  get examState(): 'locked' | 'open' | 'submitted' | 'passed' | 'failed' | null {
    const exam = this.outline.exam;
    if (!exam) return null;
    if (exam.attemptStatus) {
      if (codeOf(exam.attemptStatus) === AttemptStatusCode.Graded) return exam.passed ? 'passed' : 'failed';
      if (codeOf(exam.attemptStatus) === AttemptStatusCode.Submitted) return 'submitted';
    }
    return exam.open ? 'open' : 'locked';
  }

  private contains(unit: OutlineUnit, key: string): boolean {
    return key === 'unit:' + unit.learnerUnitId || key === 'quiz:' + unit.learnerUnitId
      || unit.items.some((i) => key === 'item:' + i.progressId);
  }
}
