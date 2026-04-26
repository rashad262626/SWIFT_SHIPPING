// src/app/pages/customers/customers-list/customers-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaginationInfo } from '../../core/models/api-response.model';
import { CustomerListDto } from '../../core/models/customer.model';
import { CustomerService } from '../../core/services/customer/customer.service';


@Component({
  selector: 'app-customers-list',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.scss'],
  standalone: false,
})
export class CustomersListComponent implements OnInit {
  customers: CustomerListDto[] = [];
  loading = true;
  search = '';
  activeFilter: boolean | undefined = undefined;
  pagination: PaginationInfo | null = null;
  currentPage = 1;
  pageSize = 10;

  // Delete confirmation
  showDeleteModal = false;
  customerToDelete: CustomerListDto | null = null;
  deleteLoading = false;

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  constructor(
    private customerService: CustomerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerService
      .getAll(this.search || undefined, this.activeFilter, this.currentPage, this.pageSize)
      .subscribe({
        next: res => {
          this.customers = res.data || [];
          this.pagination = res.pagination || null;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toast('حدث خطأ في تحميل البيانات', 'error');
        }
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadCustomers();
  }

  clearSearch(): void {
    this.search = '';
    this.onSearch();
  }

  filterByStatus(val: boolean | undefined): void {
    this.activeFilter = val;
    this.currentPage = 1;
    this.loadCustomers();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadCustomers();
  }

  // Navigation
  goToCreate(): void {
    this.router.navigate(['/customers/create']);
  }

  goToCreateWithSearch(): void {
    this.router.navigate(['/customers/create'], {
      queryParams: { name: this.search }
    });
  }

  goToAccount(customerId: number): void {
    this.router.navigate(['/customers/account', customerId]);
  }

  // Toggle active
  toggleActive(customer: CustomerListDto, event: Event): void {
    event.stopPropagation();
    this.customerService.toggleActive(customer.id).subscribe({
      next: res => {
        if (res.success) {
          customer.isActive = !customer.isActive;
          this.toast(res.message || 'تم تحديث الحالة', 'success');
        }
      },
      error: () => this.toast('حدث خطأ', 'error')
    });
  }

  // Delete
  openDeleteModal(customer: CustomerListDto, event: Event): void {
    event.stopPropagation();
    this.customerToDelete = customer;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.customerToDelete = null;
  }

  confirmDelete(): void {
    if (!this.customerToDelete) return;
    this.deleteLoading = true;
    this.customerService.delete(this.customerToDelete.id).subscribe({
      next: res => {
        this.deleteLoading = false;
        this.closeDeleteModal();
        if (res.success) {
          this.toast('تم حذف العميل بنجاح', 'success');
          this.loadCustomers();
        } else {
          this.toast(res.message || 'لا يمكن حذف العميل', 'error');
        }
      },
      error: err => {
        this.deleteLoading = false;
        this.closeDeleteModal();
        this.toast(err?.error?.message || 'حدث خطأ أثناء الحذف', 'error');
      }
    });
  }

  // Helpers
  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w.charAt(0))
      .join('');
  }

  get totalPages(): number[] {
    if (!this.pagination) return [];
    return Array.from({ length: this.pagination.totalPages }, (_, i) => i + 1);
  }

  get hasNoResults(): boolean {
    return !this.loading && this.customers.length === 0 && !!this.search;
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 4000);
  }
}