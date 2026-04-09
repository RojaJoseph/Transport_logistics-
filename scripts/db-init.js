#!/usr/bin/env node
'use strict';
/**
 * TransportOS — Database Init
 * Creates PostgreSQL role + database, then runs init.sql
 * Usage: npm run db:init
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const G = '\x1b[32m', R = '\x1b[31m', C = '\x1b[36m', B = '\x1b[1m', X = '\x1b[0m';

const PG_USER = process.env.POSTGRES_USER     || 'logistics';
const PG_PASS = process.env.POSTGRES_PASSWORD || 'secret';
const PG_HOST = process.env.POSTGRES_HOST     || '127.0.0.1';
const PG_PORT = process.env.POSTGRES_PORT     || '5432';
const PG_DB   = process.env.POSTGRES_DB       || 'logistics';
const SQL     = path.join(__dirname, '../infra/postgres/init.sql');

function psql(sql, db = 'postgres') {
  const env = { ...process.env, PGPASSWORD: PG_PASS };
  // Try connecting as postgres superuser first, then as the logistics user
  for (const user of ['postgres', PG_USER]) {
    const r = spawnSync('psql', ['-h', PG_HOST, '-p', PG_PORT, '-U', user, '-d', db, '-c', sql], { env, encoding: 'utf8' });
    if (!r.error) return r;
  }
}

function psqlFile(file, db) {
  const env = { ...process.env, PGPASSWORD: PG_PASS };
  return spawnSync('psql', ['-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER, '-d', db, '-f', file], { env, encoding: 'utf8', stdio: 'inherit' });
}

async function main() {
  console.log(`\n${B}${C}TransportOS — Database Init${X}\n`);

  console.log(`${C}[1/4]${X} Creating role '${PG_USER}'...`);
  psql(`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${PG_USER}') THEN CREATE ROLE ${PG_USER} WITH LOGIN PASSWORD '${PG_PASS}'; END IF; END $$;`);
  console.log(`  ${G}✔${X}`);

  console.log(`${C}[2/4]${X} Creating database '${PG_DB}'...`);
  const exists = psql(`SELECT 1 FROM pg_database WHERE datname='${PG_DB}'`);
  if (exists && !exists.stdout?.includes('1 row')) {
    psql(`CREATE DATABASE ${PG_DB} OWNER ${PG_USER};`);
  }
  console.log(`  ${G}✔${X}`);

  console.log(`${C}[3/4]${X} Granting privileges...`);
  psql(`GRANT ALL PRIVILEGES ON DATABASE ${PG_DB} TO ${PG_USER};`);
  console.log(`  ${G}✔${X}`);

  console.log(`${C}[4/4]${X} Running schema (infra/postgres/init.sql)...`);
  if (!fs.existsSync(SQL)) { console.log(`${R}init.sql not found at ${SQL}${X}`); process.exit(1); }
  psqlFile(SQL, PG_DB);
  console.log(`  ${G}✔${X} Schema applied\n`);

  console.log(`${G}${B}Database ready!${X}`);
  console.log(`Run: ${C}npm run db:seed${X} to insert sample data\n`);
}

main().catch(err => { console.error(`${R}DB init failed:${X}`, err.message); process.exit(1); });
