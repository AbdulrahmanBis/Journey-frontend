import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/guards';
import { RoleCode } from './core/models/enums';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/signup/signup.component').then((m) => m.SignupComponent),
  },
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
    path: 'journeys',
    canActivate: [authGuard, roleGuard([RoleCode.Senior, RoleCode.Manager, RoleCode.Admin])],
    loadComponent: () => import('./features/journeys/journey-list/journey-list.component').then((m) => m.JourneyListComponent),
  },
  {
    path: 'journeys/new',
    canActivate: [authGuard, roleGuard([RoleCode.Senior, RoleCode.Manager, RoleCode.Admin])],
    loadComponent: () => import('./features/journeys/journey-form/journey-form.component').then((m) => m.JourneyFormComponent),
  },
  {
    path: 'journeys/:id/edit',
    canActivate: [authGuard, roleGuard([RoleCode.Senior, RoleCode.Manager, RoleCode.Admin])],
    loadComponent: () => import('./features/journeys/journey-form/journey-form.component').then((m) => m.JourneyFormComponent),
  },
  {
    path: 'journeys/:id/exam',
    canActivate: [authGuard, roleGuard([RoleCode.Senior, RoleCode.Manager, RoleCode.Admin])],
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
    canActivate: [authGuard, roleGuard([RoleCode.Manager, RoleCode.Admin])],
    loadComponent: () => import('./features/admin/user-list/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: 'admin/users/new',
    canActivate: [authGuard, roleGuard([RoleCode.Manager, RoleCode.Admin])],
    loadComponent: () => import('./features/admin/user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: 'admin/users/:id/edit',
    canActivate: [authGuard, roleGuard([RoleCode.Manager, RoleCode.Admin])],
    loadComponent: () => import('./features/admin/user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
