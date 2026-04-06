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

/**
 * Vite plugin: resolves .js imports to .jsx files when the .js file doesn't exist.
 * Also handles typo extensions (.jss, .jsjs) that should resolve to .js files.
 * Needed because Rolldown (Vite 8) is stricter about file extensions than esbuild.
 */
function resolveExtensions() {
  return {
    name: 'resolve-extensions',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null;

      const importerDir = path.dirname(importer);

      // Handle .jss -> .js typo
      if (source.endsWith('.jss')) {
        const corrected = source.slice(0, -4) + '.js';
        const resolved = path.resolve(importerDir, corrected);
        try { fs.accessSync(resolved); return resolved; } catch (_) {}
      }

      // Handle .jsjs -> .js typo
      if (source.endsWith('.jsjs')) {
        const corrected = source.slice(0, -5) + '.js';
        const resolved = path.resolve(importerDir, corrected);
        try { fs.accessSync(resolved); return resolved; } catch (_) {}
      }

      // Handle .js -> .jsx fallback
      if (source.endsWith('.js')) {
        const jsPath = path.resolve(importerDir, source);
        try { fs.accessSync(jsPath); return null; } catch (_) {}
        const jsxPath = jsPath.slice(0, -3) + '.jsx';
        try { fs.accessSync(jsxPath); return jsxPath; } catch (_) {}
      }

      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({ include: /\.(js|jsx|ts|tsx)$/ }), resolveExtensions(), cacheBustStaticCss(), versionServiceWorker()],
  resolve: {
    alias: {
      '@scss': path.resolve(__dirname, '../scss'),
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
    rolldownOptions: {
      moduleTypes: {
        '.js': 'jsx',
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/socket.io-client/')) {
            return 'socket-vendor';
          }
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
    // Enable minification
    minify: 'oxc',
    target: 'es2015',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setup-tests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      include: [
        'src/**/*.{js,jsx}',
      ],
      exclude: [
        'node_modules/',
        'src/setup-tests.js',
        'src/main.jsx',
        'src/index.jsx',
        'src/__mocks__/**',
        'src/**/*Container.{js,jsx}',
        'src/**/test-helpers.{js,jsx}',
      ],
    },
  },
})
