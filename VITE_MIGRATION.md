# Vite Migration Testing Guide

## What Changed

- ✅ Replaced `react-scripts` with `vite` and `@vitejs/plugin-react`
- ✅ Replaced `jest` with `vitest` for testing
- ✅ Created `vite.config.js` with proxy configuration
- ✅ Moved `index.html` to root (Vite requirement)
- ✅ Renamed `src/index.js` to `src/main.jsx`
- ✅ Updated `setupTests.js` for Vitest
- ✅ Updated all npm scripts
- ✅ Removed all react-scripts overrides (no longer needed)

## Testing Steps

### 1. Install Dependencies

```bash
cd ui-react
rm -rf node_modules package-lock.json
npm install
```

### 2. Test Development Server

```bash
npm start
# or
npm run dev
```

**Expected:**
- Server starts on http://localhost:3000
- Hot module replacement works
- All routes work: /, /single-room/:name, /room-minimal/:name, /wifi-info, /admin
- API calls proxy to localhost:8080
- Socket.IO connections work

### 3. Test Production Build

```bash
npm run build
```

**Expected:**
- Build completes successfully
- Output in `build/` directory
- No errors or warnings (except maybe some minor ones)
- Much faster than react-scripts build!

### 4. Test Preview

```bash
npm run preview
```

**Expected:**
- Preview server starts
- Production build works correctly

### 5. Test Unit Tests

```bash
npm test
# or for coverage
npm run test:coverage
```

**Expected:**
- All tests pass
- Vitest runs much faster than Jest

### 6. Test E2E Tests

```bash
# Make sure backend is running on port 8080
npm run test:e2e
```

**Expected:**
- Cypress tests pass

### 7. Test Full Stack

```bash
# Terminal 1 - Backend
cd ..
npm start

# Terminal 2 - Frontend
cd ui-react
npm start
```

**Expected:**
- Frontend on http://localhost:3000
- Backend on http://localhost:8080
- API calls work
- Socket.IO works
- All features functional

## Benefits

✅ **10-100x faster builds** - Vite uses esbuild
✅ **Instant HMR** - Hot module replacement is near-instant
✅ **Smaller bundles** - Better tree-shaking
✅ **No deprecated warnings** - Modern tooling
✅ **Better DX** - Faster feedback loop
✅ **Native ES modules** - No bundling in dev mode

## Rollback Plan

If something doesn't work:

```bash
git checkout ui-react/package.json
git checkout ui-react/src/
rm ui-react/vite.config.js
rm ui-react/index.html
rm ui-react/src/main.jsx
cd ui-react
npm install
```

## Notes

- Dev server port changed from 3000 to 3000 (same, but configurable in vite.config.js)
- Build output still goes to `build/` directory (configured in vite.config.js)
- All existing tests should work with minimal changes
- Vitest is Jest-compatible, so most test syntax is the same
