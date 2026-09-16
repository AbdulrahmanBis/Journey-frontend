import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EnumValue, Lang } from '../models/enums';

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

  /** Current language, readable from templates. */
  readonly current = signal<Lang>('english');

  readonly languages = LANGUAGES;

  init(): void {
    this.use(this.restore());
  }

  use(lang: Lang): void {
    this.current.set(lang);
    this.translate.use(TRANSLATE_CODE[lang]);

    const option = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
    const html = document.documentElement;
    html.setAttribute('lang', TRANSLATE_CODE[lang]);
    html.setAttribute('dir', option.dir);

    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  }

  toggle(): void {
    this.use(this.current() === 'english' ? 'arabic' : 'english');
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
