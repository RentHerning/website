// The real centre of Herning, built from OpenStreetMap by
// scripts/city/build-herning.mjs into a compact binary file (see format there).

const METRES_PER_DEG_LAT = 110574;

export async function loadHerning(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return decode(await res.arrayBuffer());
}

/**
 * Layout: "RHC1" | uint32 headerLength | header JSON (padded to 4 bytes) |
 * int16 positions (×scale) | uint8 colours | uint8 info | uint16|uint32 indices
 */
export function decode(buffer) {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'RHC1') throw new Error('Not a city model');
  const headerLength = view.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, headerLength)));
  let offset = 8 + headerLength;
  offset += (4 - (offset % 4)) % 4;

  const n = header.vertexCount;
  const qPos = new Int16Array(buffer, offset, n * 3);
  offset += n * 6;
  const qCol = new Uint8Array(buffer, offset, n * 3);
  offset += n * 3;
  const qInfo = new Uint8Array(buffer, offset, n * 2);
  offset += n * 2;
  offset += (4 - (offset % 4)) % 4;
  const index =
    header.indexType === 'u32'
      ? new Uint32Array(buffer, offset, header.indexCount)
      : new Uint16Array(buffer, offset, header.indexCount);

  const position = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i += 1) position[i] = qPos[i] * header.scale;
  const color = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i += 1) color[i] = qCol[i] / 255;
  const info = new Float32Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    info[i * 2] = qInfo[i * 2] / 255;
    info[i * 2 + 1] = qInfo[i * 2 + 1] === 255 ? -1 : qInfo[i * 2 + 1] / 254;
  }
  const pts = (flat) => Array.from({ length: flat.length / 2 }, (_, i) => [flat[i * 2] / 10, flat[i * 2 + 1] / 10]);
  return {
    position,
    color,
    info,
    index,
    radius: header.radius,
    maxHeight: header.maxHeight,
    center: header.center,
    roads: (header.roads ?? []).map(([major, flat]) => ({ major: Boolean(major), points: pts(flat) })),
    rail: (header.rail ?? []).map(pts),
    labels: (header.labels ?? []).map((l) => ({ name: l.name, x: l.x / 10, z: l.z / 10 })),
  };
}

/** Real coordinates: only listings inside the cut-out get a pin. */
export function herningPins(listings, model) {
  const { lat: lat0, lng: lng0 } = model.center;
  const k = Math.cos((lat0 * Math.PI) / 180) * 111320;
  return listings
    .filter((l) => l.location)
    .map((l) => ({
      listing: l,
      x: (l.location.lng - lng0) * k,
      z: -(l.location.lat - lat0) * METRES_PER_DEG_LAT,
      y: 45,
    }))
    .filter((p) => Math.hypot(p.x, p.z) < model.radius * 0.92);
}
