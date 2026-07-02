import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface AppNotification {
  key: string;            // unique: 'order-<id>' or 'pay-<id>'
  type: 'order' | 'payment';
  orderId: number;
  title: string;
  detail: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class OrderNotificationService {
  orders$ = new BehaviorSubject<any[]>([]);
  pendingCount$ = new BehaviorSubject<number>(0);
  // Persistent, stacked notifications derived from live order state
  notifications$ = new BehaviorSubject<AppNotification[]>([]);
  arrived$ = new Subject<AppNotification[]>();

  // Keys the owner has manually dismissed (acknowledged) — hidden until state changes
  private acknowledged = new Set<string>();
  private prevVisibleKeys = new Set<string>();
  private firstLoad = true;
  private timer: any = null;
  private readonly intervalMs = 5000;

  private readonly LS_ACK = 'owner_ack_notifications';

  constructor(private api: ApiService, private auth: AuthService) {
    this.restore();
  }

  start() {
    if (this.timer || !this.auth.isLoggedIn()) return;
    this.requestBrowserPermission();
    this.poll();
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Full reset — used on logout so a different owner starts clean. */
  reset() {
    this.stop();
    this.acknowledged.clear();
    this.prevVisibleKeys.clear();
    this.firstLoad = true;
    this.orders$.next([]);
    this.pendingCount$.next(0);
    this.notifications$.next([]);
    localStorage.removeItem(this.LS_ACK);
  }

  refreshNow() {
    if (this.auth.isLoggedIn()) this.poll();
  }

  /** Owner dismissed a single notification — hide it until its state changes. */
  dismiss(key: string) {
    this.acknowledged.add(key);
    this.persist();
    this.poll();
  }

  dismissAll() {
    this.notifications$.getValue().forEach(n => this.acknowledged.add(n.key));
    this.persist();
    this.poll();
  }

  private poll() {
    this.api.getOrders().subscribe({
      next: (orders) => {
        // Build the set of currently actionable notifications from live state
        const actionable: AppNotification[] = [];
        orders.forEach(o => {
          if (o.status === 'pending') {
            actionable.push(this.buildNotification('order', o));
          }
          if (o.payment_status === 'claimed' || o.payment_status === 'partial') {
            actionable.push(this.buildNotification('payment', o));
          }
        });

        const actionableKeys = new Set(actionable.map(n => n.key));
        // Drop acknowledgements that are no longer actionable (so they can alert again later)
        this.acknowledged = new Set([...this.acknowledged].filter(k => actionableKeys.has(k)));

        // Visible = actionable minus what the owner already dismissed
        const visible = actionable.filter(n => !this.acknowledged.has(n.key));
        const visibleKeys = new Set(visible.map(n => n.key));

        // Detect brand-new notifications (for sound + browser popup)
        const fresh = visible.filter(n => !this.prevVisibleKeys.has(n.key));
        if (!this.firstLoad && fresh.length > 0) {
          this.playBeep();
          this.showBrowserNotifications(fresh);
          this.arrived$.next(fresh);
        }

        this.notifications$.next(visible);
        this.prevVisibleKeys = visibleKeys;
        this.firstLoad = false;

        this.orders$.next(orders);
        this.pendingCount$.next(orders.filter(o => o.status === 'pending').length);
        this.persist();
      },
      error: () => { /* interceptor handles 401 */ }
    });
  }

  private buildNotification(type: 'order' | 'payment', o: any): AppNotification {
    const name = o.customer_name || 'Customer';
    const table = o.table_number ? `Table ${o.table_number}` : 'No table';
    if (type === 'payment') {
      const label = o.payment_status === 'partial' ? 'Partial payment' : 'Payment reported';
      return {
        key: `pay-${o.id}`,
        type,
        orderId: o.id,
        title: `${label} · Order #${o.id}`,
        detail: `${name} · ${table} · Paid ₹${o.paid_amount} of ₹${o.total_amount}`,
        createdAt: Date.now()
      };
    }
    return {
      key: `order-${o.id}`,
      type,
      orderId: o.id,
      title: `New order #${o.id}`,
      detail: `${name} · ${table} · ₹${o.total_amount}`,
      createdAt: Date.now()
    };
  }

  private persist() {
    try {
      localStorage.setItem(this.LS_ACK, JSON.stringify([...this.acknowledged]));
    } catch { /* ignore */ }
  }

  private restore() {
    try {
      const a = localStorage.getItem(this.LS_ACK);
      if (a) this.acknowledged = new Set(JSON.parse(a));
    } catch { /* ignore */ }
  }

  private requestBrowserPermission() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* ignore */ }
  }

  private showBrowserNotifications(items: AppNotification[]) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        items.forEach(n => new Notification(n.title, { body: n.detail }));
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
      osc.stop(ctx.currentTime + 0.25);
    } catch { /* ignore */ }
  }
}
