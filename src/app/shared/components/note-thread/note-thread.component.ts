import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Note } from '../../../core/models/models';
import { ROLE_LABEL } from '../../../core/models/enums';

@Component({
  selector: 'app-note-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-thread.component.html',
  styleUrl: './note-thread.component.scss',
})
export class NoteThreadComponent {
  @Input({ required: true }) notes: Note[] = [];
  @Input() currentUserId = '';
  @Output() noteAdded = new EventEmitter<string>();

  roleLabel = ROLE_LABEL;
  draft = '';

  submit(): void {
    const message = this.draft.trim();
    if (!message) return;
    this.noteAdded.emit(message);
    this.draft = '';
  }

  relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }
}
