import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OrderNotificationService {
  // Latest full list of orders (newest first)
  orders$ = new BehaviorSubject<any[]>([]);
  // Count of orders still pending
  pendingCount$ = new BehaviorSubject<number>(0);
  // Emits the set of newly-arrived orders since the last poll
  newOrders$ = new Subject<any[]>();

  private knownIds = new Set<number>();
  private firstLoad = true;
  private timer: any = null;
  private readonly intervalMs = 5000;

  constructor(private api: ApiService, private auth: AuthService) {}

  start() {
    if (this.timer || !this.auth.isLoggedIn()) return;
    this.requestBrowserPermission();
    this.poll();
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.knownIds.clear();
    this.firstLoad = true;
    this.orders$.next([]);
    this.pendingCount$.next(0);
  }

  refreshNow() {
    if (this.auth.isLoggedIn()) this.poll();
  }

  private poll() {
    this.api.getOrders().subscribe({
      next: (orders) => {
        const newOnes = orders.filter(o => !this.knownIds.has(o.id));
        if (!this.firstLoad && newOnes.length > 0) {
          this.newOrders$.next(newOnes);
          this.playBeep();
          this.showBrowserNotification(newOnes);
        }
        orders.forEach(o => this.knownIds.add(o.id));
        this.firstLoad = false;

        this.orders$.next(orders);
        this.pendingCount$.next(orders.filter(o => o.status === 'pending').length);
      },
      error: () => { /* interceptor handles 401 */ }
    });
  }

  private requestBrowserPermission() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* ignore */ }
  }

  private showBrowserNotification(newOnes: any[]) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = newOnes.length === 1
          ? `New order #${newOnes[0].id}`
          : `${newOnes.length} new orders`;
        const body = newOnes.length === 1
          ? `${newOnes[0].customer_name || 'Customer'} · Table ${newOnes[0].table_number || '-'} · ₹${newOnes[0].total_amount}`
          : 'Tap to view the orders';
        new Notification(title, { body });
      }
    } catch { /* ignore */ }
  }

  private playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch { /* ignore */ }
  }
}
