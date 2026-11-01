// Merged low-poly geometry for the city scenes. Everything ends up in ONE
// indexed buffer with per-vertex colour and an "info" attribute:
//   info.x = 1 on walls that get procedural windows (see material.js), else 0
//   info.y = rise delay (0..1) for the intro animation, -1 = never animates
// Pure JS (no DOM) so the Node script that builds the real-Herning model can use it too.
import { ShapeUtils, Vector2 } from 'three';

export class CityBuilder {
  constructor() {
    this.positions = [];
    this.colors = [];
    this.info = [];
    this.indices = [];
  }

  get vertexCount() {
    return this.positions.length / 3;
  }

  vertex(x, y, z, color, windows = 0, delay = -1) {
    this.positions.push(x, y, z);
    this.colors.push(color[0], color[1], color[2]);
    this.info.push(windows, delay);
    return this.vertexCount - 1;
  }

  /** Quad from 4 corners (counter-clockwise seen from outside). Vertices are not shared, so faces stay flat. */
  quad(a, b, c, d, color, windows = 0, delay = -1) {
    const i = this.vertex(...a, color, windows, delay);
    this.vertex(...b, color, windows, delay);
    this.vertex(...c, color, windows, delay);
    this.vertex(...d, color, windows, delay);
    this.indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }

  triangle(a, b, c, color, windows = 0, delay = -1) {
    const i = this.vertex(...a, color, windows, delay);
    this.vertex(...b, color, windows, delay);
    this.vertex(...c, color, windows, delay);
    this.indices.push(i, i + 1, i + 2);
  }

  /**
   * Extruded polygon (footprint in x/z, counter-clockwise from above).
   * Walls from y0 to y1, flat roof at y1.
   */
  prism(points, y0, y1, { wall, roof, windows = 1, delay = -1, bottom = false }) {
    const n = points.length;
    for (let i = 0; i < n; i += 1) {
      const [x1, z1] = points[i];
      const [x2, z2] = points[(i + 1) % n];
      this.quad([x1, y0, z1], [x2, y0, z2], [x2, y1, z2], [x1, y1, z1], wall, windows, delay);
    }
    this.polygon(points, y1, roof, 0, delay);
    if (bottom) this.polygon([...points].reverse(), y0, wall, 0, delay);
  }

