import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OwnerNavComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: any = {
    totalOrders: 0, todayOrders: 0, todayRevenue: 0,
    weekOrders: 0, weekRevenue: 0, monthOrders: 0, monthRevenue: 0,
    pendingOrders: 0, totalItems: 0
  };

  // Date range report
  rangeStart = '';
  rangeEnd = '';
  rangeResult: any = null;
  rangeError = '';
  rangeLoading = false;
  rangeCollapsed = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getStats().subscribe(s => this.stats = s);

    // Default the range to the current month
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    this.rangeStart = this.toDateInput(first);
    this.rangeEnd = this.toDateInput(today);
  }

  private toDateInput(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  runRangeReport() {
    if (!this.rangeStart || !this.rangeEnd) {
      this.rangeError = 'Please pick both a start and end date';
      return;
    }
    if (this.rangeStart > this.rangeEnd) {
      this.rangeError = 'Start date cannot be after end date';
      return;
    }
    this.rangeError = '';
    this.rangeLoading = true;
    this.api.getStatsRange(this.rangeStart, this.rangeEnd).subscribe({
      next: (res) => {
        this.rangeResult = res;
        this.rangeCollapsed = false;
        this.rangeLoading = false;
      },
      error: (err) => {
        this.rangeLoading = false;
        this.rangeError = err?.error?.error || 'Failed to load report';
      }
    });
  }

  closeRangeReport() {
    this.rangeResult = null;
    this.rangeCollapsed = false;
  }
}
