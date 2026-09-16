import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { RoleCode } from '../../../core/models/enums';
import { User } from '../../../core/models/models';
import { ModalComponent } from '../modal/modal.component';

/**
 * "Pick a learner" dialog for assigning a journey or a package. It loads the learners the caller
 * may assign to (a Senior their own; others whoever the server lets them see) each time it opens.
 * Performing the assignment is the parent's job:
 *
 *   <app-assign-learner-modal [open]="!!assigning" [title]="…" [busy]="saving"
 *     (confirmed)="assign($event)" (dismissed)="assigning = null"></app-assign-learner-modal>
 */
@Component({
  selector: 'app-assign-learner-modal',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, TranslatePipe, ModalComponent],
  template: `
    <app-modal [open]="open" (dismissed)="dismissed.emit()">
      <h3 class="h5 mb-2 user-content">{{ title }}</h3>
      <p class="small text-body-secondary mb-3" *ngIf="subtitle">{{ subtitle }}</p>

      <label for="assign-learner" class="form-label">{{ 'JOURNEY.LEARNER' | translate }}</label>
      <select id="assign-learner" class="form-select" [(ngModel)]="learnerId">
        <option value="" disabled>{{ 'JOURNEY.SELECT_LEARNER' | translate }}</option>
        <option *ngFor="let l of learners" [value]="l.id">{{ l.name }}</option>
      </select>
      <p class="form-text" *ngIf="loaded && !learners.length">{{ 'JOURNEY.NO_LEARNERS' | translate }}</p>

      <div modal-actions>
        <button class="btn btn-outline-secondary flex-fill" (click)="dismissed.emit()">{{ 'COMMON.CANCEL' | translate }}</button>
        <button class="btn btn-primary flex-fill" [disabled]="!learnerId || busy" (click)="confirm()">
          {{ (busy ? 'JOURNEY.ASSIGNING' : 'COMMON.ASSIGN') | translate }}
        </button>
      </div>
    </app-modal>
  `,
})
export class AssignLearnerModalComponent implements OnChanges {
  private auth = inject(AuthService);
  private userService = inject(UserService);

  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<User>();
  @Output() dismissed = new EventEmitter<void>();

  learners: User[] = [];
  learnerId = '';
  loaded = false;

  confirm(): void {
    const learner = this.learners.find((l) => l.id === this.learnerId);
    if (learner) this.confirmed.emit(learner);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.learnerId = '';
      this.loaded = false;
      const me = this.auth.currentUser!;
      const source = this.auth.hasRole(RoleCode.Senior)
        ? this.userService.getLearnersBySenior(me.id)
        : this.userService.getLearners();
      source.subscribe((learners) => {
        this.learners = learners;
        this.loaded = true;
      });
    }
  }
}
