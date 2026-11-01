// Tiny cars driving on the real roads and a train passing now and then.
// Each is drawn with one InstancedMesh, so 60 cars cost a single draw call.
import { BoxGeometry, Color, DynamicDrawUsage, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const CAR_COLOURS = ['#c84b3c', '#f2f0ea', '#3c5a78', '#2f3a33', '#e3b34a', '#8a9aa6', '#f2f0ea', '#5b6e5d'];

function carGeometry() {
  const body = new BoxGeometry(4.4, 1.3, 2.0);
  body.translate(0, 0.95, 0);
  const cabin = new BoxGeometry(2.4, 1.0, 1.8);
  cabin.translate(-0.3, 2.05, 0);
  const car = mergeGeometries([body, cabin]);
  // Toy scale: real-size cars would be 2–3 px long at hero size.
  car.scale(2.1, 2.1, 2.1);
  return car;
}

function trainGeometry() {
  const car = new BoxGeometry(22, 3.6, 3.1);
  car.translate(0, 2.3, 0);
  car.scale(1.3, 1.6, 1.6);
  return car;
}

/** A polyline with cumulative lengths, so we can sample a point at distance d. */
function path(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { points, cum, length: cum.at(-1) };
}

function sample(p, d, out) {
  const { points, cum } = p;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i += 1;
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const [x1, z1] = points[i - 1];
  const [x2, z2] = points[i];
  out.x = x1 + (x2 - x1) * t;
  out.z = z1 + (z2 - z1) * t;
  out.dx = x2 - x1;
  out.dz = z2 - z1;
  return out;
}

export function createTraffic({ roads, rail }, { count = 60 } = {}) {
  const roadPaths = roads.map((r) => ({ ...path(r.points), major: r.major })).filter((p) => p.length > 40);
  const railPaths = rail.map(path).filter((p) => p.length > 100);
  const material = new MeshLambertMaterial({ vertexColors: false });

  // Busier on the major roads: they're picked three times as often.
  const weighted = roadPaths.flatMap((p) => (p.major ? [p, p, p] : [p]));
  const n = weighted.length ? count : 0;
  const cars = new InstancedMesh(carGeometry(), material, Math.max(n, 1));
  cars.instanceMatrix.setUsage(DynamicDrawUsage);
  cars.count = n;
  const colour = new Color();
  const agents = [];
  for (let i = 0; i < n; i += 1) {
    const p = weighted[Math.floor(Math.random() * weighted.length)];
    agents.push({ p, d: Math.random() * p.length, dir: Math.random() < 0.5 ? 1 : -1, speed: (p.major ? 13 : 9) * (0.8 + Math.random() * 0.4) });
    cars.setColorAt(i, colour.set(CAR_COLOURS[i % CAR_COLOURS.length]));
  }
  if (n) cars.instanceColor.needsUpdate = true;

  const train = new InstancedMesh(trainGeometry(), new MeshLambertMaterial({ color: '#d9473a' }), 3);
  train.instanceMatrix.setUsage(DynamicDrawUsage);
  train.count = 0;
  const trainState = { p: railPaths[0] ?? null, d: 0, dir: 1, wait: 6 };

  const dummy = new Object3D();
  const s = { x: 0, z: 0, dx: 0, dz: 0 };

  function place(mesh, i, p, d, dir, laneOffset) {
    sample(p, Math.min(Math.max(d, 0), p.length), s);
    const len = Math.hypot(s.dx, s.dz) || 1;
    // keep right: the right-hand side of heading (hx, hz) is (-hz, hx)
    const nx = ((-s.dz * dir) / len) * laneOffset;
    const nz = ((s.dx * dir) / len) * laneOffset;
    dummy.position.set(s.x + nx, 0.35, s.z + nz);
    dummy.rotation.set(0, Math.atan2(-s.dz * dir, s.dx * dir), 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  function update(dt) {
    for (const [i, a] of agents.entries()) {
      a.d += a.speed * dt * a.dir;
      if (a.d > a.p.length || a.d < 0) {
        // At the end of a road: turn onto another random road.
        a.p = weighted[Math.floor(Math.random() * weighted.length)];
        a.dir = Math.random() < 0.5 ? 1 : -1;
        a.d = a.dir > 0 ? 0 : a.p.length;
      }
      place(cars, i, a.p, a.d, a.dir, 2.4);
    }
    if (n) cars.instanceMatrix.needsUpdate = true;

    const t = trainState;
    if (t.p) {
      if (t.wait > 0) {
        t.wait -= dt;
        train.count = 0;
      } else {
        t.d += 22 * dt * t.dir;
        const tail = t.d - t.dir * 2 * 30;
        if ((t.dir > 0 && tail > t.p.length) || (t.dir < 0 && tail < 0)) {
          t.wait = 14 + Math.random() * 12;
          t.dir = -t.dir;
          t.d = t.dir > 0 ? 0 : t.p.length;
        }
        train.count = 3;
        for (let k = 0; k < 3; k += 1) place(train, k, t.p, t.d - t.dir * k * 30, t.dir, 0);
        train.instanceMatrix.needsUpdate = true;
      }
    }
  }

  return { meshes: [cars, train], update, visible: (v) => (cars.visible = train.visible = v) };
}
