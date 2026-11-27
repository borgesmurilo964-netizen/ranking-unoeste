import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

// No `npm run dev`/`preview`, "/admin" (sem barra) abre o painel admin,
// igual ao rewrite configurado no vercel.json.
const adminSemBarra = {
  name: 'admin-sem-barra',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url.startsWith('/admin?')) req.url = req.url.replace('/admin', '/admin/');
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url.startsWith('/admin?')) req.url = req.url.replace('/admin', '/admin/index.html');
      next();
    });
  },
};

export default defineConfig({
  appType: 'mpa',
  plugins: [adminSemBarra],
  build: {
    rollupOptions: {
      input: {
        main: r('./index.html'),
        admin: r('./admin/index.html'),
      },
    },
  },
});
