/**
 * build-public.js
 * Prepares the 'public' directory for Vercel and static hosting deployments.
 * Copies frontend assets, shared constants, demo media, and audio assets.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const SHARED_DIR = path.join(ROOT_DIR, 'shared');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const DEMO_DIR = path.join(ROOT_DIR, 'demo-project');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const children = fs.readdirSync(src);
    for (const child of children) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log('[Build] Preparing public deployment directory...');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 1. Copy everything from frontend/ into public/
if (fs.existsSync(FRONTEND_DIR)) {
  console.log('[Build] Copying frontend assets to public/...');
  copyRecursiveSync(FRONTEND_DIR, PUBLIC_DIR);
}

// 2. Ensure shared/ is in public/shared/
const publicShared = path.join(PUBLIC_DIR, 'shared');
if (fs.existsSync(SHARED_DIR)) {
  copyRecursiveSync(SHARED_DIR, publicShared);
}

// 3. Ensure assets/ (sfx, music) are in public/assets/
const publicAssets = path.join(PUBLIC_DIR, 'assets');
if (fs.existsSync(ASSETS_DIR)) {
  copyRecursiveSync(ASSETS_DIR, publicAssets);
}

// 4. Ensure demo-project/ is in public/demo-project/
const publicDemo = path.join(PUBLIC_DIR, 'demo-project');
if (fs.existsSync(DEMO_DIR)) {
  copyRecursiveSync(DEMO_DIR, publicDemo);
}

console.log('[Build] Public output directory successfully built with all assets!');
