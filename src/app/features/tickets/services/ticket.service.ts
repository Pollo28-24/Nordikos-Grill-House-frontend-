import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '@shared/data-access/supabase.service';
import { LoggerService } from '@core/services/logger.service';
import { TicketData } from '../models/ticket.model';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';

declare let bluetoothSerial: any;

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private supabase = inject(SupabaseService).client;
  private logger = inject(LoggerService);
  private platformId = inject(PLATFORM_ID);

  // Bluetooth Signals para la UI
  bluetoothDevices = signal<any[]>([]);
  isBluetoothConnected = signal<boolean>(false);
  connectionState = signal<'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error'>('disconnected');
  errorMessage = signal<string>('');
  selectedDeviceAddress = signal<string>('');
  selectedDeviceName = signal<string>('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.selectedDeviceAddress.set(localStorage.getItem('selected_printer_mac') || '');
      this.selectedDeviceName.set(localStorage.getItem('selected_printer_name') || '');
      
      // Chequear estado inicial de conexión si estamos en móvil y hay un MAC guardado
      if (Capacitor.isNativePlatform() && this.selectedDeviceAddress()) {
        this.checkBluetoothConnection().then(connected => {
          this.isBluetoothConnected.set(connected);
          if (connected) {
            this.connectionState.set('connected');
          }
        });
      }
    }
  }

  // --- Promesas Wrappers de cordova-plugin-bluetooth-serial ---
  
  checkBluetoothEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve(false);
        return;
      }
      bluetoothSerial.isEnabled(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  enableBluetooth(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve(false);
        return;
      }
      bluetoothSerial.enable(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  listBluetoothDevices(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve([]);
        return;
      }
      bluetoothSerial.list(
        (devices: any[]) => resolve(devices),
        (err: any) => reject(err)
      );
    });
  }

  connectBluetooth(address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        reject('Bluetooth no soportado en esta plataforma.');
        return;
      }
      bluetoothSerial.connect(
        address,
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  disconnectBluetooth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve();
        return;
      }
      bluetoothSerial.disconnect(
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  writeBluetooth(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        reject('Bluetooth no soportado en esta plataforma.');
        return;
      }
      bluetoothSerial.write(
        data,
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  checkBluetoothConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve(false);
        return;
      }
      bluetoothSerial.isConnected(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  // --- Operaciones Bluetooth de Alto Nivel ---

  async scanDevices() {
    this.connectionState.set('scanning');
    this.errorMessage.set('');
    try {
      const isEnabled = await this.checkBluetoothEnabled();
      if (!isEnabled) {
        const turnOn = await this.enableBluetooth();
        if (!turnOn) {
          this.connectionState.set('error');
          this.errorMessage.set('Deberás activar el Bluetooth en tu celular para poder imprimir.');
          return;
        }
      }

      const devices = await this.listBluetoothDevices();
      this.bluetoothDevices.set(devices);
      if (devices.length === 0) {
        this.errorMessage.set('No se encontraron dispositivos vinculados. Asegurate de emparejar la impresora en los Ajustes de Bluetooth de tu celular primero.');
      }
      this.connectionState.set('disconnected');
    } catch (err) {
      this.logger.error('Error listing devices', err, 'TicketService');
      this.connectionState.set('error');
      this.errorMessage.set('Ocurrió un error al escanear los dispositivos Bluetooth.');
    }
  }

  async selectAndConnectPrinter(address: string, name: string) {
    this.connectionState.set('connecting');
    this.errorMessage.set('');
    try {
      const isConnected = await this.checkBluetoothConnection();
      if (isConnected) {
        await this.disconnectBluetooth();
      }

      await this.connectBluetooth(address);
      localStorage.setItem('selected_printer_mac', address);
      localStorage.setItem('selected_printer_name', name);
      this.selectedDeviceAddress.set(address);
      this.selectedDeviceName.set(name);
      this.isBluetoothConnected.set(true);
      this.connectionState.set('connected');
    } catch (err: any) {
      this.logger.error('Error connecting to printer', err, 'TicketService');
      this.isBluetoothConnected.set(false);
      this.connectionState.set('error');
      this.errorMessage.set(`No se pudo conectar con ${name}. Asegurate de que la impresora esté encendida y cerca.`);
    }
  }

  async disconnectPrinter() {
    try {
      await this.disconnectBluetooth();
    } catch (e) {
      this.logger.error('Error disconnecting printer', e, 'TicketService');
    }
    this.isBluetoothConnected.set(false);
    this.connectionState.set('disconnected');
  }

  async getTicketData(orderId: number): Promise<TicketData | null> {
    try {
      const [orderResult, itemsResult] = await Promise.all([
        this.supabase
          .from('orders')
          .select(`
            id,
            numero_orden,
            fecha_creacion,
            estado_pedido,
            estado_pago,
            total,
            propina,
            nota_general,
            clientes (nombre, telefono),
            tipos_servicio (nombre)
          `)
          .eq('id', orderId)
          .single(),
        
        this.supabase
          .from('order_items')
          .select(`
            id,
            order_id,
            nombre_producto,
            cantidad,
            precio_unitario,
            total,
            nota,
            estado,
            order_item_modificadores (
              nombre_modificador,
              cantidad,
              precio_unitario
            )
          `)
          .eq('order_id', orderId)
      ]);

      if (orderResult.error) throw orderResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const orderDataRaw = orderResult.data as any;
      const itemsDataRaw = itemsResult.data as any[];

      return {
        order: {
          id: orderDataRaw.id,
          numero_orden: orderDataRaw.numero_orden,
          fecha_creacion: orderDataRaw.fecha_creacion,
          estado_pedido: orderDataRaw.estado_pedido,
          estado_pago: orderDataRaw.estado_pago,
          total: Number(orderDataRaw.total || 0),
          propina: Number(orderDataRaw.propina || 0),
          nota_general: orderDataRaw.nota_general,
          cliente: orderDataRaw.clientes,
          tipo_servicio: orderDataRaw.tipos_servicio?.nombre
        },
        items: itemsDataRaw
          .filter(item => item.estado !== 'cancelado')
          .map(item => ({
            ...item,
            modificadores: item.order_item_modificadores || []
          }))
      };
    } catch (error) {
      this.logger.error('Error fetching ticket data', error, 'TicketService');
      return null;
    }
  }

  async printTicket(data?: TicketData, type: 'account' | 'kitchen' = 'account') {
    if (!isPlatformBrowser(this.platformId)) return;

    const isNative = Capacitor.isNativePlatform();

    if (isNative && data) {
      try {
        const isConnected = await this.checkBluetoothConnection();
        if (isConnected) {
          await this.printTicketBluetooth(data, type);
          return;
        }

        // Intentar auto-conectar con la guardada
        const savedMac = this.selectedDeviceAddress();
        if (savedMac) {
          this.connectionState.set('connecting');
          try {
            await this.connectBluetooth(savedMac);
            this.isBluetoothConnected.set(true);
            this.connectionState.set('connected');
            await this.printTicketBluetooth(data, type);
            return;
          } catch (err) {
            this.logger.warn('Failed to auto-connect to saved printer, falling back to scanning', err, 'TicketService');
            this.isBluetoothConnected.set(false);
            this.connectionState.set('error');
            this.errorMessage.set('No se pudo auto-conectar a la impresora. Elegí un dispositivo de la lista abajo.');
          }
        }

        // Si no está conectada y no se pudo auto-conectar, escaneamos automáticamente
        await this.scanDevices();
      } catch (e) {
        this.logger.error('Error printTicket native', e, 'TicketService');
        this.connectionState.set('error');
        this.errorMessage.set('Error en el sistema de impresión Bluetooth.');
      }
      return;
    }

    // Impresión Web Normal
    try {
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (e) {
      this.logger.error('Error triggering window.print()', e, 'TicketService');
    }
  }

  async printTicketBluetooth(data: TicketData, type: 'account' | 'kitchen') {
    try {
      const text = this.generateEscPosTicket(data, type);
      await this.writeBluetooth(text);
    } catch (err) {
      this.logger.error('Error writing to bluetooth printer', err, 'TicketService');
      this.isBluetoothConnected.set(false);
      this.connectionState.set('error');
      this.errorMessage.set('Se perdió la comunicación con la impresora térmica.');
      throw err;
    }
  }

  // --- Generador de Comandos ESC/POS para impresoras de 58mm (32 caracteres) ---
  generateEscPosTicket(data: TicketData, type: 'account' | 'kitchen'): string {
    const esc = '\x1b';
    const gs = '\x1d';
    
    // Comandos de formato ESC/POS estándar
    const init = `${esc}@`;
    const center = `${esc}a\x01`;
    const left = `${esc}a\x00`;
    const right = `${esc}a\x02`;
    const boldOn = `${esc}E\x01`;
    const boldOff = `${esc}E\x00`;
    const doubleSizeOn = `${gs}!\x11`;
    const doubleSizeOff = `${gs}!\x00`;
    const doubleWidthOn = `${gs}!\x10`;
    const doubleWidthOff = `${gs}!\x00`;

    let text = init;

    const fecha = new Date(data.order.fecha_creacion);
    const fechaStr = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear().toString().substring(2)} ${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;

    if (type === 'account') {
      // Cabecera Cuenta
      text += `${center}${boldOn}${doubleSizeOn}NORDIKOS${doubleSizeOff}${boldOff}\n`;
      text += `${center}${boldOn}Grill House${boldOff}\n`;
      text += `${left}--------------------------------\n`;
      
      const orderNum = data.order.numero_orden || data.order.id;
      text += `${boldOn}ORDEN #${orderNum}${boldOff}\n`;
      if (data.order.tipo_servicio) {
        text += `Servicio: ${data.order.tipo_servicio.toUpperCase()}\n`;
      }
      text += `Fecha: ${fechaStr}\n`;
      text += `--------------------------------\n`;

      if (data.order.cliente) {
        text += `Cliente: ${data.order.cliente.nombre}\n`;
        if (data.order.cliente.telefono) {
          text += `Tel: ${data.order.cliente.telefono}\n`;
        }
        text += `--------------------------------\n`;
      }

      // Detalle de Pedido
      text += `${boldOn}DETALLE DEL PEDIDO:${boldOff}\n`;
      data.items.forEach(item => {
        const precioTotal = item.precio_unitario * item.cantidad;
        const totalStr = `$${precioTotal.toFixed(2)}`;
        const namePart = `${item.cantidad}x ${item.nombre_producto}`;
        
        text += this.formatLine32(namePart, totalStr) + '\n';

        if (item.modificadores?.length) {
          item.modificadores.forEach(m => {
            const modTotal = m.precio_unitario * m.cantidad;
            const mName = `  + ${m.nombre_modificador}`;
            if (modTotal > 0) {
              const mTotalStr = `$${modTotal.toFixed(2)}`;
              text += this.formatLine32(mName, mTotalStr) + '\n';
            } else {
              text += `${mName}\n`;
            }
          });
        }
      });

      text += `--------------------------------\n`;
      
      // Totales
      const subtotal = data.order.total - (data.order.propina || 0);
      text += this.formatLine32('SUBTOTAL:', `$${subtotal.toFixed(2)}`) + '\n';
      text += `${boldOn}` + this.formatLine32('TOTAL:', `$${data.order.total.toFixed(2)}`) + `${boldOff}\n`;
      text += `--------------------------------\n`;
      
      text += `${center}${boldOn}¡GRACIAS POR SU VISITA!${boldOff}\n`;
    } else {
      // Cabecera Cocina (sin precios, letras más grandes)
      text += `${center}${boldOn}${doubleSizeOn}COCINA${doubleSizeOff}${boldOff}\n`;
      text += `${left}--------------------------------\n`;
      
      const orderNum = data.order.numero_orden || data.order.id;
      text += `${boldOn}${doubleSizeOn}ORDEN #${orderNum}${doubleSizeOff}${boldOff}\n`;
      if (data.order.tipo_servicio) {
        text += `${boldOn}SERVICIO: ${data.order.tipo_servicio.toUpperCase()}${boldOff}\n`;
      }
      text += `Fecha: ${fechaStr}\n`;
      text += `--------------------------------\n`;

      if (data.order.cliente) {
        text += `Cliente: ${data.order.cliente.nombre}\n`;
        text += `--------------------------------\n`;
      }

      // Items para Cocina
      data.items.forEach(item => {
        text += `${boldOn}${doubleWidthOn}${item.cantidad}x ${item.nombre_producto}${doubleWidthOff}${boldOff}\n`;

        if (item.modificadores?.length) {
          item.modificadores.forEach(m => {
            text += `  + ${m.nombre_modificador}\n`;
          });
        }

        if (item.nota) {
          text += `${boldOn}  * NOTA: ${item.nota}${boldOff}\n`;
        }
        text += `\n`; // Espaciado entre productos
      });

      text += `--------------------------------\n`;

      // Nota General en Cocina
      if (data.order.nota_general) {
        text += `${boldOn}--- NOTA GENERAL ---\n`;
        text += `${data.order.nota_general}${boldOff}\n`;
        text += `--------------------------------\n`;
      }

      text += `${center}${boldOn}--- FIN TICKET COCINA ---${boldOff}\n`;
    }

    // Alimentación de papel final
    text += `\n\n\n\n\n`;
    return text;
  }

  private formatLine32(left: string, right: string): string {
    const totalWidth = 32;
    const rightLen = right.length;
    const maxLeftLen = totalWidth - rightLen - 1;
    let leftPart = left;
    if (leftPart.length > maxLeftLen) {
      leftPart = leftPart.substring(0, maxLeftLen);
    }
    const spaces = totalWidth - leftPart.length - rightLen;
    return leftPart + ' '.repeat(spaces > 0 ? spaces : 1) + right;
  }

  // --- Plain text formatting for Whatsapp Sharing (41 cols) ---
  generateTicketText(data: TicketData): string {
    let text = `🍽️ NORDIKOS GRILL HOUSE 🍽️\n`;
    text += `-----------------------------------------\n`;
    text += `Orden: #${data.order.numero_orden || data.order.id}\n`;
    if (data.order.tipo_servicio) {
      text += `Servicio: ${data.order.tipo_servicio}\n`;
    }
    const fecha = new Date(data.order.fecha_creacion);
    text += `Fecha: ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `-----------------------------------------\n`;
    
    if (data.order.cliente) {
      text += `Cliente: ${data.order.cliente.nombre}\n`;
      if (data.order.cliente.telefono) {
        text += `Tel: ${data.order.cliente.telefono}\n`;
      }
      text += `-----------------------------------------\n`;
    }
    
    text += `DETALLE DEL PEDIDO:\n`;
    data.items.forEach(item => {
      const precioTotal = item.precio_unitario * item.cantidad;
      let line = `${item.cantidad}x ${item.nombre_producto}`;
      const spaces = 41 - line.length - (`$${precioTotal.toFixed(2)}`).length;
      const pad = spaces > 0 ? ' '.repeat(spaces) : ' ';
      text += `${line}${pad}$${precioTotal.toFixed(2)}\n`;
      
      if (item.modificadores?.length) {
        item.modificadores.forEach(m => {
          const modTotal = m.precio_unitario * m.cantidad;
          let mLine = `   + ${m.nombre_modificador}`;
          if (modTotal > 0) {
            const mSpaces = 41 - mLine.length - (`$${modTotal.toFixed(2)}`).length;
            const mPad = mSpaces > 0 ? ' '.repeat(mSpaces) : ' ';
            text += `${mLine}${mPad}$${modTotal.toFixed(2)}\n`;
          } else {
            text += `${mLine}\n`;
          }
        });
      }
      
      if (item.nota) {
        text += `   (Nota: ${item.nota})\n`;
      }
    });
    
    text += `-----------------------------------------\n`;

    if (data.order.nota_general) {
      text += `Nota General: ${data.order.nota_general}\n`;
      text += `-----------------------------------------\n`;
    }
    
    const subtotal = data.order.total - (data.order.propina || 0);
    const subtotalStr = `$${subtotal.toFixed(2)}`;
    let subtotalLine = `Subtotal:`;
    const subSpaces = 41 - subtotalLine.length - subtotalStr.length;
    text += `${subtotalLine}${' '.repeat(subSpaces > 0 ? subSpaces : 1)}${subtotalStr}\n`;
    
    if (data.order.propina) {
      const propinaStr = `$${data.order.propina.toFixed(2)}`;
      let propinaLine = `Propina:`;
      const propSpaces = 41 - propinaLine.length - propinaStr.length;
      text += `${propinaLine}${' '.repeat(propSpaces > 0 ? propSpaces : 1)}${propinaStr}\n`;
    }
    
    text += `-----------------------------------------\n`;
    const totalStr = `$${data.order.total.toFixed(2)}`;
    let totalLine = `TOTAL:`;
    const totSpaces = 41 - totalLine.length - totalStr.length;
    text += `${totalLine}${' '.repeat(totSpaces > 0 ? totSpaces : 1)}${totalStr}\n`;
    text += `-----------------------------------------\n`;
    text += `¡Gracias por tu visita!\n`;
    text += `Sabor que te transporta al norte.`;
    
    return text;
  }

  async shareOrCopyTicket(data: TicketData): Promise<'shared' | 'copied' | 'failed'> {
    const isNative = Capacitor.isNativePlatform();
    const text = this.generateTicketText(data);
    const title = `Ticket Orden #${data.order.numero_orden || data.order.id}`;

    if (isNative) {
      try {
        await Share.share({
          title: title,
          text: text,
          dialogTitle: 'Enviar o Guardar Ticket',
        });
        return 'shared';
      } catch (e) {
        this.logger.error('Error sharing ticket on native', e, 'TicketService');
        return 'failed';
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
        return 'shared';
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return 'shared';
        }
        this.logger.warn('Error sharing ticket via navigator.share, falling back to clipboard', e, 'TicketService');
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return 'copied';
      } catch (e) {
        this.logger.error('Error copying ticket to clipboard', e, 'TicketService');
        return 'failed';
      }
    }

    return 'failed';
  }

  async shareTicketPDF(data: TicketData): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Estimar la altura dinámica del ticket de 58mm
    let estimate = 8 + 5 + 5 + 4 + 4.5 + 4.5; // base header (NORDIKOS, Grill House, line, ORDEN #)
    if (data.order.tipo_servicio) estimate += 4;
    
    if (data.order.cliente) {
      estimate += 4 + 4; // separator + cliente nombre
      if (data.order.cliente.telefono) {
        estimate += 4;
      }
    }
    
    estimate += 4 + 4.5 + 5; // line, title, spacing
    
    data.items.forEach(item => {
      const qtyName = `${item.cantidad}x ${item.nombre_producto}`;
      const lines = Math.ceil(qtyName.length / 22);
      estimate += lines * 3.5;
      
      if (item.modificadores?.length) {
        item.modificadores.forEach(m => {
          const mText = `  + ${m.nombre_modificador}`;
          const mLines = Math.ceil(mText.length / 22);
          estimate += mLines * 3.5;
        });
      }
      
      if (item.nota) {
        const nText = `  (Nota: ${item.nota})`;
        const nLines = Math.ceil(nText.length / 22);
        estimate += nLines * 3.5;
      }
      
      estimate += 1.5; // spacing
    });
    
    estimate += 2 + 4.5 + 4.5 + (data.order.propina ? 4.5 : 0) + 4.5 + 4.5 + 4.5 + 4.5 + 12; // totals, footer, bottom margin
    
    // 2. Instanciar jsPDF con ancho 58mm y la altura estimada
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, estimate]
    });
    
    let y = 8;
    
    // 3. Dibujar el layout del ticket
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('NORDIKOS', 29, y, { align: 'center' });
    y += 5;
    
    doc.setFontSize(10);
    doc.text('Grill House', 29, y, { align: 'center' });
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('-'.repeat(42), 29, y, { align: 'center' });
    y += 4;
    
    doc.setFont('helvetica', 'bold');
    const orderNum = data.order.numero_orden || data.order.id;
    doc.text(`ORDEN #${orderNum}`, 4, y);
    y += 4.5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    if (data.order.tipo_servicio) {
      doc.text(`Servicio: ${data.order.tipo_servicio.toUpperCase()}`, 4, y);
      y += 4;
    }
    
    const fecha = new Date(data.order.fecha_creacion);
    const fechaStr = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear().toString().substring(2)} ${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
    doc.text(`Fecha: ${fechaStr}`, 4, y);
    y += 4.5;
    
    if (data.order.cliente) {
      doc.text('-'.repeat(42), 29, y, { align: 'center' });
      y += 4;
      doc.text(`Cliente: ${data.order.cliente.nombre}`, 4, y);
      y += 4;
      if (data.order.cliente.telefono) {
        doc.text(`Tel: ${data.order.cliente.telefono}`, 4, y);
        y += 4;
      }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('-'.repeat(42), 29, y, { align: 'center' });
    y += 4.5;
    
    doc.text('DETALLE DEL PEDIDO', 4, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    
    data.items.forEach(item => {
      const qtyName = `${item.cantidad}x ${item.nombre_producto}`;
      const total = item.precio_unitario * item.cantidad;
      const totalStr = `$${total.toFixed(2)}`;
      
      const splitName = doc.splitTextToSize(qtyName, 36);
      doc.text(splitName, 4, y);
      doc.text(totalStr, 54, y, { align: 'right' });
      
      y += splitName.length * 3.5;
      
      if (item.modificadores?.length) {
        item.modificadores.forEach(m => {
          const modTotal = m.precio_unitario * m.cantidad;
          const modText = `  + ${m.nombre_modificador}`;
          
          const splitMod = doc.splitTextToSize(modText, 36);
          doc.text(splitMod, 4, y);
          
          if (modTotal > 0) {
            const modTotalStr = `$${modTotal.toFixed(2)}`;
            doc.text(modTotalStr, 54, y, { align: 'right' });
          }
          
          y += splitMod.length * 3.5;
        });
      }
      
      if (item.nota) {
        doc.setFont('helvetica', 'italic');
        const noteText = `  (Nota: ${item.nota})`;
        const splitNote = doc.splitTextToSize(noteText, 36);
        doc.text(splitNote, 4, y);
        y += splitNote.length * 3.5;
        doc.setFont('helvetica', 'normal');
      }
      
      y += 1.5;
    });
    
    y += 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('-'.repeat(42), 29, y, { align: 'center' });
    y += 4.5;
    
    const subtotal = data.order.total - (data.order.propina || 0);
    doc.text('SUBTOTAL:', 4, y);
    doc.text(`$${subtotal.toFixed(2)}`, 54, y, { align: 'right' });
    y += 4.5;
    
    if (data.order.propina) {
      doc.text('PROPINA:', 4, y);
      doc.text(`$${data.order.propina.toFixed(2)}`, 54, y, { align: 'right' });
      y += 4.5;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 4, y);
    doc.text(`$${data.order.total.toFixed(2)}`, 54, y, { align: 'right' });
    y += 4.5;
    
    doc.setFont('helvetica', 'normal');
    doc.text('-'.repeat(42), 29, y, { align: 'center' });
    y += 4.5;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('¡GRACIAS POR SU VISITA!', 29, y, { align: 'center' });
    y += 4.5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Sabor que te transporta al norte.', 29, y, { align: 'center' });
    
    // 4. Compartir o Descargar
    const fileName = `Ticket_Orden_${orderNum}.pdf`;
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: `Ticket Orden #${orderNum}`,
          url: writeResult.uri,
          dialogTitle: 'Enviar o Guardar Ticket PDF'
        });
      } catch (err: any) {
        this.logger.error('Error generating/sharing native PDF', err, 'TicketService');
        throw err;
      }
    } else {
      try {
        doc.save(fileName);
      } catch (err) {
        this.logger.error('Error saving web PDF', err, 'TicketService');
        throw err;
      }
    }
  }
}

