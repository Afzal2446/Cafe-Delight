import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, OwnerNavComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settings: any = {};
  saved = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getSettings().subscribe(s => this.settings = s || {});
  }

  save() {
    this.api.updateSettings(this.settings).subscribe(() => {
      this.saved = true;
      setTimeout(() => this.saved = false, 3000);
    });
  }
}
