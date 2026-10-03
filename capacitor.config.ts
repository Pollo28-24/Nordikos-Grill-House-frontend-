/// <reference types="node" />
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nordikos.app',
  appName: 'Nordicos',
  webDir: 'dist/Nordikos_Grill_House/browser',
  // server.url se omite en producción para servir los assets locales del APK (resiliencia 100% offline).
  // Solo se activa condicionalmente si se define para Live Reload en red local durante desarrollo:
  server: process.env['CAPACITOR_LIVE_RELOAD'] ? {
    url: process.env['CAPACITOR_LIVE_RELOAD'],
    cleartext: true
  } : undefined
};

export default config;
