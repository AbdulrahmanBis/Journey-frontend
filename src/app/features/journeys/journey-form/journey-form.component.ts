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
import { Journey, JourneyItem } from '../../../core/models/models';
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

@Component({
  selector: 'app-journey-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, QuillEditorComponent],
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
  items: ItemDraft[] = [];

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
        items: this.journeyService.getItemsForJourney(this.journeyId!),
      }).subscribe({
        next: ({ journey, items }: { journey: Journey; items: JourneyItem[] }) => {
          this.title = journey.title;
          this.description = journey.description;
          this.techTag = journey.techTag;
          this.items = items.map((i) => ({
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
          }));
          this.loading = false;
        },
        error: () => {
          this.toast.error(this.translate.instant('JOURNEY.NOT_FOUND'));
          this.router.navigate(['/journeys']);
        },
      });
    } else {
      this.items = [{ title: '', description: '', attachments: [] }];
      this.loading = false;
    }
  }

  // ─── Items ────────────────────────────────────────────────────────────────

  addItem(): void { this.items.push({ title: '', description: '', attachments: [] }); }

  removeItem(index: number): void { this.items.splice(index, 1); }

  moveItem(index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= this.items.length) return;
    [this.items[index], this.items[target]] = [this.items[target], this.items[index]];
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
    return this.items.reduce(
      (n, i) => n + i.attachments.filter((a) => !this.isComplete(a) && !a.uploading).length,
      0,
    );
  }

  uploadingCount(): number {
    return this.items.reduce((n, i) => n + i.attachments.filter((a) => a.uploading).length, 0);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  submit(): void {
    this.error = '';

    if (this.uploadingCount() > 0) {
      this.error = this.translate.instant('ATTACHMENT.STILL_UPLOADING');
      return;
    }

    const cleanItems = this.items
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
    if (!cleanItems.length) { this.error = this.translate.instant('JOURNEY.NEEDS_ITEM'); return; }

    this.saving = true;
    const user = this.auth.currentUser!;
    const payload = {
      title: this.title.trim(),
      description: this.description.trim(),
      techTag: this.techTag,
      items: cleanItems,
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
