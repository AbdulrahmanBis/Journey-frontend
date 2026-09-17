import { Component, DestroyRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { LearnerUnitService } from '../../../core/services/learner-unit.service';
import { PackageService } from '../../../core/services/package.service';
import { CertificateService } from '../../../core/services/certificate.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { ItemContent, JourneyOutline, OutlineUnit, PackageContext, User } from '../../../core/models/models';
import {
  EnumValue,
  ORG_VIEW_ROLES,
  STAFF_ROLES,
  STATUS_ORDER,
  StatusCode,
  codeOf,
  statusSlug,
  toggleButtonClass,
} from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { NoteThreadComponent } from '../../../shared/components/note-thread/note-thread.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AttachmentViewComponent } from '../../../shared/components/attachment-view/attachment-view.component';
import { DueBadgeComponent, todayIso } from '../../../shared/components/due-badge/due-badge.component';
import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { JourneyOutlineComponent, LogStep, stepKey } from './journey-outline.component';
import { UnitQuizComponent } from './unit-quiz.component';
import { RichLinksDirective } from '../../../shared/directives/rich-links.directive';
import { UnitReviewComponent } from './unit-review.component';
import { apiErrorMessage, openErrorPage } from '../../../core/services/api-error';

/** How often active reading time is reported, and how recent an interaction must be to count. */
const HEARTBEAT_SECONDS = 30;
const IDLE_AFTER_MS = 60_000;

/**
 * A journey, one step at a time: the contents on the side (units → items, quiz; final exam), the
 * selected item's content in the middle, and "Continue" to move on.
 *
 * <p>For the learner, opening an item marks it in progress, Continue marks it completed, and time is
 * recorded while the page is open and they are active. A unit goes to review by itself once its items
 * and quiz are done. Reviewers read the same page and act on units (complete, or send back with a note).
 *
 * <p>The selection lives in the URL (?item= / ?quiz= / ?unit=), so the learner home and notifications can
 * link straight to a step, and Back works.
 */
@Component({
  selector: 'app-journey-log',
  standalone: true,
  imports: [
    RichLinksDirective,
    CommonModule, FormsModule, RouterLink, TranslatePipe,
    StatusBadgeComponent, NoteThreadComponent, ConfirmDialogComponent, AttachmentViewComponent, DueBadgeComponent,
    SidePanelComponent, JourneyOutlineComponent, UnitQuizComponent, UnitReviewComponent,
  ],
  templateUrl: './journey-log.component.html',
})
export class JourneyLogComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private assignments = inject(AssignmentService);
  private units = inject(LearnerUnitService);
  private packageService = inject(PackageService);
  private certificates = inject(CertificateService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  lang = inject(LanguageService);

  readonly STATUS_ORDER = STATUS_ORDER;
  readonly statusSlug = statusSlug;
  readonly toggleButtonClass = toggleButtonClass;
  readonly minDueDate = todayIso();

  outline: JourneyOutline | null = null;
  loading = true;
  selection: LogStep | null = null;
  content: ItemContent | null = null;
  contentLoading = false;
  showNotes = false;
  busy = false;

  packages: PackageContext[] = [];
  /** Set once the journey is completed and its certificate exists. */
  certificateId: string | null = null;
  editingDue = false;
  dueDraft = '';
  showCancelConfirm = false;

  private journeyId = '';
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastInteraction = Date.now();

  get currentUser(): User { return this.auth.currentUser!; }

  /** The signed-in person is the learner on this journey. */
  get isLearner(): boolean { return !!this.outline && this.outline.learnerId === this.currentUser.id; }

  /** Anyone else from staff who can open it reviews (the server decides who actually may). */
  get isReviewer(): boolean { return !this.isLearner && this.auth.hasRole(...STAFF_ROLES); }

  get canOverrideJourneyStatus(): boolean { return !this.isLearner && this.auth.hasRole(...ORG_VIEW_ROLES); }

  get selectedKey(): string { return stepKey(this.selection); }

  /** Items and quizzes in order: what Previous / Continue walk through. */
  get steps(): LogStep[] {
    if (!this.outline) return [];
    const steps: LogStep[] = [];
    for (const unit of this.outline.units) {
      for (const item of unit.items) steps.push({ kind: 'item', unit, item });
      if (unit.quiz) steps.push({ kind: 'quiz', unit });
    }
    return steps;
  }

  get stepIndex(): number {
    const key = this.selectedKey;
    return this.steps.findIndex((s) => stepKey(s) === key);
  }

  get previousStep(): LogStep | null {
    const i = this.stepIndex;
    return i > 0 ? this.steps[i - 1] : null;
  }

  get nextStep(): LogStep | null {
    const i = this.stepIndex;
    return i >= 0 && i < this.steps.length - 1 ? this.steps[i + 1] : null;
  }

  stepTitle(step: LogStep | null): string {
    if (!step) return '';
    if (step.kind === 'item') return step.item.title;
    return this.translate.instant(step.kind === 'quiz' ? 'LOG.QUIZ_OF' : 'LOG.UNIT_OF', { unit: step.unit.title });
  }

  /** The selected unit, current and fresh from the latest outline. */
  get selectedUnit(): OutlineUnit | null { return this.selection?.unit ?? null; }

  unitClosed(unit: OutlineUnit): boolean {
    const code = codeOf(unit.status);
    return code === StatusCode.Completed || code === StatusCode.Cancelled;
  }

  isRichText(description: string | null | undefined): boolean {
    return /<[a-z][\s\S]*>/i.test(description ?? '');
  }

  plainLines(description: string | null | undefined): string[] {
    return (description ?? '').split('\n').filter((line) => line.trim().length > 0);
  }

  // ─── Loading and selection ───────────────────────────────────────────────

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => this.load(params.get('id')!));
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.outline) this.applySelection(params);
    });
    this.heartbeat = setInterval(() => this.reportTime(), HEARTBEAT_SECONDS * 1000);
  }

  ngOnDestroy(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
  }

  private load(id: string): void {
    this.journeyId = id;
    this.loading = true;
    this.outline = null;
    this.selection = null;
    this.content = null;
    this.packages = [];
    this.units.outline(id).subscribe({
      next: (outline) => {
        this.outline = outline;
        this.loading = false;
        this.applySelection(this.route.snapshot.queryParamMap);
        this.loadPackages();
        this.loadCertificate();
      },
      error: (err) => openErrorPage(this.router, err),
    });
  }

  /** Refreshes statuses after a change, keeping the selection. */
  reloadOutline(): void {
    this.units.outline(this.journeyId).subscribe((outline) => {
      this.outline = outline;
      this.selection = this.resolve(this.selectedKey) ?? this.selection;
      this.loadPackages();
      this.loadCertificate();
    });
  }

  select(step: LogStep): void {
    const queryParams = step.kind === 'item' ? { item: step.item.progressId }
      : step.kind === 'quiz' ? { quiz: step.unit.learnerUnitId } : { unit: step.unit.learnerUnitId };
    this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  private applySelection(params: ParamMap): void {
    const key = params.get('item') ? 'item:' + params.get('item')
      : params.get('quiz') ? 'quiz:' + params.get('quiz')
      : params.get('unit') ? 'unit:' + params.get('unit') : '';
    const step = (key && this.resolve(key)) || this.defaultStep();
    if (!step) return;
    this.selection = step;
    this.showNotes = false;
    if (step.kind === 'item') this.openItem(step);
    else this.content = null;
  }

  private resolve(key: string): LogStep | null {
    if (!this.outline || !key) return null;
    const [kind, id] = key.split(':');
    for (const unit of this.outline.units) {
      if (kind === 'item') {
        const item = unit.items.find((i) => i.progressId === id);
        if (item) return { kind: 'item', unit, item };
      } else if (unit.learnerUnitId === id) {
        return kind === 'quiz' && unit.quiz ? { kind: 'quiz', unit } : { kind: 'unit', unit };
      }
    }
    return null;
  }

  /**
   * Where to start: the learner's first unfinished step; for a reviewer, the first unit waiting for
   * review; otherwise the first item.
   */
  private defaultStep(): LogStep | null {
    if (!this.outline) return null;
    if (this.isLearner) {
      const todo = this.steps.find((s) =>
        s.kind === 'item' ? codeOf(s.item.status) !== StatusCode.Completed : !s.unit.quiz?.answered);
      if (todo) return todo;
    } else {
      const waiting = this.outline.units.find((u) => codeOf(u.status) === StatusCode.Response);
      if (waiting) return { kind: 'unit', unit: waiting };
    }
    return this.steps[0] ?? null;
  }

  private openItem(step: Extract<LogStep, { kind: 'item' }>): void {
    this.contentLoading = true;
    const progressId = step.item.progressId;
    this.units.item(progressId).subscribe({
      next: (content) => {
        if (this.selection?.kind !== 'item' || this.selection.item.progressId !== progressId) return;
        this.content = content;
        this.contentLoading = false;
      },
      error: () => { this.contentLoading = false; },
    });
    if (this.isLearner && codeOf(step.item.status) === StatusCode.New) {
      this.units.open(progressId).subscribe({ next: () => this.reloadOutline(), error: () => undefined });
    }
  }

  // ─── Moving on ───────────────────────────────────────────────────────────

  /** Learner: completes the current item on the way. Everyone: goes to the next step. */
  continue(): void {
    const next = this.nextStep;
    const current = this.selection;
    const done = () => {
      if (next) this.select(next);
      else this.reloadOutline();
    };
    if (this.isLearner && current?.kind === 'item' && codeOf(current.item.status) !== StatusCode.Completed) {
      this.busy = true;
      this.units.complete(current.item.progressId).subscribe({
        next: () => { this.busy = false; this.reloadOutline(); done(); },
        error: (err: any) => { this.busy = false; this.toast.error(apiErrorMessage(err) ?? this.translate.instant('COMMON.UPDATE_FAILED')); },
      });
      return;
    }
    done();
  }

  previous(): void {
    const prev = this.previousStep;
    if (prev) this.select(prev);
  }

  openExam(): void {
    this.router.navigate(['/exam', this.journeyId]);
  }

  onQuizSubmitted(): void {
    this.reloadOutline();
  }

  // ─── Time on item ────────────────────────────────────────────────────────

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:scroll')
  @HostListener('document:touchstart')
  markActive(): void {
    this.lastInteraction = Date.now();
  }

  /** Counts time only while the learner has an item open, the tab is visible and they were recently active. */
  private reportTime(): void {
    if (!this.isLearner || this.selection?.kind !== 'item') return;
    if (document.visibilityState !== 'visible' || Date.now() - this.lastInteraction > IDLE_AFTER_MS) return;
    this.units.addTime(this.selection.item.progressId, HEARTBEAT_SECONDS).subscribe({ error: () => undefined });
  }

  // ─── Notes, journey status, due date, packages ───────────────────────────

  addItemNote(message: string): void {
    if (!this.content) return;
    const progressId = this.content.progressId;
    this.assignments.addNote(progressId, message, this.currentUser).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('QUEST_LOG.NOTE_ADDED'));
        this.units.item(progressId).subscribe((content) => { if (this.content?.progressId === progressId) this.content = content; });
        this.reloadOutline();
      },
      error: (err: any) => this.toast.error(apiErrorMessage(err) ?? this.translate.instant('QUEST_LOG.NOTE_FAILED')),
    });
  }

  setJourneyStatus(status: EnumValue): void {
    if (!this.outline || codeOf(this.outline.status) === status.code) return;
    if (status.code === StatusCode.Cancelled) { this.showCancelConfirm = true; return; }
    this.assignments.updateJourneyStatus(this.journeyId, status.code).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('QUEST_LOG.STATUS_CHANGED', { status: this.lang.label(status) }));
        this.reloadOutline();
      },
      error: (err: any) => this.toast.error(apiErrorMessage(err) ?? this.translate.instant('COMMON.UPDATE_FAILED')),
    });
  }

  confirmCancelJourney(): void {
    this.assignments.updateJourneyStatus(this.journeyId, StatusCode.Cancelled).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('QUEST_LOG.CANCELLED'));
        this.showCancelConfirm = false;
        this.reloadOutline();
      },
      error: (err: any) => this.toast.error(apiErrorMessage(err) ?? this.translate.instant('QUEST_LOG.CANCEL_FAILED')),
    });
  }

  startDueEdit(): void {
    this.dueDraft = this.outline?.dueDate ?? '';
    this.editingDue = true;
  }

  saveDue(): void {
    this.assignments.updateDueDate(this.journeyId, this.dueDraft || null).subscribe({
      next: () => {
        this.editingDue = false;
        this.toast.success(this.translate.instant('DUE.SAVED'));
        this.reloadOutline();
      },
      error: (err: any) => this.toast.error(apiErrorMessage(err) ?? this.translate.instant('COMMON.SAVE_FAILED')),
    });
  }

  get finished(): boolean { return (this.outline?.percentComplete ?? 0) >= 100; }

  /** Completed journeys link to their certificate. */
  private loadCertificate(): void {
    const outline = this.outline;
    if (!outline || codeOf(outline.status) !== StatusCode.Completed) { this.certificateId = null; return; }
    this.certificates.list(outline.learnerId).subscribe({
      next: (list) => (this.certificateId = list.find((c) => c.learnerJourneyId === outline.learnerJourneyId)?.id ?? null),
      error: () => (this.certificateId = null),
    });
  }

  private loadPackages(): void {
    const id = this.journeyId;
    this.packageService.contextFor(id).subscribe({
      next: (contexts) => { if (this.journeyId === id) this.packages = contexts; },
      error: () => (this.packages = []),
    });
  }

  openNextJourney(context: PackageContext): void {
    if (context.nextLearnerJourneyId) this.router.navigate(['/journey-log', context.nextLearnerJourneyId]);
  }
}
