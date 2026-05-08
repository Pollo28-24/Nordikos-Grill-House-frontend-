import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { OrdersService } from '@core/services/orders.service';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DecimalPipe, DatePipe],
  templateUrl: './sales-dashboard.html'
})
export class SalesDashboard {
  private ordersService = inject(OrdersService);
  private router = inject(Router);
  
  // State
  selectedDateRange = signal<'today' | 'week' | 'month' | 'custom' | 'all'>('all');
  customStartDate = signal<string>(new Date().toISOString().split('T')[0]);
  customEndDate = signal<string>(new Date().toISOString().split('T')[0]);
  selectedServiceType = signal<'all' | 'mesa' | 'llevar' | 'delivery'>('all');
  
  // Data from service
  loading = this.ordersService.loadingOrders;
  allOrders = this.ordersService.orders;
  
  // Derived state: All orders for the list (including cancelled)
  ordersForList = computed(() => {
    return this.allOrders();
  });

  // Derived state: Valid orders for calculation (excluding cancelled)
  validOrders = computed(() => {
    return this.allOrders().filter(o => o.estado_pedido !== 'cancelado');
  });
  
  // Filtered by service type for the UI list
  filteredOrders = computed(() => {
    let orders = this.ordersForList();
    const service = this.selectedServiceType();
    
    if (service !== 'all') {
      const serviceNameMap: Record<string, string> = {
        'mesa': 'Mesa',
        'llevar': 'Para Llevar',
        'delivery': 'Delivery'
      };
      const targetName = serviceNameMap[service] || service;
      orders = orders.filter(o => 
        o.tipo_servicio_nombre.toLowerCase().includes(targetName.toLowerCase()) || 
        o.tipo_servicio_nombre.toLowerCase().includes(service)
      );
    }
    
    // Sort by date descending
    return orders.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
  });
  
  // KPIs - Only based on valid (non-cancelled) orders
  totalRevenue = computed(() => {
    return this.validOrders().reduce((acc, order) => acc + Number(order.total), 0);
  });
  
  totalOrdersCount = computed(() => {
    return this.validOrders().length;
  });
  
  averageTicket = computed(() => {
    const count = this.totalOrdersCount();
    return count > 0 ? this.totalRevenue() / count : 0;
  });
  
  // Breakdown - Only based on valid (non-cancelled) orders
  serviceBreakdown = computed(() => {
    const orders = this.validOrders(); 
    const breakdown = {
      mesa: { total: 0, count: 0, percentage: 0 },
      llevar: { total: 0, count: 0, percentage: 0 },
      delivery: { total: 0, count: 0, percentage: 0 }
    };
    
    let totalAll = 0;
    
    orders.forEach(o => {
      const name = o.tipo_servicio_nombre.toLowerCase();
      const total = Number(o.total);
      totalAll += total;
      
      if (name.includes('mesa')) {
        breakdown.mesa.total += total;
        breakdown.mesa.count += 1;
      } else if (name.includes('llevar')) {
        breakdown.llevar.total += total;
        breakdown.llevar.count += 1;
      } else if (name.includes('delivery')) {
        breakdown.delivery.total += total;
        breakdown.delivery.count += 1;
      }
    });
    
    if (totalAll > 0) {
      breakdown.mesa.percentage = Math.round((breakdown.mesa.total / totalAll) * 100);
      breakdown.llevar.percentage = Math.round((breakdown.llevar.total / totalAll) * 100);
      breakdown.delivery.percentage = Math.round((breakdown.delivery.total / totalAll) * 100);
    }
    
    return breakdown;
  });
  
  constructor() {
    effect(() => {
      // Read signal synchronously to track dependency
      const range = this.selectedDateRange();
      // Allow current execution context to complete before triggering reload
      setTimeout(() => this.loadDataForRange(range));
    });
  }
  
  goBack() {
    this.router.navigate(['/home']);
  }

  setRange(range: 'today' | 'week' | 'month' | 'custom' | 'all') {
    this.selectedDateRange.set(range);
  }
  
  applyCustomDate() {
    if (this.selectedDateRange() === 'custom') {
      this.loadDataForRange('custom');
    }
  }
  
  setServiceType(type: 'all' | 'mesa' | 'llevar' | 'delivery') {
    this.selectedServiceType.set(type);
  }
  
  private loadDataForRange(range: 'today' | 'week' | 'month' | 'custom' | 'all') {
    if (range === 'all') {
      this.ordersService.loadOrders();
      return;
    }

    let endStr = new Date().toISOString();
    let startStr = new Date().toISOString();
    
    if (range === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      startStr = start.toISOString();
      
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      endStr = end.toISOString();
    } else if (range === 'week') {
      const start = new Date();
      const day = start.getDay();
      const diff = start.getDate() - day + (day == 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      startStr = start.toISOString();
      
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      endStr = end.toISOString();
    } else if (range === 'month') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      startStr = start.toISOString();
      
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      endStr = end.toISOString();
    } else if (range === 'custom') {
      if (this.customStartDate()) {
        const start = new Date(this.customStartDate() + 'T00:00:00');
        start.setHours(0, 0, 0, 0);
        startStr = start.toISOString();
      }
      if (this.customEndDate()) {
        const end = new Date(this.customEndDate() + 'T00:00:00');
        end.setHours(23, 59, 59, 999);
        endStr = end.toISOString();
      }
    }
    
    this.ordersService.loadOrders({ start: startStr, end: endStr });
  }
}
