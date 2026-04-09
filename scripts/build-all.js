#!/usr/bin/env node
'use strict';
/**
 * TransportOS — Build All Services
 * Compiles TypeScript for all Node.js services + Vite build for frontend
 * Usage: npm run build:all
 */
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT = path.resolve(__dirname, '..');
const G = '\x1b[32m', R = '\x1b[31m', C = '\x1b[36m', B = '\x1b[1m', X = '\x1b[0m';

const SERVICES = [
  'services/api-gateway',
  'services/erp-service',
  'services/transport-service',
  'services/tracking-service',
  'services/identity-service',
  'services/finance-service',
  'services/order-service',
  'services/notification-service',
  'services/integration-service',
  'frontend',
];

async function main() {
  console.log(`\n${B}${C}TransportOS — Building all services${X}\n`);
  let failed = 0;

  for (const svc of SERVICES) {
    const dir = path.join(ROOT, svc);
    if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
    process.stdout.write(`  ${C}building${X} ${svc.padEnd(35)} `);
    try {
      execSync('npm run build', { cwd: dir, stdio: 'pipe' });
      console.log(`${G}✔${X}`);
    } catch (e) {
      console.log(`${R}✘${X}`);
      console.error('  ', e.stdout?.toString().trim() || e.message);
      failed++;
    }
  }

  console.log('');
  if (failed === 0) console.log(`${G}${B}All services built successfully.${X}\n`);
  else { console.log(`${R}${B}${failed} service(s) failed to build.${X}\n`); process.exit(1); }
}

main().catch(console.error);
