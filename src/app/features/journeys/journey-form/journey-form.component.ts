import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { JourneyService } from '../../../core/services/journey.service';
import { ToastService } from '../../../core/services/toast.service';
import { TECH_TAGS, TechTag } from '../../../core/models/enums';
import { Journey, JourneyItem } from '../../../core/models/models';
import { forkJoin } from 'rxjs';

interface ItemDraft {
  id?: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-journey-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './journey-form.component.html',
  styleUrl: './journey-form.component.scss',
})
export class JourneyFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private journeyService = inject(JourneyService);
  private toast = inject(ToastService);

  techTags = TECH_TAGS;
  journeyId: string | null = null;
  isEdit = false;
  loading = true;
  saving = false;
  error = '';

  title = '';
  description = '';
  techTag: TechTag = TECH_TAGS[0];
  items: ItemDraft[] = [];

  ngOnInit(): void {
    this.journeyId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.journeyId;

    if (this.isEdit) {
      // Load journey + items in parallel
      forkJoin({
        journey: this.journeyService.getJourneyById(this.journeyId!),
        items: this.journeyService.getItemsForJourney(this.journeyId!),
      }).subscribe({
        next: ({ journey, items }: { journey: Journey; items: JourneyItem[] }) => {
          this.title = journey.title;
          this.description = journey.description;
          this.techTag = journey.techTag;
          this.items = items.map((i) => ({ id: i.id, title: i.title, description: i.description }));
          this.loading = false;
        },
        error: () => {
          this.toast.error('Journey not found.');
          this.router.navigate(['/journeys']);
        },
      });
    } else {
      this.items = [{ title: '', description: '' }];
      this.loading = false;
    }
  }

  addItem(): void { this.items.push({ title: '', description: '' }); }

  removeItem(index: number): void { this.items.splice(index, 1); }

  moveItem(index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= this.items.length) return;
    [this.items[index], this.items[target]] = [this.items[target], this.items[index]];
  }

  submit(): void {
    this.error = '';
    const cleanItems = this.items
      .map((i) => ({ id: i.id, title: i.title.trim(), description: i.description.trim() }))
      .filter((i) => i.title.length > 0);

    if (!this.title.trim()) { this.error = 'Give the journey a title.'; return; }
    if (!cleanItems.length) { this.error = 'Add at least one quest item.'; return; }

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
        this.toast.success(this.isEdit ? 'Journey updated.' : 'Journey created.');
        this.router.navigate(['/journeys']);
      },
      error: (err: Error) => { this.saving = false; this.error = err.message ?? 'Save failed.'; },
    });
  }
}
