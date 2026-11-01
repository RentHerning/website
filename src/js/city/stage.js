// The 3D stage: renderer, isometric camera, lighting, gentle camera sway,
// drag-to-look, traffic, HTML listing pins and street labels.
//
// Motion is deliberately calm: north stays roughly up and the view sways a few
// degrees back and forth instead of spinning, so streets stay where the eye
// left them. Dragging turns the city freely; it eases back when released.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  OrthographicCamera,
  PCFShadowMap,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { createCityMaterial } from './material.js';
import { createTraffic } from './traffic.js';

const ELEVATION = (34 * Math.PI) / 180;
const AZIMUTH = Math.PI / 4;
const NORTH_UP = Math.PI / 4; // world rotation that puts north at the top of the screen
const SWAY = (14 * Math.PI) / 180; // ± degrees of idle sway
const SWAY_PERIOD = 46; // seconds for one full back-and-forth
const RISE_SECONDS = 2.4;

export function createStage(container, { reducedMotion = false, mobile = false } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // buildings don't move: render the shadow map only when needed
  renderer.domElement.className = 'city-canvas';
  container.append(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -5000, 5000);

  scene.add(new HemisphereLight(0xfff8ec, 0xb9c9bd, 1.9));
  const sun = new DirectionalLight(0xfff1dc, 2.1);
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  const world = new Group();
  scene.add(world);

  const { material, uniforms } = createCityMaterial();
  let mesh = null;
  let traffic = null;
  let radius = 100;
  let maxHeight = 30;

  // HTML overlays (crisp text at any resolution).
  const overlay = document.createElement('div');
  overlay.className = 'city-overlay';
  container.append(overlay);
  let pins = [];
  let labels = [];

  // Motion state.
  let dragOffset = 0; // extra rotation from dragging, eases back to 0
  let dragging = false;
  let lastX = 0;
  let tiltX = 0; // mouse parallax, smoothed
  let tiltY = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;
  let rise = reducedMotion ? 10 : 0;
  let riseStart = performance.now();
  let running = false;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  const t0 = performance.now();
  let width = 1;
  let height = 1;

  function setContent({ position, color, info, index, radius: r, maxHeight: h, roads, rail, labels: names }) {
    if (mesh) {
      world.remove(mesh);
      mesh.geometry.dispose();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(position, 3));
    // Vertex colours are authored in sRGB; lighting happens in linear space.
    const linear = new Float32Array(color.length);
    const c = new Color();
    for (let i = 0; i < color.length; i += 3) {
      c.setRGB(color[i], color[i + 1], color[i + 2], SRGBColorSpace);
      linear[i] = c.r;
      linear[i + 1] = c.g;
      linear[i + 2] = c.b;
    }
    geometry.setAttribute('color', new BufferAttribute(linear, 3));
    geometry.setAttribute('info', new BufferAttribute(info, 2));
    geometry.setIndex(new BufferAttribute(index, 1));
    geometry.computeBoundingSphere();
    mesh = new Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    world.add(mesh);

    if (traffic) traffic.meshes.forEach((m) => world.remove(m));
    traffic = roads?.length ? createTraffic({ roads, rail: rail ?? [] }, { count: mobile ? 36 : 64 }) : null;
    if (traffic) {
      traffic.meshes.forEach((m) => world.add(m));
      traffic.visible(false);
    }

    setLabels(names ?? []);

    radius = r;
    maxHeight = h;
    const s = sun.shadow.camera;
    s.left = -r * 1.2;
    s.right = r * 1.2;
    s.top = r * 1.2;
    s.bottom = -r * 1.2;
    s.near = 1;
    s.far = r * 6;
    s.updateProjectionMatrix();
    sun.castShadow = false; // no shadows while buildings are still growing
    rise = reducedMotion ? 10 : 0;
    riseStart = performance.now();
    if (reducedMotion) finishRise();
    resize();
  }

  function finishRise() {
    sun.castShadow = true;
    renderer.shadowMap.needsUpdate = true;
    traffic?.visible(true);
    if (reducedMotion) traffic?.update(0);
  }

  function overlayItem(className, html) {
    const el = document.createElement(className === 'city-pin' ? 'a' : 'span');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html;
    overlay.append(el);
    return el;
  }

  function setLabels(list) {
    labels.forEach((l) => l.el.remove());
    labels = list.map((l) => {
      const el = overlayItem('city-label', '');
      el.textContent = l.name;
      return { ...l, y: 3, el, v: new Vector3() };
    });
  }

  function setPins(list) {
    pins.forEach((p) => p.el.remove());
    pins = list.map((p) => {
      const el = overlayItem(
        'city-pin',
        `<span class="city-pin__dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span><span class="city-pin__label"><strong></strong><span></span></span>`,
      );
      el.href = p.href;
      el.tabIndex = -1;
      el.querySelector('strong').textContent = p.price;
      el.querySelector('.city-pin__label > span').textContent = p.label;
      return { ...p, el, v: new Vector3() };
    });
  }

  function project(item, extraY = 0) {
    item.v.set(item.x, item.y + extraY, item.z).applyMatrix4(world.matrixWorld).project(camera);
    const x = (item.v.x * 0.5 + 0.5) * width;
    const y = (-item.v.y * 0.5 + 0.5) * height;
    item.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    return item.v;
  }

  function placeOverlays(t) {
    world.updateMatrixWorld();
    const shown = rise >= 1.2;
    for (const [i, p] of pins.entries()) {
      const v = project(p, reducedMotion ? 0 : Math.sin(t * 1.6 + i) * 1.2);
      p.el.style.opacity = shown ? '1' : '0';
      p.el.style.zIndex = String(1000 + Math.round((1 - v.z) * 1000));
    }
    for (const l of labels) {
      project(l);
      l.el.style.opacity = shown ? '1' : '0';
    }
  }

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    // Fit the slab (diameter 2R) and the tallest building.
    const needW = radius * 1.12;
    const needH = (2 * radius * Math.sin(ELEVATION) + maxHeight * Math.cos(ELEVATION)) * 0.56;
    let halfW = needW;
    let halfH = halfW / aspect;
    if (halfH < needH) {
      halfH = needH;
      halfW = halfH * aspect;
    }
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    renderOnce();
  }

  function aimCamera() {
    const d = radius * 4;
    const el = ELEVATION + tiltY;
    const az = AZIMUTH + tiltX;
    camera.position.set(Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d + maxHeight * 0.18, Math.sin(az) * Math.cos(el) * d);
    camera.lookAt(0, maxHeight * 0.18, 0);
    // Keep the sun fixed relative to the city's north, so shadows don't swim.
    const a = world.rotation.y;
    const sx = -radius * 1.1;
    const sz = radius * 0.7;
    sun.position.set(sx * Math.cos(a) + sz * Math.sin(a), radius * 2.2, -sx * Math.sin(a) + sz * Math.cos(a));
  }

  function renderOnce() {
    const t = (performance.now() - t0) / 1000;
    const sway = reducedMotion ? 0 : Math.sin((t / SWAY_PERIOD) * Math.PI * 2) * SWAY;
    world.rotation.y = NORTH_UP + sway + dragOffset;
    aimCamera();
    uniforms.uRise.value = rise;
    renderer.render(scene, camera);
    placeOverlays(t);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!dragging) dragOffset *= Math.exp(-dt * 0.9); // ease back after a drag
    tiltX += (targetTiltX - tiltX) * Math.min(1, dt * 3);
    tiltY += (targetTiltY - tiltY) * Math.min(1, dt * 3);
    if (rise < 1.6) {
      // Wall-clock based, so the intro takes the same time on slow devices.
      rise = Math.min(1.6, ((now - riseStart) / 1000 / RISE_SECONDS) * 1.6);
      if (rise >= 1.6) finishRise();
    }
    if (!reducedMotion) traffic?.update(dt);
    // The sun turns with the city, so the shadow map needs a refresh while it moves.
    if (sun.castShadow) renderer.shadowMap.needsUpdate = true;
    renderOnce();
    const settled = Math.abs(dragOffset) < 0.0005 && Math.abs(targetTiltX - tiltX) < 0.0005;
    if (running && visible && (!reducedMotion || dragging || !settled)) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && running && visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  // Drag sideways to turn the city (vertical drags still scroll the page).
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    container.classList.add('is-dragging');
    kick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragOffset += ((e.clientX - lastX) / width) * Math.PI * 0.9;
    lastX = e.clientX;
  });
  const end = () => {
    dragging = false;
    container.classList.remove('is-dragging');
    kick();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // Subtle parallax: the camera leans a little towards the mouse.
  const hero = container.closest('.hero') ?? container;
  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      targetTiltX = Math.max(-1, Math.min(1, nx)) * 0.06;
      targetTiltY = Math.max(-1, Math.min(1, ny)) * -0.035;
      kick();
    });
    hero.addEventListener('pointerleave', () => {
      targetTiltX = 0;
      targetTiltY = 0;
    });
  }

  // Pause when off-screen or in a background tab.
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    kick();
  });
  io.observe(container);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    kick();
  });
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);

  return {
    setContent,
    setPins,
    start() {
      running = true;
      renderOnce();
      kick();
    },
  };
}
