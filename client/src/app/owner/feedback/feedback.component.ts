import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-owner-feedback',
  standalone: true,
  imports: [CommonModule, OwnerNavComponent],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css']
})
export class FeedbackComponent implements OnInit {
  feedback: any[] = [];
  averageRating = 0;
  total = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getFeedback().subscribe(res => {
      this.feedback = res.feedback || [];
      this.averageRating = res.averageRating || 0;
      this.total = res.total || 0;
    });
  }

  stars(rating: number): number[] {
    return Array(rating).fill(0);
  }

  emptyStars(rating: number): number[] {
    return Array(Math.max(0, 5 - rating)).fill(0);
  }

  roundedAvg(): number {
    return Math.round(this.averageRating);
  }
}
