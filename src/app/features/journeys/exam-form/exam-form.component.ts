import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { JourneyService } from '../../../core/services/journey.service';
import { ExamService, QuestionDraft } from '../../../core/services/exam.service';
import { ToastService } from '../../../core/services/toast.service';
import { Journey, Exam } from '../../../core/models/models';
import { EnumValue, QUESTION_TYPES, QuestionTypeCode, codeOf, optionCodeFor, optionIndexOf } from '../../../core/models/enums';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { forkJoin } from 'rxjs';

interface QuestionRow extends QuestionDraft {
  options: string[];
}

@Component({
  selector: 'app-exam-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent, TranslatePipe],
  templateUrl: './exam-form.component.html',
})
export class ExamFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private journeyService = inject(JourneyService);
  private examService = inject(ExamService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  questionTypes = QUESTION_TYPES;
  QuestionTypeCode = QuestionTypeCode;
  optionCodeFor = optionCodeFor;

  /** Question-type wording comes from the enum triple, so it follows the active language. */
  typeLabel(type: EnumValue): string {
    return this.lang.label(type);
  }

  journey: Journey | null = null;
  isEdit = false;
  loading = true;
  saving = false;
  error = '';
  showDeleteConfirm = false;

  title = '';
  passingScorePercent = 70;
  questions: QuestionRow[] = [];

  ngOnInit(): void {
    const journeyId = this.route.snapshot.paramMap.get('id')!;

    forkJoin({
      journey: this.journeyService.getJourneyById(journeyId),
      exam: this.examService.getExamForJourney(journeyId),
    }).subscribe({
      next: ({ journey, exam }: { journey: Journey; exam: Exam | null }) => {
        this.journey = journey;
        if (exam) {
          this.isEdit = true;
          this.title = exam.title;
          this.passingScorePercent = exam.passingScorePercent;
          this.questions = exam.questions.map((q) => ({
            id: q.id,
            type: codeOf(q.type) ?? QuestionTypeCode.MultipleChoice,
            prompt: q.prompt,
            options: q.options?.length ? [...q.options] : ['', ''],
            correctOptionIndex: q.correctOptionIndex ?? optionCodeFor(0),
            correctBoolAnswer: q.correctBoolAnswer ?? true,
          }));
        } else {
          this.title = `${journey.title} — checkpoint exam`;
          this.questions = [this.blankQuestion()];
        }
        this.loading = false;
      },
      error: () => {
        this.toast.error(this.translate.instant('JOURNEY.NOT_FOUND'));
        this.router.navigate(['/journeys']);
      },
    });
  }

  private blankQuestion(): QuestionRow {
    return {
      type: QuestionTypeCode.MultipleChoice,
      prompt: '',
      options: ['', ''],
      correctOptionIndex: optionCodeFor(0),
      correctBoolAnswer: true,
    };
  }

  addQuestion(): void { this.questions.push(this.blankQuestion()); }
  removeQuestion(index: number): void { this.questions.splice(index, 1); }
  addOption(q: QuestionRow): void { q.options.push(''); }
  removeOption(q: QuestionRow, optIndex: number): void {
    q.options.splice(optIndex, 1);
    if ((optionIndexOf(q.correctOptionIndex) ?? 0) >= q.options.length) {
      q.correctOptionIndex = optionCodeFor(0);
    }
  }
  onTypeChange(q: QuestionRow): void {
    if (q.type === QuestionTypeCode.MultipleChoice && q.options.length < 2) q.options = ['', ''];
  }

  submit(): void {
    this.error = '';
    if (!this.journey) return;
    if (!this.title.trim()) { this.error = this.translate.instant('EXAM.NEEDS_TITLE'); return; }
    if (!this.questions.length) { this.error = this.translate.instant('EXAM.NEEDS_QUESTION'); return; }
    for (const q of this.questions) {
      if (!q.prompt.trim()) { this.error = this.translate.instant('EXAM.NEEDS_PROMPT'); return; }
      if (q.type === QuestionTypeCode.MultipleChoice && q.options.filter((o) => o.trim()).length < 2) {
        this.error = this.translate.instant('EXAM.NEEDS_OPTIONS', { prompt: q.prompt });
        return;
      }
    }

    this.saving = true;
    const drafts: QuestionDraft[] = this.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt.trim(),
      options: q.type === QuestionTypeCode.MultipleChoice ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
      correctOptionIndex: q.type === QuestionTypeCode.MultipleChoice ? q.correctOptionIndex : undefined,
      correctBoolAnswer: q.type === QuestionTypeCode.YesNo ? q.correctBoolAnswer : undefined,
    }));

    this.examService.saveExam(this.journey.id, { title: this.title.trim(), passingScorePercent: this.passingScorePercent }, drafts, this.auth.currentUser!).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.translate.instant(this.isEdit ? 'EXAM.UPDATED' : 'EXAM.CREATED'));
        this.router.navigate(['/journeys']);
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.message ?? this.translate.instant('COMMON.SAVE_FAILED');
      },
    });
  }

  confirmDeleteExam(): void {
    if (!this.journey) return;
    this.examService.deleteExam(this.journey.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.toast.success(this.translate.instant('EXAM.REMOVED'));
        this.router.navigate(['/journeys']);
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? this.translate.instant('COMMON.DELETE_FAILED')),
    });
  }
}
