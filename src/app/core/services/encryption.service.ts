import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  private readonly key = CryptoJS.enc.Utf8.parse(environment.encryptionKey);
  private readonly iv = CryptoJS.enc.Utf8.parse(environment.encryptionIV);

  encrypt(text: string): string {
    if (!text) return '';
    const encrypted = CryptoJS.AES.encrypt(text, this.key, {
      iv: this.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString();
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.key, {
        iv: this.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting data:', error);
      return 'Error al descifrar';
    }
  }
}
