import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@shared/data-access/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseStorageService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // Sube archivo y guarda registro en producto_fotos
  async uploadProductImage(file: File, productoId: string) {
    // Validaciones básicas
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error('Formato no permitido. Usa png/jpg/webp.');
    }

    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `productos/${fileName}`;
    const bucket = 'imagenes'; // cambia si tu bucket tiene otro nombre

    // Subir archivo
    const { data: uploadData, error: uploadError } = await this.supabase
      .storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    // Obtener URL pública (si el bucket es público)
    const { data: urlData } = this.supabase
      .storage
      .from(bucket)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Guardar en tabla producto_fotos
    const { error: dbError } = await this.supabase
      .from('producto_fotos')
      .insert({
        producto_id: productoId,
        url: publicUrl
      });

    if (dbError) {
      // Si falla la inserción en BD, borrar el archivo subido para no dejar basura
      await this.supabase.storage.from(bucket).remove([filePath]);
      throw dbError;
    }

    return { path: filePath, url: publicUrl };
  }

  // Eliminar imagen por path
  async deleteProductImage(path: string) {
    const bucket = 'imagenes';
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
  }

  extractImagePathFromUrl(imageUrl: string): string {
    const parts = imageUrl.split('/public/imagenes/');
    if (parts.length > 1) {
      return parts[1]; // Ejemplo: 'productos/archivo.webp'
    }
    return ''; // O manejar el error de alguna otra manera
  }

  // Para buckets privados: crea signed URL (si lo necesitas)
  async createSignedUrl(path: string, expiresInSeconds = 60) {
    const bucket = 'imagenes';
    const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }
}