  /**
   * Like prism(), but wall vertices are shared between neighbouring walls
   * (flat shading derives normals per pixel, so faces still look crisp).
   * Uses ~40% fewer vertices; used for the large real-Herning model.
   */
  prismShared(points, y0, y1, { wall, roof, windows = 1, delay = -1 }) {
    const n = points.length;
    const base = this.vertexCount;
    for (const [x, z] of points) this.vertex(x, y0, z, wall, windows, delay);
    for (const [x, z] of points) this.vertex(x, y1, z, wall, windows, delay);
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      this.indices.push(base + i, base + j, base + n + j, base + i, base + n + j, base + n + i);
    }
    this.polygon(points, y1, roof, 0, delay);
  }

  /** Flat polygon at height y, facing up. Concave shapes are triangulated. */
  polygon(points, y, color, windows = 0, delay = -1) {
    const contour = points.map(([x, z]) => new Vector2(x, z));
    // ShapeUtils expects clockwise-in-screen order; normalise winding first.
    if (ShapeUtils.isClockWise(contour)) contour.reverse();
    const tris = ShapeUtils.triangulateShape(contour, []);
    const base = this.vertexCount;
    for (const p of contour) this.vertex(p.x, y, p.y, color, windows, delay);
    // Triangles from earcut are CCW in x/y; flip so they face +y in x/z space.
    for (const [a, b, c] of tris) this.indices.push(base + a, base + c, base + b);
  }

  /** Axis-aligned or rotated box with its base centred at (x, z). */
  box(x, z, w, d, h, opts, rot = 0, y0 = 0) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const pts = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ].map(([px, pz]) => [x + px * c - pz * s, z + px * s + pz * c]);
    // Counter-clockwise when seen from above (+y) means clockwise in x/z with z down.
    this.prism(pts.reverse(), y0, y0 + h, opts);
  }

  /** Gable roof on a w×d box (ridge along the longer side), sitting at height y. */
  gable(x, z, w, d, y, rise, color, rot = 0, delay = -1, gableColor = color) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const T = ([px, py, pz]) => [x + px * c - pz * s, py, z + px * s + pz * c];
    const alongX = w >= d;
    const hw = w / 2 + 0.4; // small overhang
    const hd = d / 2 + 0.4;
    if (alongX) {
      const r = [T([-hw, y + rise, 0]), T([hw, y + rise, 0])];
      this.quad(T([-hw, y, hd]), T([hw, y, hd]), r[1], r[0], color, 0, delay);
      this.quad(T([hw, y, -hd]), T([-hw, y, -hd]), r[0], r[1], color, 0, delay);
      this.triangle(T([w / 2, y, d / 2]), T([w / 2, y, -d / 2]), T([w / 2, y + rise, 0]), gableColor, 0, delay);
      this.triangle(T([-w / 2, y, -d / 2]), T([-w / 2, y, d / 2]), T([-w / 2, y + rise, 0]), gableColor, 0, delay);
    } else {
      const r = [T([0, y + rise, -hd]), T([0, y + rise, hd])];
      this.quad(T([hw, y, hd]), T([hw, y, -hd]), r[0], r[1], color, 0, delay);
      this.quad(T([-hw, y, -hd]), T([-hw, y, hd]), r[1], r[0], color, 0, delay);
      this.triangle(T([-w / 2, y, d / 2]), T([w / 2, y, d / 2]), T([0, y + rise, d / 2]), gableColor, 0, delay);
      this.triangle(T([w / 2, y, -d / 2]), T([-w / 2, y, -d / 2]), T([0, y + rise, -d / 2]), gableColor, 0, delay);
    }
  }

  /** Low-poly cone (trees, spires). */
  cone(x, z, r, y0, h, color, sides = 6, delay = -1) {
    const top = [x, y0 + h, z];
    for (let i = 0; i < sides; i += 1) {
      const a1 = (i / sides) * Math.PI * 2;
      const a2 = ((i + 1) / sides) * Math.PI * 2;
      this.triangle([x + Math.cos(a2) * r, y0, z + Math.sin(a2) * r], [x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r], top, color, 0, delay);
    }
  }

  /** Low-poly round tree crown (octahedron-ish). */
  blob(x, z, r, y, color, delay = -1) {
    const s = 6;
    const top = [x, y + r, z];
    const bot = [x, y - r * 0.7, z];
    for (let i = 0; i < s; i += 1) {
      const a1 = (i / s) * Math.PI * 2;
      const a2 = ((i + 1) / s) * Math.PI * 2;
      const p1 = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r];
      const p2 = [x + Math.cos(a2) * r, y, z + Math.sin(a2) * r];
      this.triangle(p2, p1, top, color, 0, delay);
      this.triangle(p1, p2, bot, color, 0, delay);
    }
  }

  /** Round slab (the "cut-out" the city sits on): top at y=0, coloured soil bands on the side. */
  slab(points, depth, topColor, sideColors) {
    this.polygon(points, 0, topColor);
    const bands = sideColors.length;
    const n = points.length;
    for (let b = 0; b < bands; b += 1) {
      const ya = -(depth * b) / bands;
      const yb = -(depth * (b + 1)) / bands;
      for (let i = 0; i < n; i += 1) {
        const [x1, z1] = points[i];
        const [x2, z2] = points[(i + 1) % n];
        this.quad([x1, yb, z1], [x2, yb, z2], [x2, ya, z2], [x1, ya, z1], sideColors[b]);
      }
    }
  }

  /** Flat ribbon along a polyline (roads, rail) slightly above the ground. */
  ribbon(line, width, y, color) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const [x1, z1] = line[i];
      const [x2, z2] = line[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * (width / 2);
      const nz = (dx / len) * (width / 2);
      // extend slightly so segments overlap at joints
      const ex = (dx / len) * (width / 2);
      const ez = (dz / len) * (width / 2);
      this.quad(
        [x1 - nx - ex, y, z1 - nz - ez],
        [x1 + nx - ex, y, z1 + nz - ez],
        [x2 + nx + ex, y, z2 + nz + ez],
        [x2 - nx + ex, y, z2 - nz + ez],
        color,
      );
    }
  }

  toArrays() {
    return {
      position: new Float32Array(this.positions),
      color: new Float32Array(this.colors),
      info: new Float32Array(this.info),
      index: this.vertexCount > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
    };
  }
}

/** Deterministic random numbers so the stylised town looks the same on every visit. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** '#rrggbb' → [r, g, b] in 0..1 (sRGB; the renderer converts). */
export function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Circle as polygon points. */
export function circle(r, segments = 64, cx = 0, cz = 0) {
  return Array.from({ length: segments }, (_, i) => {
    const a = -(i / segments) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  });
}
