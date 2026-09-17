import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/guards';
import { CatalogTypeCode, ORG_WIDE_ROLES, STAFF_ROLES, USER_ADMIN_ROLES } from './core/models/enums';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  // Accounts are created by HR or a manager; self-service signup is disabled on the backend.
  { path: 'signup', redirectTo: 'login' },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'metrics',
    canActivate: [authGuard],
    loadComponent: () => import('./features/metrics/metrics.component').then((m) => m.MetricsComponent),
  },
  {
    path: 'catalog',
    canActivate: [authGuard],
    loadComponent: () => import('./features/catalog/catalog.component').then((m) => m.CatalogComponent),
  },
  {
    path: 'catalog/journeys/:id',
    canActivate: [authGuard],
    data: { type: CatalogTypeCode.Journey },
    loadComponent: () => import('./features/catalog/catalog-detail/catalog-detail.component').then((m) => m.CatalogDetailComponent),
  },
  {
    path: 'catalog/packages/:id',
    canActivate: [authGuard],
    data: { type: CatalogTypeCode.Package },
    loadComponent: () => import('./features/catalog/catalog-detail/catalog-detail.component').then((m) => m.CatalogDetailComponent),
  },
  {
    path: 'journeys',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/journeys/journey-list/journey-list.component').then((m) => m.JourneyListComponent),
  },
  {
    path: 'journeys/packages',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/journeys/package-list/package-list.component').then((m) => m.PackageListComponent),
  },
  {
    path: 'journeys/packages/new',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/journeys/package-form/package-form.component').then((m) => m.PackageFormComponent),
  },
  {
    path: 'journeys/packages/:id/edit',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/journeys/package-form/package-form.component').then((m) => m.PackageFormComponent),
  },
  {
    path: 'journeys/new',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/journeys/journey-form/journey-form.component').then((m) => m.JourneyFormComponent),
  },
  {
    path: 'journeys/:id/edit',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/journeys/journey-form/journey-form.component').then((m) => m.JourneyFormComponent),
  },
  {
    path: 'journeys/:id/exam',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/journeys/exam-form/exam-form.component').then((m) => m.ExamFormComponent),
  },
  {
    path: 'journey-log/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/journeys/journey-log/journey-log.component').then((m) => m.JourneyLogComponent),
  },
  {
    path: 'exam/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/journeys/exam-attempt/exam-attempt.component').then((m) => m.ExamAttemptComponent),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, roleGuard(USER_ADMIN_ROLES)],
    loadComponent: () => import('./features/admin/user-list/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: 'admin/users/new',
    canActivate: [authGuard, roleGuard(USER_ADMIN_ROLES)],
    loadComponent: () => import('./features/admin/user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: 'admin/users/:id/edit',
    canActivate: [authGuard, roleGuard(USER_ADMIN_ROLES)],
    loadComponent: () => import('./features/admin/user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: 'people/:id',
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () => import('./features/people/learner-profile/learner-profile.component').then((m) => m.LearnerProfileComponent),
  },
  {
    path: 'admin/departments',
    canActivate: [authGuard, roleGuard(ORG_WIDE_ROLES)],
    loadComponent: () => import('./features/admin/department-list/department-list.component').then((m) => m.DepartmentListComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
