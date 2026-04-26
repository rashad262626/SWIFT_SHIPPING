// src/app/pages/finance/payments/payments.component.ts
import { Component, OnInit } from '@angular/core';
import { OrderListDto } from '../../../core/models/order.model';
import { CreatePaymentDto, PaymentDto, PaymentService } from '../../../core/services/payment/payment.service';
import { OrderService } from '../../../core/services/order/order.service';

@Component({
  selector: 'app-payments',
  standalone: false,
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit {
  // Tabs
  activeTab: 'add' | 'order' | 'customer' = 'add';

  // Add Payment Form
  form = {
    orderId: null as number | null,
    amount: 0,
    currency: 1,
    paymentMethod: 1,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  // Order Search
  orderSearch = '';
  filteredOrders: OrderListDto[] = [];
  allOrders: OrderListDto[] = [];
  selectedOrder: OrderListDto | null = null;
  showOrderDropdown = false;

  // Lookup by Order
  lookupOrderId = '';
  orderPayments: PaymentDto[] = [];

  // Lookup by Customer
  lookupCustomerId = '';
  customerPayments: PaymentDto[] = [];

  // State
  isSubmitting = false;
  isLoading = false;
  successMsg = '';
  errorMsg = '';
  errors: Record<string, string> = {};

  // Stats
  stats = { totalAmount: 0, totalCount: 0, cashAmount: 0, bankAmount: 0 };

  constructor(
    private paymentService: PaymentService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.orderService.getAll(undefined, undefined, undefined, undefined, undefined, undefined, 1, 200)
      .subscribe({
        next: res => {
          if (res.success) {
            this.allOrders = (res.data || []).filter((o: any) =>
              o.orderStatusName !== 'ملغي' && o.paymentStatusName !== 'مدفوع');
            this.filteredOrders = this.allOrders;
          }
        },
        error: () => {
          this.allOrders = [
            { id: 1, shipmentCode: 'SH-2024-0156', customerName: 'أحمد خالد', customerCode: 'C001', orderTypeName: 'شراء', transportTypeName: 'بحري', totalPriceYuan: 5000, totalPriceDinar: 2500, finalPrice: 2350, remainingAmount: 800, paymentStatusName: 'مدفوع جزئياً', orderStatusName: 'قيد المعالجة', createdAt: '2024-01-15' },
            { id: 3, shipmentCode: 'SH-2024-0154', customerName: 'فهد علي', customerCode: 'C003', orderTypeName: 'شراء', transportTypeName: 'بحري', totalPriceYuan: 8000, totalPriceDinar: 5200, finalPrice: 4900, remainingAmount: 4900, paymentStatusName: 'غير مدفوع', orderStatusName: 'جديد', createdAt: '2024-01-14' },
          ];
          this.filteredOrders = this.allOrders;
        }
      });
  }

  onOrderSearch(): void {
    this.showOrderDropdown = true;
    const s = this.orderSearch.toLowerCase();
    this.filteredOrders = this.allOrders.filter(o =>
      o.shipmentCode.toLowerCase().includes(s) ||
      o.customerName.toLowerCase().includes(s)
    );
  }

  selectOrder(o: OrderListDto): void {
    this.selectedOrder = o;
    this.form.orderId = o.id;
    this.form.amount = o.remainingAmount;
    this.orderSearch = `${o.shipmentCode} - ${o.customerName}`;
    this.showOrderDropdown = false;
    this.clearError('orderId');
  }

  clearOrder(): void {
    this.selectedOrder = null;
    this.form.orderId = null;
    this.form.amount = 0;
    this.orderSearch = '';
  }

  validate(): boolean {
    this.errors = {};
    if (!this.form.orderId) this.errors['orderId'] = 'يرجى اختيار الشحنة';
    if (!this.form.amount || this.form.amount <= 0) this.errors['amount'] = 'يرجى إدخال مبلغ صحيح';
    if (this.selectedOrder && this.form.amount > this.selectedOrder.remainingAmount)
      this.errors['amount'] = `المبلغ يتجاوز المتبقي (${this.selectedOrder.remainingAmount})`;
    return Object.keys(this.errors).length === 0;
  }

  clearError(k: string): void { delete this.errors[k]; }

  onSubmit(): void {
    if (!this.validate() || this.isSubmitting) return;
    this.isSubmitting = true;
    this.successMsg = '';
    this.errorMsg = '';

    const dto: CreatePaymentDto = {
      orderId: this.form.orderId!,
      amount: this.form.amount,
      currency: this.form.currency,
      paymentMethod: this.form.paymentMethod,
      paymentDate: this.form.paymentDate,
      notes: this.form.notes || null
    };

    this.paymentService.addPayment(dto).subscribe({
      next: res => {
        this.isSubmitting = false;
        if (res.success) {
          this.successMsg = `تم تسجيل الدفعة بنجاح — ${res.data?.shipmentCode}`;
          this.resetForm();
          this.loadOrders();
        } else {
          this.errorMsg = res.message;
        }
      },
      error: err => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.message || 'حدث خطأ في الاتصال';
      }
    });
  }

  resetForm(): void {
    this.form = { orderId: null, amount: 0, currency: 1, paymentMethod: 1, paymentDate: new Date().toISOString().split('T')[0], notes: '' };
    this.selectedOrder = null;
    this.orderSearch = '';
  }

  lookupByOrder(): void {
    if (!this.lookupOrderId) return;
    this.isLoading = true;
    this.paymentService.getOrderPayments(+this.lookupOrderId).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success) {
          this.orderPayments = res.data || [];
          this.calcStats(this.orderPayments);
        }
      },
      error: () => {
        this.isLoading = false;
        this.orderPayments = this.getMockPayments();
        this.calcStats(this.orderPayments);
      }
    });
  }

  lookupByCustomer(): void {
    if (!this.lookupCustomerId) return;
    this.isLoading = true;
    this.paymentService.getCustomerPayments(+this.lookupCustomerId).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success) {
          this.customerPayments = res.data || [];
          this.calcStats(this.customerPayments);
        }
      },
      error: () => {
        this.isLoading = false;
        this.customerPayments = this.getMockPayments();
        this.calcStats(this.customerPayments);
      }
    });
  }

  deletePayment(id: number, list: 'order' | 'customer'): void {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;
    this.paymentService.deletePayment(id).subscribe({
      next: res => {
        if (res.success) {
          if (list === 'order') this.orderPayments = this.orderPayments.filter(p => p.id !== id);
          else this.customerPayments = this.customerPayments.filter(p => p.id !== id);
        }
      },
      error: () => {}
    });
  }

  calcStats(payments: PaymentDto[]): void {
    this.stats = {
      totalCount: payments.length,
      totalAmount: payments.reduce((s, p) => s + p.amount, 0),
      cashAmount: payments.filter(p => p.paymentMethodName === 'نقدي').reduce((s, p) => s + p.amount, 0),
      bankAmount: payments.filter(p => p.paymentMethodName === 'تحويل بنكي').reduce((s, p) => s + p.amount, 0)
    };
  }

  getMockPayments(): PaymentDto[] {
    return [
      { id: 1, orderId: 1, shipmentCode: 'SH-2024-0156', customerName: 'أحمد خالد', amount: 800, currencyName: 'دينار', paymentMethodName: 'نقدي', paymentDate: '2024-01-15T10:00:00', notes: null, createdByName: 'محمد أحمد', createdAt: '2024-01-15T10:00:00' },
      { id: 2, orderId: 1, shipmentCode: 'SH-2024-0156', customerName: 'أحمد خالد', amount: 1200, currencyName: 'دينار', paymentMethodName: 'تحويل بنكي', paymentDate: '2024-01-14T14:00:00', notes: 'دفعة مقدمة', createdByName: 'محمد أحمد', createdAt: '2024-01-14T14:00:00' },
    ];
  }

  formatCurrency(n: number): string {
    return n?.toLocaleString('ar-LY') || '0';
  }

    getPayClass(status: string): string {
    const map: Record<string, string> = {
      'مدفوع': 'paid',
      'مدفوع جزئياً': 'partial',
      'غير مدفوع': 'unpaid'
    };
    return map[status] || '';
  }
}