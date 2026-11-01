#!/usr/bin/env node
// Sanity checks for data/listings.json, run in CI before the data is committed or built.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = join(dirname(fileURLToPath(import.meta.url)), '../data/listings.json');
const data = JSON.parse(await readFile(file, 'utf8'));
const problems = [];

if (!Array.isArray(data.listings)) problems.push('listings is not an array');
const ids = new Set();
for (const l of data.listings ?? []) {
  const where = `listing ${l.id}`;
  if (!Number.isInteger(l.id)) problems.push(`${where}: id is not an integer`);
  if (ids.has(l.id)) problems.push(`${where}: duplicate id`);
  ids.add(l.id);
  if (!/^https:\/\/www\.boligportal\.dk\//.test(l.url)) problems.push(`${where}: unexpected url ${l.url}`);
  if (!(l.rent > 0)) problems.push(`${where}: missing rent`);
  if (!(l.size > 0)) problems.push(`${where}: missing size`);
  if (!l.title) problems.push(`${where}: missing title`);
  if (!Array.isArray(l.images)) problems.push(`${where}: images is not an array`);
  for (const img of l.images ?? []) {
    if (!/^https:\/\/image-lambda\.boligportal\.dk\//.test(img.url)) problems.push(`${where}: unexpected image ${img.url}`);
  }
}

if (problems.length) {
  console.error(`listings.json has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`listings.json OK (${data.listings.length} listings, fetched ${data.fetchedAt}).`);
