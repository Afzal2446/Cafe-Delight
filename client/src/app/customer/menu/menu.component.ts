import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  categories: any[] = [];
  menuItems: any[] = [];
  filteredItems: any[] = [];
  selectedCategory: number | null = null;
  showToast = false;
  toastMessage = '';
  activeOrderId: string | null = null;
  quantities: { [id: number]: number } = {};

  constructor(
    private api: ApiService,
    public cartService: CartService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.api.getCategories().subscribe(cats => this.categories = cats);
    this.api.getMenuItems().subscribe(items => {
      this.menuItems = items;
      this.filteredItems = items;
    });

    // Keep a live map of item id -> quantity in the cart
    this.cartService.cart$.subscribe(cartItems => {
      const map: { [id: number]: number } = {};
      cartItems.forEach(ci => map[ci.menu_item_id] = ci.quantity);
      this.quantities = map;
    });

    this.route.queryParams.subscribe(params => {
      if (params['table']) {
        localStorage.setItem('table_number', params['table']);
      }
    });

    // Show a tracking banner if the customer has an active order
    this.activeOrderId = localStorage.getItem('active_order_id');
  }

  getQty(itemId: number): number {
    return this.quantities[itemId] || 0;
  }

  filterByCategory(catId: number | null) {
    this.selectedCategory = catId;
    if (catId) {
      this.filteredItems = this.menuItems.filter(i => i.category_id === catId);
    } else {
      this.filteredItems = this.menuItems;
    }
  }

  addToCart(item: any) {
    this.cartService.addItem({ id: item.id, name: item.name, price: item.price });
    this.showToastMsg(`${item.name} added to cart`);
  }

  increment(item: any) {
    this.cartService.addItem({ id: item.id, name: item.name, price: item.price });
  }

  decrement(item: any) {
    const current = this.getQty(item.id);
    this.cartService.updateQuantity(item.id, current - 1);
  }

  showToastMsg(msg: string) {
    this.toastMessage = msg;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 2000);
  }
}
