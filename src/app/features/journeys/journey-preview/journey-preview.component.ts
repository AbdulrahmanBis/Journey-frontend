import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { JourneyOutline, JourneyPreview, OutlineItem, OutlineUnit } from '../../../core/models/models';
import { STAFF_ROLES, STATUS_ORDER } from '../../../core/models/enums';
import { AuthService } from '../../../core/services/auth.service';
import { JourneyService } from '../../../core/services/journey.service';
import { ToastService } from '../../../core/services/toast.service';
import { AttachmentViewComponent } from '../../../shared/components/attachment-view/attachment-view.component';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { RichLinksDirective } from '../../../shared/directives/rich-links.directive';
import { JourneyOutlineComponent, LogStep } from '../journey-log/journey-outline.component';
import { PreviewQuestionsComponent } from './preview-questions.component';
import { RichHtmlPipe } from '../../../shared/pipes/rich-html.pipe';
import { openErrorPage } from '../../../core/services/api-error';

type PreviewStep = LogStep | { kind: 'exam' };
type PreviewUnit = JourneyPreview['units'][number];

/**
 * A journey the way a learner goes through it — contents on the side, one item at a time, Continue — without
 * an assignment and without saving anything. Staff see everything and can try the quizzes and the exam;
 * a learner sees the first unit as a sample of what they would enroll in.
 *
 * The selection is in the URL (?item= / ?quiz= / ?unit= / ?exam), like the journey log.
 */
