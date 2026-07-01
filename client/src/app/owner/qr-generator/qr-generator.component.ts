import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, OwnerNavComponent],
  templateUrl: './qr-generator.component.html',
  styleUrls: ['./qr-generator.component.css']
})
export class QrGeneratorComponent {
  tableNumber: number | null = null;
  customUrl = '';
  qrImage = '';
  qrUrl = '';

  constructor(private api: ApiService) {}

  generate() {
    this.api.generateQR(this.tableNumber || undefined).subscribe(res => {
      this.qrImage = res.qr;
      this.qrUrl = res.url;
    });
  }

  downloadQR() {
    const link = document.createElement('a');
    link.href = this.qrImage;
    link.download = `qr-table-${this.tableNumber || 'general'}.png`;
    link.click();
  }

  printQR() {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<img src="${this.qrImage}" style="width:400px"><p>Table: ${this.tableNumber || 'General'}</p>`);
      win.print();
    }
  }
}
