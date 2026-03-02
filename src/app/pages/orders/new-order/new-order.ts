import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';

import { ProductsService } from '../../../core/services/products.service';
import { OrdersService } from '../../../core/services/orders.service';
import {
  OrderCreateItem,
  OrderCreateDto
} from '../../../core/models/order.model';
import { ToastService } from '../../../core/services/toast.service';
import { Navbar } from '../../../componentes/shared/navbar/navbar';
import { SupabaseService } from '../../../shared/data-access/supabase.service';

/* ============================
   Interfaces tipadas
============================ */

interface PaymentMethod {
  id: number;
  nombre: string;
  tipo?: string;
}

interface ServiceType {
  id: number;
  nombre: string;
}

interface Shift {
  id: number;
  nombre: string;
  hora_inicio?: string;
  hora_fin?: string;
}

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    Navbar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-order.html'
})
export class NewOrder implements OnInit {

  /* ============================
     Injections
  ============================ */

  private productsService = inject(ProductsService);
  private ordersService = inject(OrdersService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService).client;

  /* ============================
     Signals
  ============================ */

  products = this.productsService.products;
  creating = this.ordersService.creating;

  cart = signal<OrderCreateItem[]>([]);

  paymentMethods = signal<PaymentMethod[]>([]);
  serviceTypes = signal<ServiceType[]>([]);
  shifts = signal<Shift[]>([]);

  /* ============================
     Computed
  ============================ */

  total = computed(() =>
    this.cart().reduce((acc, item) => {
      const price = (item as any).precio ?? 0; // depende de tu modelo real
      return acc + price * item.cantidad;
    }, 0)
  );

  /* ============================
     Form
  ============================ */

  form = this.fb.group({
    metodo_pago_id: this.fb.control<number | null>(null, [
      Validators.required
    ]),
    tipo_servicio_id: this.fb.control<number | null>(null, [
      Validators.required
    ]),
    turno_id: this.fb.control<number | null>(null, [
      Validators.required
    ]),
    propina: this.fb.control<number>(0, [Validators.min(0)])
  });

  /* ============================
     Lifecycle
  ============================ */

  ngOnInit(): void {
    this.loadCatalogs();
  }

  /* ============================
     Load Catalogs
  ============================ */

  private async loadCatalogs() {
    try {
      const [
        { data: pagos, error: e1 },
        { data: servicios, error: e2 },
        { data: turnos, error: e3 }
      ] = await Promise.all([
        this.supabase
          .from('metodos_pago')
          .select('id,nombre,tipo')
          .order('id'),
        this.supabase
          .from('tipos_servicio')
          .select('id,nombre')
          .order('id'),
        this.supabase
          .from('turnos')
          .select('id,nombre,hora_inicio,hora_fin')
          .order('id')
      ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      this.paymentMethods.set((pagos ?? []) as PaymentMethod[]);
      this.serviceTypes.set((servicios ?? []) as ServiceType[]);
      this.shifts.set((turnos ?? []) as Shift[]);

      this.setDefaultFormValues();

    } catch (err: any) {
      this.toastService.show(
        err?.message || 'Error cargando catálogos',
        'error'
      );
    }
  }

  private setDefaultFormValues() {
    this.form.patchValue({
      metodo_pago_id: this.paymentMethods()[0]?.id ?? null,
      tipo_servicio_id: this.serviceTypes()[0]?.id ?? null,
      turno_id: this.shifts()[0]?.id ?? null,
      propina: 0
    });
  }

  /* ============================
     Cart Logic (Inmutable)
  ============================ */

  private addItem(item: Partial<OrderCreateItem>) {
    this.cart.update(items => {

      const existing = items.find(i =>
        item.variante_id
          ? i.variante_id === item.variante_id
          : i.producto_id === item.producto_id && !i.variante_id
      );

      if (existing) {
        return items.map(i =>
          i === existing
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }

      return [
        ...items,
        { ...item, cantidad: 1 } as OrderCreateItem
      ];
    });
  }

  addProduct(producto_id: number | string) {
    this.addItem({ producto_id });
  }

  addVariant(variante_id: number | string) {
    this.addItem({ variante_id });
  }

  increment(item: OrderCreateItem) {
    this.cart.update(items =>
      items.map(i =>
        i === item
          ? { ...i, cantidad: i.cantidad + 1 }
          : i
      )
    );
  }

  decrement(item: OrderCreateItem) {
    this.cart.update(items =>
      items
        .map(i =>
          i === item
            ? { ...i, cantidad: i.cantidad - 1 }
            : i
        )
        .filter(i => i.cantidad > 0)
    );
  }

  remove(item: OrderCreateItem) {
    this.cart.update(items =>
      items.filter(i => i !== item)
    );
  }

  trackItem(index: number, item: OrderCreateItem) {
    return (item.variante_id ?? 'p-' + item.producto_id) + '-' + index;
  }

  /* ============================
     Submit
  ============================ */

  async submit() {
    if (this.form.invalid || this.cart().length === 0) {
      this.toastService.show(
        'Formulario inválido o carrito vacío',
        'error'
      );
      return;
    }

    const DEBUG = true;
    if (DEBUG) {
      console.group('new-order.submit');
      console.log('form', this.form.value);
      console.log('cart', this.cart());
    }

    const dto: OrderCreateDto = {
      cliente_id: null as any,
      metodo_pago_id: Number(this.form.value.metodo_pago_id),
      tipo_servicio_id: Number(this.form.value.tipo_servicio_id),
      turno_id: Number(this.form.value.turno_id),
      propina: this.form.value.propina ?? 0,
      items: this.cart(),
      client_request_id: crypto.randomUUID()
    };

    if (DEBUG) {
      console.log('dto', dto);
    }

    const res = await this.ordersService.createOrder(dto);

    if (res.status === 'success') {

      this.toastService.show(
        `Orden #${res.order_id} creada. Total: ${res.total}`,
        'success'
      );

      if (DEBUG) {
        console.groupEnd();
      }
      this.cart.set([]);
      this.setDefaultFormValues();

    } else {

      const errorMap: Record<string, string> = {
        PRODUCT_NOT_AVAILABLE: 'Producto/variante no disponible',
        PAYMENT_METHOD_INVALID: 'Método de pago inválido',
        SERVICE_TYPE_INVALID: 'Tipo de servicio inválido',
        SHIFT_INVALID: 'Turno inválido',
        IDEMPOTENCY_CONFLICT: 'Orden ya fue creada'
      };

      this.toastService.show(
        errorMap[res.error_code as string] ||
          'Error al crear la orden',
        'error'
      );
      if (DEBUG) {
        console.warn('submit.error', res);
        console.groupEnd();
      }
    }
  }
}
