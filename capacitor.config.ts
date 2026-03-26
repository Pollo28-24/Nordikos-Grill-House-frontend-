import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nordikos.app',
  appName: 'Nordikos',
  webDir: 'dist/Nordikos_Grill_House/browser',
  bundledWebRuntime: false,
  server: {
    url: 'https://nordikos-grill-house-frontend.vercel.app', 
    cleartext: false
  }
};

export default config;
