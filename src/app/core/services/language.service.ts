import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { EnumValue, Lang } from '../models/enums';
import { TokenStore } from './auth.interceptor';
import { API_BASE } from './api.config';

const LANG_KEY = 'ioj_lang';

export interface LanguageOption {
  code: Lang;
  /** Name of the language written in that language. */
  label: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'english', label: 'English', dir: 'ltr' },
  { code: 'arabic', label: 'العربية', dir: 'rtl' },
];

/** ngx-translate uses short codes; our enum triple uses the long field names. */
const TRANSLATE_CODE: Record<Lang, string> = { english: 'en', arabic: 'ar' };

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);

  /** Current language, readable from templates. */
  readonly current = signal<Lang>('english');

  readonly languages = LANGUAGES;

  init(): void {
    // Restoring a saved choice is not the user choosing again, so it is not persisted.
    this.use(this.restore());
  }

  use(lang: Lang): void {
    this.current.set(lang);
    this.translate.use(TRANSLATE_CODE[lang]);

    const option = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
    const html = document.documentElement;
    html.setAttribute('lang', TRANSLATE_CODE[lang]);
    html.setAttribute('dir', option.dir);
    this.useThemeDirection(option.dir);

    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  }

  /**
   * Bootstrap mirrors through a separate stylesheet, not through `dir` alone, so switching language
   * has to switch stylesheets too. Both are already in the page (see index.html) — this only
   * enables one and disables the other.
   */
  private useThemeDirection(dir: 'ltr' | 'rtl'): void {
    const ltr = document.getElementById('bootstrap-ltr') as HTMLLinkElement | null;
    const rtl = document.getElementById('bootstrap-rtl') as HTMLLinkElement | null;
    if (ltr) ltr.disabled = dir !== 'ltr';
    if (rtl) rtl.disabled = dir !== 'rtl';
  }

  toggle(): void {
    this.use(this.current() === 'english' ? 'arabic' : 'english');
    this.persist();
  }

  /**
   * Remembers the choice server-side, which is what decides the language of notification email.
   * In-app notifications do not need it — those are rendered per request in whatever language the
   * UI is currently showing — but an email has to pick one at send time.
   *
   * <p>Fire and forget: failing to record a language preference is not worth interrupting someone
   * for, and the local choice has already taken effect.
   */
  private persist(): void {
    if (!TokenStore.get()) return;
    const language = this.current() === 'arabic' ? 'ar' : 'en';
    this.http.patch(`${API_BASE}/users/me/language`, { language }).subscribe({
      error: () => undefined,
    });
  }

  get isRtl(): boolean {
    return this.current() === 'arabic';
  }

  /**
   * Picks the right side of an API enum triple for the active language. Enum wording comes from
   * the server, so it is deliberately NOT duplicated into the i18n JSON files.
   */
  label(value: EnumValue | null | undefined): string {
    if (!value) return '';
    return this.current() === 'arabic' ? value.arabic : value.english;
  }

  private restore(): Lang {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'english' || saved === 'arabic') return saved;
    } catch { /* ignore */ }
    return 'english';
  }
}
