import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { OrdersService } from '../../../../core/services/orders.service';
import { ProductsService } from '../../../../core/services/products.service';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { OrderCreateDto } from '../../../../core/models/order.model';
import { ToastService } from '../../../../core/services/toast.service';
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

interface Client {
  id: number;
  nombre: string;
  telefono?: string;
}

@Component({
  selector: 'app-new-order-cart',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './cart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewOrderCart {

  public ordersService = inject(OrdersService);
  private supabase = inject(SupabaseService).client;
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private productsService = inject(ProductsService);
  private router = inject(Router);

  cart = this.ordersService.cart;
  creating = this.ordersService.creating;

  // propina reactiva
  propina = signal(0);

  total = computed(() => {

    const prods = this.productsService.products();
    const itemsTotal = this.cart().reduce((acc: number, item: any) => {
      const unit = this.getUnitPrice(item, prods);
      const qty = Number(item.cantidad ?? 0);
      return acc + unit * qty;
    }, 0);

    return itemsTotal + this.propina();

  });

  paymentMethods = signal<PaymentMethod[]>([]);
  serviceTypes = signal<ServiceType[]>([]);
  clients = signal<Client[]>([]);

  form = this.fb.nonNullable.group({
    cliente_id: this.fb.control<number | null>(null),
    metodo_pago_id: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    tipo_servicio_id: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    propina: this.fb.control<number>(0, { validators: [Validators.min(0)] }),
    nota_general: this.fb.control<string>(''),
  });

  constructor() {
    console.log('NewOrderCart.constructor - editingOrderId:', this.ordersService.editingOrderId());
    this.loadCatalogs().then(() => {
      this.loadExistingOrderData();
    });
  }

  async loadExistingOrderData() {
    const orderId = this.ordersService.editingOrderId();
    if (!orderId) return;

    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (order) {
        this.form.patchValue({
          cliente_id: order.cliente_id,
          metodo_pago_id: order.metodo_pago_id,
          tipo_servicio_id: order.tipo_servicio_id,
          propina: order.propina || 0,
          nota_general: order.nota_general || '',
        });
        this.propina.set(order.propina || 0);
      }
    } catch (e) {
      console.error('Error loading existing order data:', e);
    }
  }

  updateTip(event: Event) {
    const value = Number((event.target as HTMLInputElement)?.value ?? 0);
    this.propina.set(isNaN(value) ? 0 : value);
    this.form.patchValue({ propina: this.propina() });
  }

  clearCart() {
    this.ordersService.clearCart();
  }

  async loadCatalogs() {

    try {

      const [
        { data: pagos },
        { data: servicios },
        { data: clientes },
      ] = await Promise.all([

        this.supabase.from('metodos_pago').select('id,nombre,tipo').order('id'),
        this.supabase.from('tipos_servicio').select('id,nombre').order('id'),
        this.supabase.from('clientes').select('id,nombre,telefono').order('nombre').limit(100),

      ]);

      this.paymentMethods.set(pagos ?? []);
      this.serviceTypes.set(servicios ?? []);
      this.clients.set(clientes ?? []);

      this.form.patchValue({
        metodo_pago_id: this.paymentMethods()[0]?.id ?? null,
        tipo_servicio_id: this.serviceTypes()[0]?.id ?? null,
      });

    } catch {
      this.toastService.show('Error al cargar catálogos', 'error');
    }

  }

  increment(item: any) {
    this.ordersService.increment(item);
  }

  decrement(item: any) {
    this.ordersService.decrement(item);
  }

  remove(item: any) {
    this.ordersService.remove(item);
  }

  updateItemNote(item: any, event: Event) {
    const note = (event.target as HTMLTextAreaElement).value;
    item.nota = note;
    this.ordersService.cart.set([...this.cart()]);
  }

  getUnitPrice(item: any, prods: any[]): number {
    const varId = item?.variante_id;
    const prodId = item?.producto_id;
    let basePrice = 0;

    if (varId != null) {
      for (const p of prods) {
        const v = (p?.variants ?? []).find((vv: any) => String(vv.id) === String(varId));
        if (v) {
          basePrice = Number(v.precio ?? 0);
          break;
        }
      }
    } else if (prodId != null) {
      const p = prods.find(pp => String(pp.id) === String(prodId));
      if (p) basePrice = Number(p.precio ?? 0);
    }

    // Add modifiers price
    const modsPrice = (item.modificadores || []).reduce((acc: number, m: any) => {
      return acc + (Number(m.precio_unitario || 0) * Number(m.cantidad || 1));
    }, 0);

    return basePrice + modsPrice;
  }

  unitPrice(item: any): number {
    return this.getUnitPrice(item, this.productsService.products());
  }

  lineTotal(item: any): number {
    const unit = this.unitPrice(item);
    const qty = Number(item.cantidad ?? 0);
    return unit * qty;
  }

  isEditingOrder = computed(() => this.ordersService.editingOrderId() !== null);

  async submit() {
    console.log('Cart.submit - isEditingOrder:', this.isEditingOrder());
    console.log('Cart.submit - editingOrderId:', this.ordersService.editingOrderId());

    if (this.form.invalid || this.cart().length === 0) {
      this.toastService.show('Formulario inválido o carrito vacío', 'error');
      return;
    }

    if (this.isEditingOrder()) {
      await this.updateExistingOrder();
    } else {
      await this.createNewOrder();
    }
  }

  async createNewOrder() {
    const dto: OrderCreateDto = {
      cliente_id: this.form.value.cliente_id ?? undefined,
      metodo_pago_id: Number(this.form.value.metodo_pago_id),
      tipo_servicio_id: Number(this.form.value.tipo_servicio_id),
      turno_id: null as any, // Por ahora irrelevante
      propina: this.propina(),
      nota_general: this.form.value.nota_general || undefined,
      items: this.cart(),
      client_request_id: crypto.randomUUID(),
    };

    const res = await this.ordersService.createOrder(dto);
    if (res.status === 'success') {
      this.toastService.show(`Orden #${res.order_id} creada`, 'success');
      // Después de crear con éxito, redirigimos al detalle para imprimir ticket
      this.ordersService.clearCart();
      this.ordersService.editingOrderId.set(null);
      this.propina.set(0);
      this.router.navigate(['/orders', res.order_id]);
    } else {
      this.toastService.show('Error al crear la orden', 'error');
    }
  }

  async updateExistingOrder() {
    const orderId = this.ordersService.editingOrderId();
    
    try {
      let addedTotal = 0;
      // Para cada item del carrito, insertamos en order_items
      for (const item of this.cart()) {
        const lineTotal = this.lineTotal(item);
        addedTotal += lineTotal;

        // 1. Insertar el item
        const { data: newItem, error: itemError } = await this.supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            producto_id: item.producto_id,
            variante_id: item.variante_id,
            nombre_producto: item.nombre_producto, // Campo obligatorio corregido
            cantidad: item.cantidad,
            nota: item.nota,
            precio_unitario: this.unitPrice(item),
            total: lineTotal // Campo obligatorio corregido
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // 2. Insertar modificadores si existen
        if (item.modificadores && item.modificadores.length > 0) {
          const modsToInsert = item.modificadores.map(m => ({
            order_item_id: newItem.id,
            nombre_modificador: m.nombre_modificador,
            cantidad: m.cantidad,
            precio_unitario: m.precio_unitario || 0
          }));

          const { error: modsError } = await this.supabase
            .from('order_item_modificadores')
            .insert(modsToInsert);
          
          if (modsError) throw modsError;
        }
      }

      // 3. Obtener el total actual directamente de la DB para evitar desincronización
      const { data: orderData, error: fetchError } = await this.supabase
        .from('orders')
        .select('total')
        .eq('id', orderId)
        .single();
      
      if (fetchError) throw fetchError;

      // 4. Actualizar el total de la orden sumando lo nuevo al total anterior
      const newTotal = Number(orderData.total || 0) + addedTotal;
      const { error: updateError } = await this.supabase
        .from('orders')
        .update({ 
          total: newTotal,
          nota_general: this.form.value.nota_general 
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;

      this.toastService.show('Orden actualizada correctamente', 'success');
      this.finalizeSubmit();
    } catch (e) {
      console.error('Error updating order:', e);
      this.toastService.show('Error al actualizar la orden', 'error');
    }
  }

  finalizeSubmit() {
    this.ordersService.clearCart();
    this.ordersService.editingOrderId.set(null); // Limpiar modo edición
    this.propina.set(0);
    this.router.navigate(['/orders/by-service']);
  }

}
