import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.educhain.app',
  appName: 'EduChain',
  webDir: 'out',
  server: {
    url: 'https://contacto-estudiantil.web.app',
    cleartext: false
  }
};

export default config;
