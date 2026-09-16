import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Note } from '../../../core/models/models';
import { roleChipClass } from '../../../core/models/enums';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-note-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './note-thread.component.html',
  styleUrl: './note-thread.component.scss',
})
export class NoteThreadComponent {
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  @Input({ required: true }) notes: Note[] = [];
  @Input() currentUserId = '';
  @Output() noteAdded = new EventEmitter<string>();

  roleChipClass = roleChipClass;
  draft = '';

  /** Role wording comes from the API triple, not the i18n files. */
  roleLabel(note: Note): string {
    return this.lang.label(note.actorRole);
  }

  submit(): void {
    const message = this.draft.trim();
    if (!message) return;
    this.noteAdded.emit(message);
    this.draft = '';
  }

  relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return this.translate.instant('NOTES.JUST_NOW');
    if (minutes < 60) return this.translate.instant('NOTES.MINUTES_AGO', { value: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24) return this.translate.instant('NOTES.HOURS_AGO', { value: hours });
    const days = Math.round(hours / 24);
    if (days < 30) return this.translate.instant('NOTES.DAYS_AGO', { value: days });
    return new Date(iso).toLocaleDateString();
  }
}
