import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';

/**
 * "5m ago", "3h ago", "2d ago", then a date. Impure so it follows a language switch.
 *
 *   {{ learner.lastActivityAt | timeAgo }}
 */
@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  transform(iso: string | null | undefined): string {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '—';
    const minutes = Math.floor((Date.now() - then) / 60_000);
    if (minutes < 1) return this.translate.instant('NOTIFICATIONS.JUST_NOW');
    if (minutes < 60) return this.translate.instant('NOTIFICATIONS.MINUTES_AGO', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return this.translate.instant('NOTIFICATIONS.HOURS_AGO', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return this.translate.instant('NOTIFICATIONS.DAYS_AGO', { count: days });
    return new Date(then).toLocaleDateString(this.lang.current() === 'arabic' ? 'ar' : 'en');
  }
}
