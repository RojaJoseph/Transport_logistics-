#!/usr/bin/env node
'use strict';
/**
 * TransportOS — Prerequisite Checker
 * Usage: npm run check:deps
 */
const { spawnSync } = require('child_process');
const net = require('net');

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[1m', X = '\x1b[0m';

function run(cmd) {
  const [c, ...a] = cmd.split(' ');
  const r = spawnSync(c, a, { shell: true, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim() };
}

function check(label, cmd, hint) {
  const { ok, out } = run(cmd);
  const ver = out.match(/[\d]+\.[\d]+\.?[\d]*/)?.[0] ?? out.split('\n')[0].slice(0, 30);
  if (ok) console.log(`  ${G}✔${X}  ${label.padEnd(22)} ${C}${ver}${X}`);
  else     console.log(`  ${R}✘${X}  ${label.padEnd(22)} ${R}NOT FOUND${X}  →  ${Y}${hint}${X}`);
  return ok;
}

function checkPort(label, port) {
  return new Promise(resolve => {
    const s = net.createConnection(port, '127.0.0.1');
    s.setTimeout(800);
    s.on('connect', () => { s.destroy(); console.log(`  ${G}✔${X}  ${label.padEnd(22)} ${C}:${port} RUNNING${X}`); resolve(true); });
    s.on('error',   () => {              console.log(`  ${R}✘${X}  ${label.padEnd(22)} ${R}:${port} NOT RUNNING${X}`); resolve(false); });
    s.on('timeout', () => { s.destroy(); console.log(`  ${R}✘${X}  ${label.padEnd(22)} ${R}:${port} TIMEOUT${X}`);    resolve(false); });
  });
}

async function main() {
  console.log(`\n${B}${C}╔══════════════════════════════════════════╗${X}`);
  console.log(`${B}${C}║    TransportOS — Prerequisite Checker    ║${X}`);
  console.log(`${B}${C}╚══════════════════════════════════════════╝${X}\n`);

  console.log(`${B}Runtimes:${X}`);
  const node   = check('Node.js 20+',  'node --version',      'https://nodejs.org');
  const npm    = check('npm',           'npm --version',       'comes with Node.js');
  const python = check('Python 3.11+', 'python --version',    'https://python.org') ||
                 check('Python 3.11+', 'python3 --version',   'https://python.org');

  console.log(`\n${B}Databases & Brokers:${X}`);
  const pg    = check('PostgreSQL',  'psql --version',             'https://postgresql.org/download');
  const mongo = check('MongoDB',     'mongod --version',            'https://mongodb.com/try/download/community');
  const redis = check('Redis',       'redis-server --version',      'https://redis.io/download');
  const mqtt  = check('Mosquitto',   'mosquitto -h',                'https://mosquitto.org/download');

  console.log(`\n${B}Running services (must be started before npm run dev):${X}`);
  await checkPort('PostgreSQL',    5432);
  await checkPort('MongoDB',       27017);
  await checkPort('Redis',         6379);
  await checkPort('Mosquitto MQTT',1883);

  console.log('');
  if (node && python && pg) {
    console.log(`${G}${B}✔ Core prerequisites OK.${X}`);
    console.log(`\nNext: ${C}npm run install:all${X} → ${C}npm run db:init${X} → ${C}npm run dev${X}\n`);
  } else {
    console.log(`${R}${B}✘ Some prerequisites missing — install them first.${X}\n`);
    process.exit(1);
  }
}

main().catch(console.error);
