#!/usr/bin/env node
// Builds version B of the home-page city: the real centre of Herning from
// OpenStreetMap, written as a compact binary model to public/city/herning.bin.
//
//   node scripts/city/build-herning.mjs                 fetch from Overpass and build
//   node scripts/city/build-herning.mjs --osm file.json build from a saved Overpass response
//
// Runs in GitHub Actions (.github/workflows/build-city.yml), because it needs
// network access to the Overpass API. Map data © OpenStreetMap contributors (ODbL).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CityBuilder, hex, circle } from '../../src/js/city/geometry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'public/city/herning.bin');

// Cut-out: a circle covering Torvet, the station area and the central listings
// (H.C. Ørsteds Vej, Grønnegade, Nørregade). Small enough that buildings stay readable.
const CENTER = { lat: 56.1378, lng: 8.9815 };
const RADIUS = 450; // metres
const VERTICAL = 1.3; // gentle height exaggeration so the town reads better from above
const SCALE = 0.05; // position quantisation (metres per int16 step)

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const QUERY = `[out:json][timeout:120];
(
  way["building"](around:${RADIUS + 40},${CENTER.lat},${CENTER.lng});
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|pedestrian|living_street|service)$"](around:${RADIUS + 40},${CENTER.lat},${CENTER.lng});
  way["railway"="rail"](around:${RADIUS + 40},${CENTER.lat},${CENTER.lng});
  way["leisure"~"^(park|garden|pitch|playground)$"](around:${RADIUS + 40},${CENTER.lat},${CENTER.lng});
  way["landuse"~"^(grass|forest|recreation_ground|meadow|cemetery|village_green)$"](around:${RADIUS + 40},${CENTER.lat},${CENTER.lng});
  way["natural"~"^(water|wood|scrub)$"](around:${RADIUS + 40},${CENTER.lat},${CENTER.lng});
  way["amenity"="parking"](around:${RADIUS + 40},${CENTER.lat},${CENTER.lng});
);
out tags geom;`;

// ---------------------------------------------------------------- palette (same family as version A)
const P = {
  ground: hex('#d6d0c2'),
  road: hex('#b9b3a6'),
  roadMajor: hex('#aaa396'),
  pedestrian: hex('#efe8d9'),
  rail: hex('#8a8178'),
  parking: hex('#d2ccc0'),
  grass: hex('#c3d3b2'),
  wood: hex('#a9c19a'),
  water: hex('#8fb5c8'),
  soil: [hex('#7a6450'), hex('#5f4c3c')],
  roofFlat: hex('#f3f0ea'),
  roofTile: hex('#a5533c'),
  roofSlate: hex('#4b5257'),
  trees: [hex('#5f8a62'), hex('#6f9a69'), hex('#4f7a5a'), hex('#7ea56f')],
  trunk: hex('#7a5b43'),
  walls: {
    house: ['#b65a42', '#e4c870', '#f4f1ea', '#d8c6a2', '#9c4a37'].map(hex),
    flats: ['#b65a42', '#d8c6a2', '#efe8da', '#9c4a37', '#e4c870', '#8197ab'].map(hex),
    work: ['#8197ab', '#efe8da', '#d8c6a2', '#f4f1ea', '#5d7f6c'].map(hex),
    small: ['#d8c6a2', '#efe8da', '#b9b3a7'].map(hex),
    church: hex('#b65a42'),
  },
};

// ---------------------------------------------------------------- helpers
const K_LNG = Math.cos((CENTER.lat * Math.PI) / 180) * 111320;
const K_LAT = 110574;
const project = ({ lat, lon }) => [(lon - CENTER.lng) * K_LNG, -(lat - CENTER.lat) * K_LAT];
const inside = ([x, z], r = RADIUS) => x * x + z * z <= r * r;

