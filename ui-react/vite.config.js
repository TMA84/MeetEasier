import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

/**
 * Vite plugin: appends ?v=<contenthash> to /css/styles.css in index.html
 * so browsers fetch the new version after each SCSS rebuild.
 */
function cacheBustStaticCss() {
  return {
    name: 'cache-bust-static-css',
    transformIndexHtml(html) {
      const cssPath = path.resolve(__dirname, '../static/css/styles.css');
      let hash = Date.now().toString(36);
      try {
        const content = fs.readFileSync(cssPath);
        hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
      } catch (_) { /* file may not exist during dev */ }
      return html.replace(
        /href="\/css\/styles\.css"/,
        `href="/css/styles.css?v=${hash}"`
      );
    },
  };
}

/**
 * Vite plugin: stamps the service-worker.js with a unique build hash
 * so the browser detects a new SW version and activates it (clearing old caches).
 */
function versionServiceWorker() {
  return {
    name: 'version-service-worker',
    writeBundle() {
      const swPath = path.resolve(__dirname, 'build/service-worker.js');
      try {
        let sw = fs.readFileSync(swPath, 'utf-8');
        const buildHash = crypto.randomBytes(8).toString('hex');
        sw = sw.replace('__BUILD_HASH__', buildHash);
        fs.writeFileSync(swPath, sw, 'utf-8');
        console.log(`[versionServiceWorker] Stamped SW with hash: ${buildHash}`);
      } catch (err) {
        console.warn('[versionServiceWorker] Could not stamp SW:', err.message);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cacheBustStaticCss(), versionServiceWorker()],
  resolve: {
    alias: {
      '@scss': path.resolve(__dirname, '../scss'),
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      '/css': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/js': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/img': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
    // Enable minification
    minify: 'esbuild',
    target: 'es2015',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/setupTests.js',
        'src/main.jsx',
        'src/**/*Container.{js,jsx}',
      ],
    },
  },
})
