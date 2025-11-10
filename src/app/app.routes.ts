import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      { path: '', loadComponent: () => import('./dashboard/dashboard-home/dashboard-home').then((m) => m.DashboardHome) },
      { path: 'posts', loadComponent: () => import('./dashboard/posts-page/posts-page').then((m) => m.PostsPage) },
      { path: 'post-editor', loadComponent: () => import('./dashboard/post-editor/post-editor').then((m) => m.PostEditor) },
      { path: 'media', loadComponent: () => import('./dashboard/media-library/media-library').then((m) => m.MediaLibrary) },
      { path: 'analytics', loadComponent: () => import('./dashboard/analytics-page/analytics-page').then((m) => m.AnalyticsPage) },
      { path: 'notifications', loadComponent: () => import('./dashboard/notifications-page/notifications-page').then((m) => m.NotificationsPage) },
      { path: 'settings', loadComponent: () => import('./dashboard/settings-page/settings-page').then((m) => m.SettingsPage) },
      { path: 'profile', loadComponent: () => import('./dashboard/profile-page/profile-page').then((m) => m.ProfilePage) },
      { path: 'approvals', loadComponent: () => import('./dashboard/approvals-page/approvals-page').then((m) => m.ApprovalsPage) },
      { path: 'social-account', loadComponent: () => import('./dashboard/social-account-page/social-account-page').then((m) => m.SocialAccountPage) },
      { path: 'social-account/connect', loadComponent: () => import('./dashboard/social-account-page/connect-account/connect-account').then((m) => m.ConnectAccount) },
      { path: 'social-account/success', loadComponent: () => import('./dashboard/social-account-page/auth-success/auth-success').then((m) => m.AuthSuccess) },
      { path: 'social-account/connected', loadComponent: () => import('./dashboard/social-account-page/connected-accounts/connected-accounts').then((m) => m.ConnectedAccounts) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
