import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { JourneyService } from '../../../core/services/journey.service';
import { ExamService, QuestionDraft } from '../../../core/services/exam.service';
import { ToastService } from '../../../core/services/toast.service';
import { Journey, Exam } from '../../../core/models/models';
import { QUESTION_TYPES, QUESTION_TYPE_LABEL, QuestionType } from '../../../core/models/enums';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { forkJoin } from 'rxjs';

interface QuestionRow extends QuestionDraft {
  options: string[];
}

@Component({
  selector: 'app-exam-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './exam-form.component.html',
  styleUrl: './exam-form.component.scss',
})
export class ExamFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private journeyService = inject(JourneyService);
  private examService = inject(ExamService);
  private toast = inject(ToastService);

  questionTypes = QUESTION_TYPES;
  typeLabel = QUESTION_TYPE_LABEL;

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
            type: q.type,
            prompt: q.prompt,
            options: q.options?.length ? [...q.options] : ['', ''],
            correctOptionIndex: q.correctOptionIndex ?? 0,
            correctBoolAnswer: q.correctBoolAnswer ?? true,
          }));
        } else {
          this.title = `${journey.title} — checkpoint exam`;
          this.questions = [this.blankQuestion()];
        }
        this.loading = false;
      },
      error: () => {
        this.toast.error('Journey not found.');
        this.router.navigate(['/journeys']);
      },
    });
  }

  private blankQuestion(): QuestionRow {
    return { type: 'multiple_choice', prompt: '', options: ['', ''], correctOptionIndex: 0, correctBoolAnswer: true };
  }

  addQuestion(): void { this.questions.push(this.blankQuestion()); }
  removeQuestion(index: number): void { this.questions.splice(index, 1); }
  addOption(q: QuestionRow): void { q.options.push(''); }
  removeOption(q: QuestionRow, optIndex: number): void {
    q.options.splice(optIndex, 1);
    if ((q.correctOptionIndex ?? 0) >= q.options.length) q.correctOptionIndex = 0;
  }
  onTypeChange(q: QuestionRow): void {
    if (q.type === 'multiple_choice' && q.options.length < 2) q.options = ['', ''];
  }

  submit(): void {
    this.error = '';
    if (!this.journey) return;
    if (!this.title.trim()) { this.error = 'Give the exam a title.'; return; }
    if (!this.questions.length) { this.error = 'Add at least one question.'; return; }
    for (const q of this.questions) {
      if (!q.prompt.trim()) { this.error = 'Every question needs a prompt.'; return; }
      if (q.type === 'multiple_choice' && q.options.filter((o) => o.trim()).length < 2) {
        this.error = `"${q.prompt}" needs at least two options.`; return;
      }
    }

    this.saving = true;
    const drafts: QuestionDraft[] = this.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt.trim(),
      options: q.type === 'multiple_choice' ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
      correctOptionIndex: q.type === 'multiple_choice' ? q.correctOptionIndex : undefined,
      correctBoolAnswer: q.type === 'yes_no' ? q.correctBoolAnswer : undefined,
    }));

    this.examService.saveExam(this.journey.id, { title: this.title.trim(), passingScorePercent: this.passingScorePercent }, drafts, this.auth.currentUser!).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.isEdit ? 'Exam updated.' : 'Exam created.');
        this.router.navigate(['/journeys']);
      },
      error: (err: any) => { this.saving = false; this.error = err?.error?.message ?? 'Save failed.'; },
    });
  }

  confirmDeleteExam(): void {
    if (!this.journey) return;
    this.examService.deleteExam(this.journey.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.toast.success('Exam removed.');
        this.router.navigate(['/journeys']);
      },
      error: (err: any) => this.toast.error(err?.error?.message ?? 'Delete failed.'),
    });
  }
}
