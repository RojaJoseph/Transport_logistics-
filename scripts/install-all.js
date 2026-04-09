#!/usr/bin/env node
'use strict';
/**
 * TransportOS — Install All Dependencies
 * Usage: npm run install:all
 */
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT = path.resolve(__dirname, '..');
const C = '\x1b[36m', G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[1m', X = '\x1b[0m';

const NODE_DIRS = [
  'frontend',
  'services/api-gateway',
  'services/erp-service',
  'services/transport-service',
  'services/tracking-service',
  'services/identity-service',
  'services/finance-service',
  'services/order-service',
  'services/notification-service',
  'services/integration-service',
];

const PYTHON_DIRS = [
  'services/ai-service',
  'services/analytics-service',
];

function run(cmd, cwd) {
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
    return true;
  } catch {
    console.error(`${R}Failed: ${cmd}${X}`);
    return false;
  }
}

async function main() {
  console.log(`\n${B}${C}TransportOS — Installing all dependencies${X}\n`);

  // Root (concurrently)
  console.log(`${C}[root]${X} npm install...`);
  run('npm install', ROOT);

  // Node services
  for (const dir of NODE_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(path.join(full, 'package.json'))) { console.log(`${R}[skip]${X} ${dir} — no package.json`); continue; }
    console.log(`${C}[node]${X} ${dir}...`);
    run('npm install', full);
  }

  // Python services
  const pip = process.platform === 'win32' ? 'pip' : 'pip3';
  for (const dir of PYTHON_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(path.join(full, 'requirements.txt'))) { console.log(`${R}[skip]${X} ${dir} — no requirements.txt`); continue; }
    console.log(`${C}[python]${X} ${dir}...`);
    run(`${pip} install -r requirements.txt`, full);
  }

  console.log(`\n${G}${B}All dependencies installed!${X}`);
  console.log(`Next: ${C}npm run db:init${X} → ${C}npm run db:seed${X} → ${C}npm run dev${X}\n`);
}

main().catch(console.error);
