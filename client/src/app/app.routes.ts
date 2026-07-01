import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'order', pathMatch: 'full' },
  { path: 'order', loadComponent: () => import('./customer/menu/menu.component').then(m => m.MenuComponent) },
  { path: 'order/cart', loadComponent: () => import('./customer/cart/cart.component').then(m => m.CartComponent) },
  { path: 'order/success/:id', loadComponent: () => import('./customer/order-success/order-success.component').then(m => m.OrderSuccessComponent) },
  { path: 'owner', loadComponent: () => import('./owner/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'owner/menu', loadComponent: () => import('./owner/menu-manage/menu-manage.component').then(m => m.MenuManageComponent) },
  { path: 'owner/orders', loadComponent: () => import('./owner/orders/orders.component').then(m => m.OrdersComponent) },
  { path: 'owner/qr', loadComponent: () => import('./owner/qr-generator/qr-generator.component').then(m => m.QrGeneratorComponent) },
  { path: 'owner/settings', loadComponent: () => import('./owner/settings/settings.component').then(m => m.SettingsComponent) },
  { path: '**', redirectTo: 'order' }
];