@Component({
  selector: 'app-journey-preview',
  standalone: true,
  imports: [
    CommonModule, RouterLink, TranslatePipe,
    AttachmentViewComponent, SidePanelComponent, RichLinksDirective, JourneyOutlineComponent, PreviewQuestionsComponent, RichHtmlPipe,
  ],
  templateUrl: './journey-preview.component.html',
})
export class JourneyPreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private journeys = inject(JourneyService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  preview: JourneyPreview | null = null;
  outline: JourneyOutline | null = null;
  lockedUnitIds: string[] = [];
  selection: PreviewStep | null = null;
  loading = true;

  get isStaff(): boolean { return this.auth.hasRole(...STAFF_ROLES); }

  /** Where "back" goes: the catalog page when opened from there (and always for learners), else the journeys list. */
  get backLink(): string[] {
    const fromCatalog = this.route.snapshot.queryParamMap.get('from') === 'catalog' || !this.isStaff;
    return fromCatalog && this.preview ? ['/catalog/journeys', this.preview.journey.id] : ['/journeys'];
  }

  get itemCount(): number {
    return this.preview?.units.reduce((n, u) => n + u.items.length, 0) ?? 0;
  }

  get selectedKey(): string {
    const s = this.selection;
    if (!s) return '';
    if (s.kind === 'exam') return 'exam';
    return s.kind === 'item' ? 'item:' + s.item.progressId : s.kind + ':' + s.unit.learnerUnitId;
  }

  /** Items, quizzes and (for staff) the exam, in order: what Previous / Continue walk through. */
  get steps(): PreviewStep[] {
    if (!this.outline) return [];
    const steps: PreviewStep[] = [];
    for (const unit of this.outline.units) {
      for (const item of unit.items) steps.push({ kind: 'item', unit, item });
      if (unit.quiz) steps.push({ kind: 'quiz', unit });
    }
    if (this.preview?.exam?.questions?.length) steps.push({ kind: 'exam' });
    return steps;
  }

  get previousStep(): PreviewStep | null {
    const i = this.steps.findIndex((s) => this.keyOf(s) === this.selectedKey);
    return i > 0 ? this.steps[i - 1] : null;
  }

  get nextStep(): PreviewStep | null {
    const steps = this.steps;
    const i = steps.findIndex((s) => this.keyOf(s) === this.selectedKey);
    const selected = this.selection;
    if (selected?.kind === 'unit') {
      const unitId = selected.unit.learnerUnitId;
      return steps.find((s) => s.kind !== 'exam' && s.unit.learnerUnitId === unitId) ?? null;
    }
    return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
  }

  stepTitle(step: PreviewStep | null): string {
    if (!step) return '';
    if (step.kind === 'exam') return this.translate.instant('LOG.FINAL_EXAM');
    if (step.kind === 'item') return step.item.title;
    return this.translate.instant(step.kind === 'quiz' ? 'LOG.QUIZ_OF' : 'LOG.UNIT_OF', { unit: step.unit.title });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => this.load(params.get('id')!));
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.outline) this.applySelection(params);
    });
  }

  private load(id: string): void {
    this.loading = true;
    this.journeys.getPreview(id).subscribe({
      next: (preview) => {
        this.preview = preview;
        this.outline = this.toOutline(preview);
        this.lockedUnitIds = preview.units.filter((u) => u.locked).map((u) => u.id);
        this.loading = false;
        this.applySelection(this.route.snapshot.queryParamMap);
      },
      error: (err) => openErrorPage(this.router, err),
    });
  }

  select(step: PreviewStep): void {
    const queryParams =
      step.kind === 'exam' ? { exam: 1 }
      : step.kind === 'item' ? { item: step.item.progressId }
      : step.kind === 'quiz' ? { quiz: step.unit.learnerUnitId } : { unit: step.unit.learnerUnitId };
    const from = this.route.snapshot.queryParamMap.get('from');
    this.router.navigate([], { relativeTo: this.route, queryParams: from ? { ...queryParams, from } : queryParams });
  }

  openExam(): void {
    if (this.preview?.exam?.questions?.length) this.select({ kind: 'exam' });
  }

  unitOf(step: { unit: OutlineUnit }): PreviewUnit | undefined {
    return this.preview?.units.find((u) => u.id === step.unit.learnerUnitId);
  }

  itemOf(step: { unit: OutlineUnit; item: OutlineItem }) {
    return this.unitOf(step)?.items.find((i) => i.id === step.item.progressId);
  }

  isRichText(description: string | null | undefined): boolean {
    return /<[a-z][\s\S]*>/i.test(description ?? '');
  }

  plainLines(description: string | null | undefined): string[] {
    return (description ?? '').split('\n').filter((line) => line.trim().length > 0);
  }

  private keyOf(step: PreviewStep): string {
    if (step.kind === 'exam') return 'exam';
    return step.kind === 'item' ? 'item:' + step.item.progressId : step.kind + ':' + step.unit.learnerUnitId;
  }

  private applySelection(params: ParamMap): void {
    if (!this.outline) return;
    let step: PreviewStep | null = null;
    if (params.has('exam') && this.preview?.exam?.questions?.length) {
      step = { kind: 'exam' };
    }
    for (const unit of this.outline.units) {
      if (step) break;
      const item = unit.items.find((i) => i.progressId === params.get('item'));
      if (item) step = { kind: 'item', unit, item };
      else if (params.get('quiz') === unit.learnerUnitId && unit.quiz) step = { kind: 'quiz', unit };
      else if (params.get('unit') === unit.learnerUnitId) step = { kind: 'unit', unit };
    }
    this.selection = step ?? this.steps[0] ?? null;
  }

  /** Shapes the preview like a learner's outline so the journey log's contents panel can show it. */
  private toOutline(p: JourneyPreview): JourneyOutline {
    const fresh = STATUS_ORDER[0];
    return {
      learnerJourneyId: '',
      learnerId: '',
      learnerName: '',
      journey: p.journey,
      status: fresh,
      percentComplete: 0,
      totalTimeSpentHours: 0,
      selfEnrolled: false,
      assignedById: '',
      assignedByName: '',
      units: p.units.map((u) => ({
        learnerUnitId: u.id,
        unitId: u.id,
        title: u.title,
        description: u.description,
        order: u.order,
        status: fresh,
        completedItems: 0,
        totalItems: u.items.length,
        quiz: u.quizQuestionCount ? { questionCount: u.quizQuestionCount, answered: false } : undefined,
        readyForReview: false,
        notes: [],
        items: u.items.map((i) => ({ progressId: i.id, journeyItemId: i.id, title: i.title, order: i.order, status: fresh, noteCount: 0 })),
      })),
      exam: p.exam ? { examId: 'preview', title: p.exam.title, open: !!p.exam.questions?.length } : undefined,
    };
  }
}
