import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { DepartmentService } from '../../../core/services/department.service';
import { LanguageService } from '../../../core/services/language.service';
import { Department } from '../../../core/models/models';

/**
 * A department `<select>` bound with `[(value)]`. `null` means "all departments".
 *
 *   <app-department-picker [(value)]="departmentId" (valueChange)="reload()"></app-department-picker>
 *
 * Set `[allowAll]="false"` for forms where a department is required. The server decides what the
 * caller may actually see, so this is a convenience for HR and Admin, not a gate.
 */
@Component({
  selector: 'app-department-picker',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, TranslatePipe],
  template: `
    <label *ngIf="label" [for]="inputId" class="form-label">{{ label }}</label>
    <select
      [id]="inputId"
      class="form-select"
      [class.form-select-sm]="small"
      [disabled]="disabled"
      [ngModel]="value ?? ''"
      (ngModelChange)="select($event)"
    >
      <option *ngIf="allowAll" value="">{{ 'DEPARTMENT.ALL' | translate }}</option>
      <option *ngIf="!allowAll" value="" disabled>{{ 'DEPARTMENT.CHOOSE' | translate }}</option>
      <option *ngFor="let d of departments" [value]="d.id">{{ name(d) }}</option>
    </select>
  `,
})
export class DepartmentPickerComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private lang = inject(LanguageService);

  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string | null>();

  @Input() label = '';
  @Input() inputId = 'department-picker';
  @Input() allowAll = true;
  @Input() small = false;
  @Input() disabled = false;

  /** Emits once the list loads, for parents that need names (e.g. a table column). */
  @Output() loaded = new EventEmitter<Department[]>();

  departments: Department[] = [];

  ngOnInit(): void {
    this.departmentService.list().subscribe((departments) => {
      this.departments = departments;
      this.loaded.emit(departments);
    });
  }

  name(department: Department): string {
    return this.lang.label(department);
  }

  select(id: string): void {
    this.value = id || null;
    this.valueChange.emit(this.value);
  }
}
