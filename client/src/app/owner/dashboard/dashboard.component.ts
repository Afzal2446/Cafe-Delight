import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, OwnerNavComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats = { totalOrders: 0, todayOrders: 0, todayRevenue: 0, pendingOrders: 0, totalItems: 0 };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getStats().subscribe(s => this.stats = s);
  }
}
