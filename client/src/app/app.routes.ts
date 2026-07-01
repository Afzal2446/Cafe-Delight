import { Routes } from '@angular/router';
import { ownerGuard } from './services/owner.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'order', pathMatch: 'full' },
  { path: 'order', loadComponent: () => import('./customer/menu/menu.component').then(m => m.MenuComponent) },
  { path: 'order/cart', loadComponent: () => import('./customer/cart/cart.component').then(m => m.CartComponent) },
  { path: 'order/success/:id', loadComponent: () => import('./customer/order-success/order-success.component').then(m => m.OrderSuccessComponent) },

  // Owner auth
  { path: 'owner/login', loadComponent: () => import('./owner/auth/login.component').then(m => m.LoginComponent) },
  { path: 'owner/signup', loadComponent: () => import('./owner/auth/signup.component').then(m => m.SignupComponent) },

  // Owner area (protected)
  { path: 'owner', canActivate: [ownerGuard], loadComponent: () => import('./owner/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'owner/menu', canActivate: [ownerGuard], loadComponent: () => import('./owner/menu-manage/menu-manage.component').then(m => m.MenuManageComponent) },
  { path: 'owner/orders', canActivate: [ownerGuard], loadComponent: () => import('./owner/orders/orders.component').then(m => m.OrdersComponent) },
  { path: 'owner/qr', canActivate: [ownerGuard], loadComponent: () => import('./owner/qr-generator/qr-generator.component').then(m => m.QrGeneratorComponent) },
  { path: 'owner/feedback', canActivate: [ownerGuard], loadComponent: () => import('./owner/feedback/feedback.component').then(m => m.FeedbackComponent) },
  { path: 'owner/settings', canActivate: [ownerGuard], loadComponent: () => import('./owner/settings/settings.component').then(m => m.SettingsComponent) },

  { path: '**', redirectTo: 'order' }
];
