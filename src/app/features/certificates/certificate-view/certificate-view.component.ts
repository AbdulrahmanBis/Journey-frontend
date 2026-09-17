import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Certificate } from '../../../core/models/models';
import { CatalogTypeCode, codeOf } from '../../../core/models/enums';
import { AuthService } from '../../../core/services/auth.service';
import { CertificateService } from '../../../core/services/certificate.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { openErrorPage } from '../../../core/services/api-error';

/**
 * One certificate, laid out as an A4 landscape page. "Download PDF" opens the browser's print dialog, where
 * Save as PDF produces the file; the app's navigation is hidden when printing (see styles.scss).
 */
@Component({
  selector: 'app-certificate-view',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './certificate-view.component.html',
  styleUrl: './certificate-view.component.scss',
})
export class CertificateViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private certificates = inject(CertificateService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  lang = inject(LanguageService);

  certificate: Certificate | null = null;

  get isPackage(): boolean { return codeOf(this.certificate?.type) === CatalogTypeCode.Package; }

  get isOwn(): boolean { return this.certificate?.learnerId === this.auth.currentUser?.id; }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.certificates.get(params.get('id')!).subscribe({
        next: (c) => (this.certificate = c),
        error: (err) => openErrorPage(this.router, err),
      });
    });
  }

  date(iso: string): string {
    return new Date(iso).toLocaleDateString(this.lang.current() === 'arabic' ? 'ar' : 'en', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  back(): void {
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(['/dashboard']);
  }

  print(): void {
    window.print();
  }
}
