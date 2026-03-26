import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic', // React always in scope — fixes "React is not defined" in prod
    }),
  ],
  define: {
    // Stub process.env so any legacy references don't crash at runtime
    // API_KEY is intentionally empty — voice uses ephemeral tokens from Supabase edge fn
    'process.env': {
      API_KEY: '',
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          jspdf: ['jspdf'],
        },
      },
    },
  },
});
