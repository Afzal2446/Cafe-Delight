import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { OwnerNavComponent } from '../owner-nav/owner-nav.component';

@Component({
  selector: 'app-menu-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, OwnerNavComponent],
  templateUrl: './menu-manage.component.html',
  styleUrls: ['./menu-manage.component.css']
})
export class MenuManageComponent implements OnInit {
  menuItems: any[] = [];
  categories: any[] = [];
  showForm = false;
  editingId: number | null = null;
  newCategoryName = '';
  formData = { name: '', description: '', price: 0, category_id: 0 };

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getAllMenuItems().subscribe(items => this.menuItems = items);
    this.api.getCategories().subscribe(cats => this.categories = cats);
  }

  saveItem() {
    if (!this.formData.name || !this.formData.price || !this.formData.category_id) return;
    if (this.editingId) {
      this.api.updateMenuItem(this.editingId, this.formData).subscribe(() => { this.cancelEdit(); this.load(); });
    } else {
      this.api.addMenuItem(this.formData).subscribe(() => { this.cancelEdit(); this.load(); });
    }
  }

  editItem(item: any) {
    this.editingId = item.id;
    this.formData = { name: item.name, description: item.description, price: item.price, category_id: item.category_id };
    this.showForm = true;
  }

  cancelEdit() {
    this.editingId = null;
    this.formData = { name: '', description: '', price: 0, category_id: 0 };
    this.showForm = false;
  }

  deleteItem(id: number) {
    if (confirm('Delete this item?')) {
      this.api.deleteMenuItem(id).subscribe(() => this.load());
    }
  }

  toggleAvailability(item: any) {
    const newVal = item.is_available ? 0 : 1;
    this.api.updateMenuItem(item.id, { is_available: newVal }).subscribe(() => {
      item.is_available = newVal;
    });
  }

  addCategory() {
    if (!this.newCategoryName.trim()) return;
    this.api.addCategory(this.newCategoryName.trim()).subscribe(() => {
      this.newCategoryName = '';
      this.load();
    });
  }

  deleteCategory(id: number) {
    if (confirm('Delete this category? (Only works if no items use it)')) {
      this.api.deleteCategory(id).subscribe({ next: () => this.load(), error: (e) => alert(e.error?.error || 'Cannot delete') });
    }
  }
}
