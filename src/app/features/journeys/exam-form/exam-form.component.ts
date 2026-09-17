import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { JourneyService } from '../../../core/services/journey.service';
import { ExamService, QuestionDraft } from '../../../core/services/exam.service';
import { ToastService } from '../../../core/services/toast.service';
import { Journey, Exam } from '../../../core/models/models';
import { QuestionTypeCode, codeOf, optionCodeFor } from '../../../core/models/enums';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { QuestionEditorComponent, QuestionRow, blankQuestion, toQuestionDraft } from '../../../shared/components/question-editor/question-editor.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-exam-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent, QuestionEditorComponent, TranslatePipe],
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
          this.questions = [blankQuestion()];
        }
        this.loading = false;
      },
      error: () => {
        this.toast.error(this.translate.instant('JOURNEY.NOT_FOUND'));
        this.router.navigate(['/journeys']);
      },
    });
  }

  addQuestion(): void { this.questions.push(blankQuestion()); }
  removeQuestion(index: number): void { this.questions.splice(index, 1); }

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
    const drafts: QuestionDraft[] = this.questions.map(toQuestionDraft);

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
