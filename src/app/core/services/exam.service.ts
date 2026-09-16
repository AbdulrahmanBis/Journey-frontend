import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exam, ExamAttempt, User } from '../models/models';
import { API_BASE } from './api.config';

export interface QuestionDraft {
  id?: string;
  /** Numeric QuestionTypeCode. */
  type: number;
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

  getExamForJourney(journeyId: string): Observable<Exam | null> {
    return this.http.get<Exam | null>(`${API_BASE}/journeys/${journeyId}/exam`);
  }

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

  deleteExam(journeyId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/journeys/${journeyId}/exam`);
  }

  // ----------------------------- Attempts ------------------------------

  getAttempt(learnerJourneyId: string): Observable<ExamAttempt | null> {
    return this.http.get<ExamAttempt | null>(`${API_BASE}/learner-journeys/${learnerJourneyId}/exam-attempt`);
  }

  submitAttempt(learnerJourneyId: string, examId: string, answers: AnswerDraft[]): Observable<ExamAttempt> {
    return this.http.post<ExamAttempt>(
      `${API_BASE}/learner-journeys/${learnerJourneyId}/exam-attempt`,
      { examId, answers },
    );
  }

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
