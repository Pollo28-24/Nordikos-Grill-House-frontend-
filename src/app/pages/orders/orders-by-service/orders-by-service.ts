import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../../../core/services/orders.service';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { Navbar } from '../../../componentes/shared/navbar/navbar';

interface ServiceType {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-orders-by-service',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink, Navbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-by-service.html'
})
export class OrdersByService implements OnInit {
  private ordersService = inject(OrdersService);
  private supabase = inject(SupabaseService).client;

  orders = this.ordersService.orders;
  loading = this.ordersService.loadingOrders;

  serviceTypes = signal<ServiceType[]>([]);
  selectedTypeId = signal<number | null>(null);

  filtered = computed(() => {
    const all = this.orders();
    const t = this.selectedTypeId();
    if (!t) return all;
    return all.filter(o => o.tipo_servicio_id === t);
  });

  ngOnInit(): void {
    this.loadTypes();
    this.ordersService.loadOrders();
  }

  async loadTypes() {
    const { data, error } = await this.supabase
      .from('tipos_servicio')
      .select('id,nombre')
      .order('id');
    if (!error) {
      this.serviceTypes.set((data ?? []) as ServiceType[]);
      if (this.serviceTypes().length) {
        this.selectedTypeId.set(this.serviceTypes()[0].id);
      }
    }
  }

  selectType(id: number | null) {
    this.selectedTypeId.set(id);
  }
}