/** Stable pseudo-random number per OSM id, so the model is reproducible. */
const rand = (id, salt = 0) => {
  let h = (id * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
const pick = (arr, id, salt) => arr[Math.floor(rand(id, salt) * arr.length)];

function area(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

/** Douglas–Peucker simplification of a closed ring. */
function simplify(pts, tol) {
  if (pts.length <= 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, az] = pts[a];
    const [bx, bz] = pts[b];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i += 1) {
      const d = Math.abs((bx - ax) * (az - pts[i][1]) - (ax - pts[i][0]) * (bz - az)) / len;
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out = pts.filter((_, i) => keep[i]);
  return out.length >= 3 ? out : pts;
}

/** Clip a polygon to the circular cut-out (Sutherland–Hodgman against a 96-gon). */
const CLIP = circle(RADIUS, 96).reverse();
function clipToCircle(poly) {
  let out = poly;
  for (let i = 0; i < CLIP.length && out.length; i += 1) {
    const [ax, az] = CLIP[i];
    const [bx, bz] = CLIP[(i + 1) % CLIP.length];
    const side = ([x, z]) => (bx - ax) * (z - az) - (bz - az) * (x - ax);
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j += 1) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return out;
}

/** Clip a polyline to the circle, cutting segments exactly at the edge. */
function clipLine(line, r = RADIUS) {
  const runs = [];
  let run = [];
  for (let i = 0; i < line.length - 1; i += 1) {
    const [x1, z1] = line[i];
    const [x2, z2] = line[i + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    // Solve |p1 + t·d| = r for the part of the segment inside the circle.
    const a = dx * dx + dz * dz;
    const b = 2 * (x1 * dx + z1 * dz);
    const c = x1 * x1 + z1 * z1 - r * r;
    const disc = b * b - 4 * a * c;
    if (a === 0 || disc <= 0) {
      if (run.length) runs.push(run), (run = []);
      continue;
    }
    const sq = Math.sqrt(disc);
    const t0 = Math.max(0, (-b - sq) / (2 * a));
    const t1 = Math.min(1, (-b + sq) / (2 * a));
    if (t0 >= t1) {
      if (run.length) runs.push(run), (run = []);
      continue;
    }
    const p0 = [x1 + dx * t0, z1 + dz * t0];
    const p1 = [x1 + dx * t1, z1 + dz * t1];
    if (!run.length || t0 > 0) {
      if (run.length) runs.push(run);
      run = [p0];
    }
    run.push(p1);
    if (t1 < 1) runs.push(run), (run = []);
  }
  if (run.length) runs.push(run);
  return runs.filter((x) => x.length >= 2);
}

function ring(el) {
  const pts = el.geometry.map(project);
  if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
  return pts;
}

/** Height in metres and wall/roof style for a building. */
function styleFor(el, footprint) {
  const t = el.tags;
  const type = t.building;
  const a = Math.abs(area(footprint));
  const levels = parseFloat(t['building:levels']);
  const height = parseFloat(t.height);

  let floors;
  let walls = P.walls.flats;
  let gable = false;
  if (['house', 'detached', 'semidetached_house', 'terrace', 'bungalow', 'farm'].includes(type)) {
    floors = 1 + (rand(el.id, 1) < 0.35 ? 1 : 0);
    walls = P.walls.house;
    gable = true;
  } else if (['garage', 'garages', 'shed', 'carport', 'roof', 'hut', 'kiosk', 'service', 'transformer_tower'].includes(type)) {
    floors = 0.8;
    walls = P.walls.small;
  } else if (['apartments', 'residential', 'dormitory'].includes(type)) {
    floors = 3 + Math.floor(rand(el.id, 2) * 2);
  } else if (['commercial', 'retail', 'office', 'hotel', 'public', 'civic', 'school', 'hospital', 'university', 'college', 'train_station'].includes(type)) {
    floors = 2 + Math.floor(rand(el.id, 3) * 2);
    walls = P.walls.work;
  } else if (['industrial', 'warehouse', 'sports_hall', 'sports_centre', 'supermarket'].includes(type)) {
    floors = 2.2;
    walls = P.walls.work;
  } else if (type === 'church' || t.amenity === 'place_of_worship') {
    floors = 4;
    walls = [P.walls.church];
  } else {
    // building=yes: guess from the footprint size
    if (a < 60) floors = 1;
    else if (a < 160) {
      floors = 1.5;
      walls = P.walls.house;
      gable = true;
    } else if (a < 700) floors = 2 + Math.floor(rand(el.id, 4) * 2);
    else floors = 3 + Math.floor(rand(el.id, 5) * 2);
  }
  if (Number.isFinite(levels)) floors = Math.max(1, levels);
  let h = Number.isFinite(height) ? height : floors * 3 + 0.6;
  if (!Number.isFinite(height) && gable) h = floors * 2.9;
  return {
    h: h * VERTICAL,
    wall: pick(walls, el.id, 6),
    windows: floors >= 1 && !['garage', 'garages', 'shed', 'carport', 'roof'].includes(type) ? 1 : 0,
    gable: gable && footprint.length === 4 && a < 260,
    roofColor: pick([P.roofTile, P.roofSlate, P.roofSlate], el.id, 7),
  };
}

// ---------------------------------------------------------------- build
async function fetchOsm() {
  const body = `data=${encodeURIComponent(QUERY)}`;
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'RentHerningSite/1.0 (+https://github.com/RentHerning/website)' },
          signal: AbortSignal.timeout(150_000),
        });
        if (res.ok) {
          console.log(`Fetched OSM data from ${endpoint}`);
          return res.json();
        }
        console.warn(`${endpoint}: HTTP ${res.status}`);
      } catch (err) {
        console.warn(`${endpoint}: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
    }
  }
  throw new Error('All Overpass endpoints failed');
}

export function buildModel(osm) {
  const b = new CityBuilder();
  const els = osm.elements.filter((e) => e.type === 'way' && e.geometry?.length >= 2);

  // Ground slab.
  b.slab(circle(RADIUS + 8, 120), 26, P.ground, P.soil);

  // Ground layers, back to front: green, parking, water, roads, rail.
  const flat = (pred, color, y) => {
    for (const el of els.filter(pred)) {
      const pts = clipToCircle(ring(el));
      if (pts.length >= 3 && Math.abs(area(pts)) > 20) b.polygon(pts, y, color);
    }
  };
  flat((e) => /^(forest)$/.test(e.tags.landuse) || /^(wood|scrub)$/.test(e.tags.natural), P.wood, 0.12);
  flat((e) => /^(grass|recreation_ground|meadow|cemetery|village_green)$/.test(e.tags.landuse) || /^(park|garden|pitch|playground)$/.test(e.tags.leisure), P.grass, 0.18);
  flat((e) => e.tags.amenity === 'parking', P.parking, 0.22);
  flat((e) => e.tags.natural === 'water', P.water, 0.26);

  const roadWidth = { primary: 10, secondary: 9, tertiary: 8, residential: 6, unclassified: 6, living_street: 5, pedestrian: 6, service: 3.5 };
  for (const el of els.filter((e) => e.tags.highway)) {
    const w = roadWidth[el.tags.highway] ?? 5;
    const color = el.tags.highway === 'pedestrian' ? P.pedestrian : w >= 8 ? P.roadMajor : P.road;
    for (const run of clipLine(el.geometry.map(project), RADIUS + 6)) b.ribbon(run, w, el.tags.highway === 'pedestrian' ? 0.3 : 0.34, color);
  }
  for (const el of els.filter((e) => e.tags.railway === 'rail')) {
    for (const run of clipLine(el.geometry.map(project), RADIUS + 6)) b.ribbon(run, 3.2, 0.38, P.rail);
  }

  // Buildings.
  let count = 0;
  let maxHeight = 0;
  for (const el of els.filter((e) => e.tags.building && e.tags.building !== 'no')) {
    let pts = ring(el);
    if (pts.length < 3 || !pts.every((p) => inside(p, RADIUS - 4))) continue;
    if (Math.abs(area(pts)) < 18) continue;
    pts = simplify([...pts, pts[0]], 0.7).slice(0, -1);
    if (pts.length < 3) continue;
    const s = styleFor(el, pts);
    const [cx, cz] = pts.reduce(([ax, az], [x, z]) => [ax + x / pts.length, az + z / pts.length], [0, 0]);
    const delay = Math.min(1, Math.hypot(cx, cz) / (RADIUS * 1.1)) * 0.85 + rand(el.id, 9) * 0.12;
    b.prismShared(pts, 0.4, s.h, { wall: s.wall, roof: P.roofFlat, windows: s.windows, delay });
    if (s.gable) {
      // Oriented rectangle → gable along the long side.
      const [p0, p1, p2] = pts;
      const e1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const e2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const rot = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      b.gable(cx, cz, e1, e2, s.h, Math.min(e1, e2) * 0.42, s.roofColor, rot, delay, s.wall);
    }
    maxHeight = Math.max(maxHeight, s.h);
    count += 1;
  }

  // Trees scattered in green areas (deterministic).
  let trees = 0;
  for (const el of els.filter((e) => /^(park|garden)$/.test(e.tags.leisure) || /^(forest)$/.test(e.tags.landuse) || /^(wood)$/.test(e.tags.natural))) {
    const pts = clipToCircle(ring(el));
    if (pts.length < 3) continue;
    const a = Math.abs(area(pts));
    const xs = pts.map((p) => p[0]);
    const zs = pts.map((p) => p[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const want = Math.min(60, Math.floor(a / 260));
    for (let i = 0, tries = 0; i < want && tries < want * 6 && trees < 900; tries += 1) {
      const x = x0 + rand(el.id, 100 + tries) * (x1 - x0);
      const z = z0 + rand(el.id, 200 + tries) * (z1 - z0);
      if (!pointInPolygon([x, z], pts)) continue;
      const s = 0.9 + rand(el.id, 300 + tries) * 0.6;
      b.box(x, z, 0.8 * s, 0.8 * s, 2.6 * s, { wall: P.trunk, roof: P.trunk, windows: 0 }, 0, 0.2);
      b.blob(x, z, 3.2 * s, 5 * s, pick(P.trees, el.id, 400 + tries));
      trees += 1;
      i += 1;
    }
  }

  return { builder: b, stats: { buildings: count, trees, maxHeight } };
}

function pointInPolygon([x, z], pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Binary layout read by src/js/city/herning.js. */
export function encode(builder, meta) {
  const { position, color, info, index } = builder.toArrays();
  const n = position.length / 3;
  const header = Buffer.from(
    JSON.stringify({
      vertexCount: n,
      indexCount: index.length,
      indexType: index instanceof Uint32Array ? 'u32' : 'u16',
      scale: SCALE,
      radius: RADIUS + 8,
      maxHeight: meta.maxHeight,
      center: CENTER,
      attribution: '© OpenStreetMap contributors (ODbL)',
      builtAt: new Date().toISOString(),
    }),
  );
  const pad = (len) => (4 - (len % 4)) % 4;
  const qPos = new Int16Array(n * 3);
  for (let i = 0; i < n * 3; i += 1) qPos[i] = Math.round(position[i] / SCALE);
  const qCol = new Uint8Array(n * 3);
  for (let i = 0; i < n * 3; i += 1) qCol[i] = Math.round(color[i] * 255);
  const qInfo = new Uint8Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    qInfo[i * 2] = Math.round(info[i * 2] * 255);
    qInfo[i * 2 + 1] = info[i * 2 + 1] < 0 ? 255 : Math.round(info[i * 2 + 1] * 254);
  }
  const head = Buffer.alloc(8);
  head.write('RHC1', 0, 'ascii');
  head.writeUInt32LE(header.length, 4);
  const parts = [head, header, Buffer.alloc(pad(8 + header.length)), Buffer.from(qPos.buffer), Buffer.from(qCol), Buffer.from(qInfo)];
  const before = parts.reduce((s, p) => s + p.length, 0);
  parts.push(Buffer.alloc(pad(before)), Buffer.from(index.buffer));
  return Buffer.concat(parts);
}

async function main() {
  const i = process.argv.indexOf('--osm');
  const osm = i > -1 ? JSON.parse(await readFile(process.argv[i + 1], 'utf8')) : await fetchOsm();
  const { builder, stats } = buildModel(osm);
  const buffer = encode(builder, stats);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, buffer);
  console.log(
    `Wrote ${OUT} – ${(buffer.length / 1024).toFixed(0)} KB, ${stats.buildings} buildings, ${stats.trees} trees, ${builder.vertexCount} vertices, max height ${stats.maxHeight.toFixed(1)} m`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
