import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = `http://localhost:${env.VITE_SERVER_PORT || 3000}`;
  
  console.log('Proxy target:', target); // 打印出来方便调试

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['lijieminimac-mini.tail162ae6.ts.net'],
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
          secure: false,
        },
        '/terminal': {
          target: target,
          ws: true,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
