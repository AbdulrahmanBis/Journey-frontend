import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let counter = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  show(message: string, type: ToastType = 'info', durationMs = 3200): void {
    const toast: Toast = { id: ++counter, message, type };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 4200);
  }

  dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
  }
}
