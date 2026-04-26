import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerResponseDto } from '../../core/models/costumer_new';
import {
  CustomerAccountSummaryDto,
  CustomerTransactionResponseDto,
  CreateCustomerTransactionDto,
} from '../../core/models/customer-transaction.model';
import { CustomerService } from '../../core/services/customer/customer.service';

@Component({
  selector: 'app-customer-account',
  templateUrl: './customer-account.component.html',
  styleUrls: ['./customer-account.component.scss'],
  standalone: false,
})
export class CustomerAccountComponent implements OnInit {

  customerId!: number;
  customer: CustomerResponseDto | null = null;
  summary: CustomerAccountSummaryDto | null = null;
  loading = true;

  // Filters
  dateFrom = '';
  dateTo = '';

  // Add Transaction Modal
  showAddModal = false;
  txForm: CreateCustomerTransactionDto = this.resetTxForm();
  txSubmitting = false;
  txErrors: Record<string, string> = {};

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  transactionTypes = [
    { value: 0, label: 'مدين (عليه)', icon: 'fa-arrow-up', cls: 'debit' },
    { value: 1, label: 'دائن (له)', icon: 'fa-arrow-down', cls: 'credit' },
    { value: 2, label: 'استرداد', icon: 'fa-undo', cls: 'refund' },
  ];

  constructor(
    private customerService: CustomerService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));

      console.log('Route ID:', id);

      if (!id || isNaN(id)) {
        this.toast('Invalid customer ID', 'error');
        this.router.navigate(['/customers']);
        return;
      }

      this.customerId = id;
      this.loadData();
    });
  }

  loadData(): void {
    if (!this.customerId) return;

    this.loading = true;

    // Load customer info
    this.customerService.getById(this.customerId).subscribe({
      next: res => {
        if (res.success) {
          this.customer = res.data;
        } else {
          this.toast(res.message || 'العميل غير موجود', 'error');
        }
      },
      error: () => this.toast('خطأ في تحميل بيانات العميل', 'error'),
    });

    // Load transactions
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.customerId) return;

    this.customerService
      .getCustomerAccount(
        this.customerId,
        this.dateFrom || undefined,
        this.dateTo || undefined
      )
      .subscribe({
        next: (res) => {
          if (res.success) this.summary = res.data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toast('خطأ في تحميل كشف الحساب', 'error');
        },
      });
  }

  applyDateFilter(): void {
    this.loadTransactions();
  }

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.loadTransactions();
  }

  // ================= ADD TRANSACTION =================
  openAddModal(): void {
    this.txForm = this.resetTxForm();
    this.txErrors = {};
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  resetTxForm(): CreateCustomerTransactionDto {
    return {
      customerId: this.customerId ?? 0,
      transactionType: 0,
      amount: 0,
      currency: 0,
      description: '',
      notes: '',
    };
  }

  validateTx(): boolean {
    this.txErrors = {};

    if (!this.txForm.amount || this.txForm.amount <= 0) {
      this.txErrors['amount'] = 'المبلغ يجب أن يكون أكبر من صفر';
    }

    if (!this.txForm.description?.trim()) {
      this.txErrors['desc'] = 'الوصف مطلوب';
    }
    return Object.keys(this.txErrors).length === 0;
  }

  submitTransaction(): void {
    if (!this.validateTx() || this.txSubmitting) return;

    this.txForm.customerId = this.customerId;
    this.txSubmitting = true;

    this.customerService.addManualTransaction(this.txForm).subscribe({
      next: (res) => {
        this.txSubmitting = false;

        if (res.success) {
          this.toast(res.message || 'تم إضافة المعاملة', 'success');
          this.closeAddModal();
          this.loadData();
        } else {
          this.toast(res.message || 'حدث خطأ', 'error');
        }
      },
      error: (err) => {
        this.txSubmitting = false;
        this.toast(err?.error?.message || 'حدث خطأ', 'error');
      },
    });
  }

  get estimatedBalance(): number {
    if (!this.summary) return 0;

    const current = this.summary.currentBalance;

    return this.txForm.transactionType === 0
      ? current + (this.txForm.amount || 0)
      : current - (this.txForm.amount || 0);
  }

  // ================= HELPERS =================
  goBack(): void {
    this.router.navigate(['/customers']);
  }

  getInitials(name: string): string {
    return name?.split(' ')
      .slice(0, 2)
      .map(w => w.charAt(0))
      .join('') || '?';
  }

  getTypeClass(typeName: string): string {
    if (typeName.includes('Debit') || typeName.includes('مدين')) return 'debit';
    if (typeName.includes('Credit') || typeName.includes('دائن'))
      return 'credit';
    if (typeName.includes('Refund') || typeName.includes('استرداد'))
      return 'refund';
    return '';
  }

  getTypeLabel(typeName: string): string {
    if (typeName.includes('Debit')) return 'مدين';
    if (typeName.includes('Credit')) return 'دائن';
    if (typeName.includes('Refund')) return 'استرداد';
    return typeName;
  }

  printStatement(): void {
    window.print();
  }

  private toast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 4000);
  }
}
