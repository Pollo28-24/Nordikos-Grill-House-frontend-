import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  private platformId = inject(PLATFORM_ID);
  private key: any;
  private iv: any;

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    const env = isBrowser ? (window as any).__ENV__ : process.env;

    const encryptionKey = env?.encryptionKey || env?.ENCRYPTION_KEY || environment.encryptionKey;
    const encryptionIV = env?.encryptionIV || env?.ENCRYPTION_IV || environment.encryptionIV;

    this.key = CryptoJS.enc.Utf8.parse(encryptionKey);
    this.iv = CryptoJS.enc.Utf8.parse(encryptionIV);
  }

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
