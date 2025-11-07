import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing').then(m => m.Landing) },
  { path: 'login', loadComponent: () => import('./auth/login-page/login-page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./auth/register-page/register-page').then(m => m.RegisterPage) },
  { path: 'forgot-password', loadComponent: () => import('./auth/forgot-password/forgot-password').then(m => m.ForgotPassword) },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard-layout/dashboard-layout').then(m => m.DashboardLayout), 
    children: [
      { path: '', loadComponent: () => import('./dashboard/dashboard-home/dashboard-home').then(m => m.DashboardHome) },
      { path: 'posts', loadComponent: () => import('./dashboard/posts-page/posts-page').then(m => m.PostsPage) },
      { path: 'post-editor', loadComponent: () => import('./dashboard/post-editor/post-editor').then(m => m.PostEditor) },
      { path: 'media', loadComponent: () => import('./dashboard/media-library/media-library').then(m => m.MediaLibrary) },
      { path: 'analytics', loadComponent: () => import('./dashboard/analytics-page/analytics-page').then(m => m.AnalyticsPage) },
      { path: 'notifications', loadComponent: () => import('./dashboard/notifications-page/notifications-page').then(m => m.NotificationsPage) },
      { path: 'settings', loadComponent: () => import('./dashboard/settings-page/settings-page').then(m => m.SettingsPage) },
      { path: 'social-account', loadComponent: () => import('./dashboard/social-account-page/social-account-page').then(m => m.SocialAccountPage) },
      { path: 'profile', loadComponent: () => import('./dashboard/profile-page/profile-page').then(m => m.ProfilePage) },
      { path: 'approvals', loadComponent: () => import('./dashboard/approvals-page/approvals-page').then(m => m.ApprovalsPage) },
      
    ]
  },
  { path: '**', redirectTo: '' }
];
