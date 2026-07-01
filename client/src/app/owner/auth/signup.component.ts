import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-owner-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./auth.component.css']
})
export class SignupComponent {
  name = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.email || !this.password) {
      this.error = 'Please enter your email and password';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }
    this.error = '';
    this.loading = true;
    this.auth.signup(this.name, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/owner']),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Signup failed';
      }
    });
  }
}
