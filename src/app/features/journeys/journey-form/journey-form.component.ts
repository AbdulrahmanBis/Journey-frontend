import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { QuillEditorComponent } from 'ngx-quill';
import { AuthService } from '../../../core/services/auth.service';
import { JourneyService, AttachmentPayload } from '../../../core/services/journey.service';
import { FileService } from '../../../core/services/file.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import {
  ATTACHMENT_KINDS,
  AttachmentKindCode,
  EnumValue,
  TECH_TAGS,
  TechTag,
  acceptFor,
  codeOf,
  isUploadedKind,
} from '../../../core/models/enums';
import { Journey, JourneyItem, JourneyUnit } from '../../../core/models/models';
import { QuestionEditorComponent, QuestionRow, blankQuestion, toQuestionDraft } from '../../../shared/components/question-editor/question-editor.component';
import { QuestionTypeCode, optionCodeFor } from '../../../core/models/enums';
import { forkJoin } from 'rxjs';

interface AttachmentDraft {
  id?: string;
  kind: number;
  label: string;
  url: string;
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  originalName?: string;
  /** Transient upload state — never sent to the API. */
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface ItemDraft {
  id?: string;
  title: string;
  description: string;
  attachments: AttachmentDraft[];
}

interface UnitDraft {
  /** Present for saved units, so learners' progress on them is kept. */
  id?: string;
  title: string;
  description: string;
  items: ItemDraft[];
  quiz: QuestionRow[];
}

@Component({
  selector: 'app-journey-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, QuillEditorComponent, QuestionEditorComponent],
  templateUrl: './journey-form.component.html',
  styleUrl: './journey-form.component.scss',
})
export class JourneyFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private journeyService = inject(JourneyService);
  private files = inject(FileService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  techTags = TECH_TAGS;
  attachmentKinds = ATTACHMENT_KINDS;
  K = AttachmentKindCode;
  isUploadedKind = isUploadedKind;
  acceptFor = acceptFor;

  journeyId: string | null = null;
  isEdit = false;
  loading = true;
  saving = false;
  error = '';

  title = '';
  description = '';
  techTag: TechTag = TECH_TAGS[0];
  /** Expected duration in days; empty means no default deadline. */
  targetDays: number | null = null;
  units: UnitDraft[] = [];
  /** Server limit; the hint suggests 1–2. */
  readonly maxQuizQuestions = 5;

  /**
   * Deliberately no image button: Quill embeds inserted images as base64 directly in the HTML,
   * which would push binary into the database. Images are added as attachments instead.
   */
  quillModules = {
    toolbar: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'blockquote', 'code-block'],
      ['clean'],
    ],
  };

  kindLabel(kind: EnumValue): string {
    return this.lang.label(kind);
  }

  /** Kind name for a draft row, looked up from the local catalog. */
  draftKindLabel(a: AttachmentDraft): string {
    const match = ATTACHMENT_KINDS.find((k) => k.code === a.kind);
    return match ? this.lang.label(match) : '';
  }

  ngOnInit(): void {
    this.journeyId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.journeyId;

    if (this.isEdit) {
      forkJoin({
        journey: this.journeyService.getJourneyById(this.journeyId!),
        units: this.journeyService.getUnitsForJourney(this.journeyId!),
      }).subscribe({
        next: ({ journey, units }: { journey: Journey; units: JourneyUnit[] }) => {
          this.title = journey.title;
          this.description = journey.description;
          this.techTag = journey.techTag;
          this.targetDays = journey.targetDays ?? null;
          this.units = units.map((u) => ({
            id: u.id,
            title: u.title,
            description: u.description ?? '',
            items: u.items.map((i) => this.itemDraft(i)),
            quiz: u.quiz.map((q) => ({
              id: q.id,
              type: codeOf(q.type) ?? QuestionTypeCode.MultipleChoice,
              prompt: q.prompt,
              options: q.options?.length ? [...q.options] : ['', ''],
              correctOptionIndex: q.correctOptionIndex ?? optionCodeFor(0),
              correctBoolAnswer: q.correctBoolAnswer ?? true,
            })),
          }));
          this.loading = false;
        },
        error: () => {
          this.toast.error(this.translate.instant('JOURNEY.NOT_FOUND'));
          this.router.navigate(['/journeys']);
        },
      });
    } else {
      this.units = [this.blankUnit(1)];
      this.loading = false;
    }
  }

  private itemDraft(i: JourneyItem): ItemDraft {
    return {
      id: i.id,
      title: i.title,
      description: i.description,
      attachments: (i.attachments ?? []).map((a) => ({
        id: a.id,
        kind: codeOf(a.kind) ?? AttachmentKindCode.Link,
        label: a.label ?? '',
        url: a.url ?? '',
        storageKey: a.storageKey,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        originalName: a.originalName,
      })),
    };
  }

  private blankUnit(n: number): UnitDraft {
    return {
      title: this.translate.instant('JOURNEY.UNIT_DEFAULT_TITLE', { n }),
      description: '',
      items: [{ title: '', description: '', attachments: [] }],
      quiz: [],
    };
  }

  private get allItems(): ItemDraft[] {
    return this.units.flatMap((u) => u.items);
  }

  // ─── Units ────────────────────────────────────────────────────────────────

  addUnit(): void { this.units.push(this.blankUnit(this.units.length + 1)); }

  removeUnit(index: number): void {
    if (this.units.length > 1) this.units.splice(index, 1);
  }

  moveUnit(index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= this.units.length) return;
    [this.units[index], this.units[target]] = [this.units[target], this.units[index]];
  }

  addQuizQuestion(unit: UnitDraft): void {
    if (unit.quiz.length < this.maxQuizQuestions) {
      const q = blankQuestion();
      unit.quiz.push(q);
    }
  }

  // ─── Items ────────────────────────────────────────────────────────────────

  addItem(unit: UnitDraft): void { unit.items.push({ title: '', description: '', attachments: [] }); }

  removeItem(unit: UnitDraft, index: number): void { unit.items.splice(index, 1); }

  moveItem(unit: UnitDraft, index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= unit.items.length) return;
    [unit.items[index], unit.items[target]] = [unit.items[target], unit.items[index]];
  }

  // ─── Attachments ──────────────────────────────────────────────────────────

  addAttachment(item: ItemDraft, kind: number): void {
    if (!kind) return;
    item.attachments.push({ kind: Number(kind), label: '', url: '' });
  }

  removeAttachment(item: ItemDraft, index: number): void {
    item.attachments.splice(index, 1);
  }

  moveAttachment(item: ItemDraft, index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= item.attachments.length) return;
    [item.attachments[index], item.attachments[target]] =
      [item.attachments[target], item.attachments[index]];
  }

  /** Uploads immediately on pick, so the storage key exists before the journey is saved. */
  onFileSelected(event: Event, a: AttachmentDraft): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    a.uploading = true;
    a.progress = 0;
    a.error = '';

    this.files.upload(file).subscribe({
      next: (status) => {
        if (status.state === 'progress') {
          a.progress = status.percent;
          return;
        }
        a.uploading = false;
        a.progress = 100;
        a.storageKey = status.file.storageKey;
        a.mimeType = status.file.mimeType;
        a.sizeBytes = status.file.sizeBytes;
        a.originalName = status.file.originalName;
        if (!a.label.trim()) a.label = status.file.originalName;
      },
      error: (err: any) => {
        a.uploading = false;
        a.progress = 0;
        // The backend explains type/size rejections precisely — surface that, not a generic failure.
        a.error = err?.error?.message ?? this.translate.instant('ATTACHMENT.UPLOAD_FAILED');
      },
    });

    // Let the same file be re-picked after a failure.
    input.value = '';
  }

  fileName(a: AttachmentDraft): string {
    return a.originalName || a.storageKey?.split('/').pop() || '';
  }

  fileSize(a: AttachmentDraft): string {
    return this.files.formatSize(a.sizeBytes);
  }

  /** An attachment is only sendable once it has the field its kind requires. */
  private isComplete(a: AttachmentDraft): boolean {
    return isUploadedKind(a.kind) ? !!a.storageKey : !!a.url.trim();
  }

  incompleteCount(): number {
    return this.allItems.reduce(
      (n, i) => n + i.attachments.filter((a) => !this.isComplete(a) && !a.uploading).length,
      0,
    );
  }

  uploadingCount(): number {
    return this.allItems.reduce((n, i) => n + i.attachments.filter((a) => a.uploading).length, 0);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  submit(): void {
    this.error = '';

    if (this.uploadingCount() > 0) {
      this.error = this.translate.instant('ATTACHMENT.STILL_UPLOADING');
      return;
    }

    const cleanItems = (items: ItemDraft[]) => items
      .map((i) => ({
        id: i.id,
        title: i.title.trim(),
        description: (i.description ?? '').trim(),
        // Incomplete rows are dropped rather than rejected — a half-filled row is just noise.
        attachments: i.attachments.filter((a) => this.isComplete(a)).map(
          (a): AttachmentPayload => ({
            id: a.id,
            kind: a.kind,
            label: a.label.trim() || undefined,
            url: isUploadedKind(a.kind) ? undefined : a.url.trim(),
            storageKey: isUploadedKind(a.kind) ? a.storageKey : undefined,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            originalName: a.originalName,
          }),
        ),
      }))
      .filter((i) => i.title.length > 0);

    if (!this.title.trim()) { this.error = this.translate.instant('JOURNEY.NEEDS_TITLE'); return; }

    const units = this.units.map((u) => ({
      id: u.id,
      title: u.title.trim(),
      description: u.description.trim() || undefined,
      items: cleanItems(u.items),
      quiz: u.quiz.map(toQuestionDraft),
    }));
    for (const [index, unit] of units.entries()) {
      const name = unit.title || this.translate.instant('JOURNEY.UNIT_DEFAULT_TITLE', { n: index + 1 });
      if (!unit.title) { this.error = this.translate.instant('JOURNEY.NEEDS_UNIT_TITLE', { n: index + 1 }); return; }
      if (!unit.items.length) { this.error = this.translate.instant('JOURNEY.NEEDS_UNIT_ITEM', { unit: name }); return; }
      for (const q of unit.quiz) {
        if (!q.prompt) { this.error = this.translate.instant('EXAM.NEEDS_PROMPT'); return; }
        if (q.type === QuestionTypeCode.MultipleChoice && (q.options?.length ?? 0) < 2) {
          this.error = this.translate.instant('EXAM.NEEDS_OPTIONS', { prompt: q.prompt });
          return;
        }
      }
    }

    this.saving = true;
    const user = this.auth.currentUser!;
    const payload = {
      title: this.title.trim(),
      description: this.description.trim(),
      techTag: this.techTag,
      targetDays: this.targetDays || null,
      units,
      createdById: user.id,
      createdByName: user.name,
    };

    const request = this.isEdit
      ? this.journeyService.updateJourney(this.journeyId!, payload)
      : this.journeyService.createJourney(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.translate.instant(this.isEdit ? 'JOURNEY.UPDATED' : 'JOURNEY.CREATED'));
        this.router.navigate(['/journeys']);
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.message ?? this.translate.instant('COMMON.SAVE_FAILED');
      },
    });
  }
}
