import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exam, ExamAttempt, User } from '../models/models';
import { QuestionType } from '../models/enums';
import { API_BASE } from './api.config';

export interface QuestionDraft {
  id?: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolAnswer?: boolean;
}

export interface AnswerDraft {
  questionId: string;
  selectedOptionIndex?: number;
  boolAnswer?: boolean;
  openText?: string;
}

@Injectable({ providedIn: 'root' })
export class ExamService {
  private http = inject(HttpClient);

  // ----------------------------- Exam template --------------------------

  // GET /api/journeys/:journeyId/exam → Exam | null
  getExamForJourney(journeyId: string): Observable<Exam | null> {
    return this.http.get<Exam | null>(`${API_BASE}/journeys/${journeyId}/exam`);
  }

  // POST /api/journeys/:journeyId/exam  (create or replace)
  saveExam(
    journeyId: string,
    data: { title: string; passingScorePercent: number },
    questions: QuestionDraft[],
    actor: User,
  ): Observable<Exam> {
    return this.http.post<Exam>(`${API_BASE}/journeys/${journeyId}/exam`, {
      ...data,
      questions,
      createdById: actor.id,
      createdByName: actor.name,
    });
  }

  // DELETE /api/journeys/:journeyId/exam
  deleteExam(journeyId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/journeys/${journeyId}/exam`);
  }

  // ----------------------------- Attempts ------------------------------

  // GET /api/learner-journeys/:learnerJourneyId/exam-attempt → ExamAttempt | null
  getAttempt(learnerJourneyId: string): Observable<ExamAttempt | null> {
    return this.http.get<ExamAttempt | null>(`${API_BASE}/learner-journeys/${learnerJourneyId}/exam-attempt`);
  }

  // POST /api/learner-journeys/:learnerJourneyId/exam-attempt  body: { examId, answers }
  submitAttempt(learnerJourneyId: string, examId: string, answers: AnswerDraft[]): Observable<ExamAttempt> {
    return this.http.post<ExamAttempt>(
      `${API_BASE}/learner-journeys/${learnerJourneyId}/exam-attempt`,
      { examId, answers },
    );
  }

  // PATCH /api/exam-attempts/:id/grade  body: { marks, passed }
  gradeAttempt(
    attemptId: string,
    marks: { questionId: string; markedCorrect: boolean }[],
    passed: boolean,
    grader: User,
  ): Observable<ExamAttempt> {
    return this.http.patch<ExamAttempt>(`${API_BASE}/exam-attempts/${attemptId}/grade`, {
      marks,
      passed,
      gradedById: grader.id,
      gradedByName: grader.name,
    });
  }
}
