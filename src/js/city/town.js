// Version A: a stylised low-poly town, generated in the browser from a fixed seed.
// Loosely modelled on a Danish town centre: a church on the square, perimeter
// blocks of flats around courtyards, a landmark tower, a park with a pond,
// and villas and terraced houses towards the edge.
import { CityBuilder, rng, hex, circle } from './geometry.js';

const C = {
  street: hex('#cdc8bd'),
  pavement: hex('#e7e2d6'),
  plaza: hex('#ece5d6'),
  grass: hex('#c3d3b2'),
  grassDark: hex('#b4c7a3'),
  water: hex('#8fb5c8'),
  shore: hex('#d9d2bf'),
  soil: [hex('#7a6450'), hex('#5f4c3c')],
  roofFlat: hex('#e9e6df'),
  roofTile: hex('#a5533c'),
  roofSlate: hex('#4b5257'),
  roofCopper: hex('#6e9a87'),
  trunk: hex('#7a5b43'),
  trees: [hex('#5f8a62'), hex('#6f9a69'), hex('#4f7a5a'), hex('#7ea56f')],
  walls: {
    brick: hex('#b65a42'),
    brickDark: hex('#9c4a37'),
    sand: hex('#d8c6a2'),
    cream: hex('#efe8da'),
    yellow: hex('#e4c870'),
    slate: hex('#8197ab'),
    white: hex('#f4f1ea'),
    green: hex('#5d7f6c'),
  },
  cars: [hex('#c84b3c'), hex('#f0efe9'), hex('#3c5a78'), hex('#2f3a33'), hex('#e3b34a')],
};

const BLOCK = 46;
const STREET = 12;
const PITCH = BLOCK + STREET;
const HALF = (5 * BLOCK + 4 * STREET) / 2 + 12;

export function buildTown() {
  const b = new CityBuilder();
  const rand = rng(7400); // Herning's postcode
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const delayAt = (x, z) => Math.min(1, Math.hypot(x, z) / (HALF * 1.3)) * 0.85 + rand() * 0.12;

  // Slab with rounded corners.
  const r = 22;
  const corner = (cx, cz, a0) => Array.from({ length: 9 }, (_, i) => {
    const a = a0 - (i / 8) * (Math.PI / 2);
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  });
  const h = HALF;
  const outline = [
    ...corner(h - r, h - r, Math.PI / 2),
    ...corner(h - r, -h + r, 0),
    ...corner(-h + r, -h + r, -Math.PI / 2),
    ...corner(-h + r, h - r, -Math.PI),
  ];
  b.slab(outline, 14, C.street, C.soil);

  let maxHeight = 0;
  const building = (x, z, w, d, floors, wall, opts = {}) => {
    const height = floors * 3 + (opts.extra ?? 0.6);
    maxHeight = Math.max(maxHeight, height + (opts.gable ? opts.gable : 0));
    const delay = delayAt(x, z);
    b.box(x, z, w, d, height, { wall, roof: opts.roof ?? C.roofFlat, windows: opts.windows ?? 1, delay }, opts.rot ?? 0, 0.3);
    if (opts.gable) b.gable(x, z, w, d, height + 0.3, opts.gable, opts.roofColor ?? C.roofTile, opts.rot ?? 0, delay, wall);
    else if (!opts.plain && floors >= 3 && rand() < 0.6) {
      // roof-top plant room, like the AC boxes in the reference render
      b.box(x + (rand() - 0.5) * w * 0.4, z + (rand() - 0.5) * d * 0.4, 3.2, 2.4, 1.6, { wall: C.walls.white, roof: C.walls.white, windows: 0, delay }, opts.rot ?? 0, height + 0.3);
    }
  };
  const tree = (x, z, s = 1) => {
    const delay = delayAt(x, z);
    b.box(x, z, 0.7 * s, 0.7 * s, 2.4 * s, { wall: C.trunk, roof: C.trunk, windows: 0, delay }, 0, 0.1);
    if (rand() < 0.35) b.cone(x, z, 2.6 * s, 2.0 * s, 7 * s, pick(C.trees), 7, delay);
    else b.blob(x, z, 3 * s, 4.6 * s, pick(C.trees), delay);
  };
  const car = (x, z, rot) => {
    const col = pick(C.cars);
    b.box(x, z, 4.2, 1.8, 0.9, { wall: col, roof: col, windows: 0 }, rot, 0.25);
    b.box(x - 0.2 * Math.cos(rot), z - 0.2 * Math.sin(rot), 2.2, 1.6, 0.7, { wall: hex('#3b4a55'), roof: col, windows: 0 }, rot, 1.15);
  };

  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      const cx = (i - 2) * PITCH;
      const cz = (j - 2) * PITCH;
      const ring = Math.max(Math.abs(i - 2), Math.abs(j - 2));
      const half = BLOCK / 2;
      const square = [
        [cx - half, cz + half],
        [cx + half, cz + half],
        [cx + half, cz - half],
        [cx - half, cz - half],
      ];

      if (i === 2 && j === 2) {
        // Torvet with the church
        b.polygon(square, 0.2, C.plaza);
        const delay = delayAt(cx, cz);
        b.box(cx - 4, cz - 6, 24, 11, 9, { wall: C.walls.brick, roof: C.walls.brick, windows: 0, delay }, 0, 0.2);
        b.gable(cx - 4, cz - 6, 24, 11, 9.2, 6, C.roofCopper, 0, delay, C.walls.brick);
        b.box(cx + 11, cz - 6, 7, 7, 24, { wall: C.walls.brickDark, roof: C.walls.brickDark, windows: 0, delay }, 0, 0.2);
        b.cone(cx + 11, cz - 6, 5, 24.2, 13, C.roofCopper, 4, delay);
        maxHeight = Math.max(maxHeight, 37);
        for (let k = -2; k <= 2; k += 1) tree(cx + k * 8.5, cz + 14, 0.9);
        b.polygon(circle(3.2, 12, cx - 6, cz + 6), 0.35, C.water);
        continue;
      }
      if (i === 3 && j === 1) {
        // park with a pond
        b.polygon(square, 0.2, C.grass);
        b.polygon(circle(15, 24, cx + 2, cz - 1).map(([x, z]) => [x, cz + (z - cz) * 0.7]), 0.3, C.shore);
        b.polygon(circle(13.5, 24, cx + 2, cz - 1).map(([x, z]) => [x, cz + (z - cz) * 0.7]), 0.4, C.water);
        for (let k = 0; k < 14; k += 1) {
          const a = rand() * Math.PI * 2;
          const rr = 17 + rand() * 4;
          tree(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr * 0.85, 0.8 + rand() * 0.5);
        }
        continue;
      }
      if (i === 1 && j === 3) {
        // landmark tower with a low podium
        b.polygon(square, 0.2, C.pavement);
        building(cx, cz, 30, 30, 2, C.walls.slate, { plain: true });
        building(cx - 2, cz - 2, 15, 15, 15, C.walls.cream, { extra: 2 });
        for (let k = -1; k <= 1; k += 2) tree(cx + 18 * k, cz + 18, 0.9);
        continue;
      }

      if (ring <= 1) {
        // Perimeter block: flats along all four edges, courtyard in the middle.
        b.polygon(square, 0.2, C.pavement);
        const inner = half - 12;
        b.polygon(
          [
            [cx - inner, cz + inner],
            [cx + inner, cz + inner],
            [cx + inner, cz - inner],
            [cx - inner, cz - inner],
          ],
          0.32,
          C.grass,
        );
        const depth = 11;
        const edge = half - 1.5;
        const sides = [
          { dir: 'x', z: cz + edge - depth / 2, from: cx - edge, to: cx + edge },
          { dir: 'x', z: cz - edge + depth / 2, from: cx - edge, to: cx + edge },
          { dir: 'z', x: cx + edge - depth / 2, from: cz - edge + depth, to: cz + edge - depth },
          { dir: 'z', x: cx - edge + depth / 2, from: cz - edge + depth, to: cz + edge - depth },
        ];
        for (const s of sides) {
          let p = s.from;
          while (p < s.to - 4) {
            const len = Math.min(s.to - p, 10 + rand() * 9);
            const floors = 3 + Math.floor(rand() * (ring === 0 ? 4 : 3));
            const wall = pick([C.walls.brick, C.walls.sand, C.walls.cream, C.walls.yellow, C.walls.slate, C.walls.brickDark]);
            const mid = p + len / 2;
            if (s.dir === 'x') building(mid, s.z, len - 0.4, depth, floors, wall);
            else building(s.x, mid, depth, len - 0.4, floors, wall);
            p += len;
          }
        }
        tree(cx, cz, 1.1);
        if (rand() < 0.7) tree(cx + 5, cz - 4, 0.8);
      } else {
        // Outer ring: villas or a row of terraced houses, with gardens.
        b.polygon(square, 0.2, C.grassDark);
        if ((i + j) % 2 === 0) {
          for (const ox of [-11.5, 11.5]) {
            for (const oz of [-11.5, 11.5]) {
              const x = cx + ox;
              const z = cz + oz;
              b.polygon(
                [
                  [x - 10.5, z + 10.5],
                  [x + 10.5, z + 10.5],
                  [x + 10.5, z - 10.5],
                  [x - 10.5, z - 10.5],
                ],
                0.3,
                C.grass,
              );
              const floors = rand() < 0.4 ? 2 : 1;
              const wall = pick([C.walls.white, C.walls.yellow, C.walls.brick, C.walls.cream]);
              const roof = pick([C.roofTile, C.roofSlate, C.roofSlate]);
              const rot = rand() < 0.5 ? 0 : Math.PI / 2;
              building(x - 1, z - 1, 11, 8, floors, wall, { gable: 3.6, roofColor: roof, rot, extra: 0.3 });
              tree(x + 6.5, z + 6, 0.8 + rand() * 0.3);
            }
          }
        } else {
          // two rows of terraced houses (rækkehuse)
          for (const oz of [-12, 12]) {
            const wall = pick([C.walls.brick, C.walls.sand, C.walls.white]);
            const roof = pick([C.roofSlate, C.roofTile]);
            for (let k = 0; k < 5; k += 1) {
              building(cx - 17 + k * 8.5, cz + oz, 8.2, 9, 2, wall, { gable: 3, roofColor: roof, extra: 0.2 });
            }
            tree(cx + 21, cz + oz, 0.8);
          }
        }
      }

      // Street trees and a few parked cars along the block's south edge.
      if (ring >= 1 && rand() < 0.75) {
        for (let k = -1; k <= 1; k += 1) tree(cx + k * 15, cz + half + 3.2, 0.75);
      }
      if (rand() < 0.6) car(cx - 12 + rand() * 24, cz - half - 3.5, 0);
      if (rand() < 0.4) car(cx + half + 3.5, cz - 12 + rand() * 24, Math.PI / 2);
    }
  }

  return { ...b.toArrays(), radius: Math.hypot(HALF, HALF) - r * 0.4, maxHeight, half: HALF };
}

/**
 * The town is invented, so listing pins are placed by their relative position:
 * the listings' own lat/lng spread is scaled onto the town.
 */
export function townPins(listings, half = HALF) {
  const located = listings.filter((l) => l.location);
  if (!located.length) return [];
  const lats = located.map((l) => l.location.lat);
  const lngs = located.map((l) => l.location.lng);
  const [la0, la1, ln0, ln1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const span = half * 0.72;
  const norm = (v, a, b2) => (b2 - a < 1e-6 ? 0 : ((v - a) / (b2 - a)) * 2 - 1);
  return located.map((l) => ({
    listing: l,
    x: norm(l.location.lng, ln0, ln1) * span,
    z: -norm(l.location.lat, la0, la1) * span,
    y: 30,
  }));
}
