// The 3D stage shared by both city versions: renderer, isometric camera,
// lighting, slow turntable animation, drag-to-rotate and HTML map pins.
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

const ELEVATION = (33 * Math.PI) / 180;
const AZIMUTH = Math.PI / 4;
const SPIN = 0.045; // rad/s – one turn in ~2.3 minutes
const RISE_SECONDS = 2.4;

export function createStage(container, { reducedMotion = false, mobile = false } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // the city is static: update the shadow only when needed
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

  const world = new Group(); // rotates
  scene.add(world);

  const { material, uniforms } = createCityMaterial();
  let mesh = null;
  let radius = 100;
  let maxHeight = 30;

  // ---- pins (HTML overlay, crisp at any resolution) ----
  const pinLayer = document.createElement('div');
  pinLayer.className = 'city-pins';
  container.append(pinLayer);
  let pins = [];

  // ---- state ----
  let angle = 0;
  let velocity = SPIN;
  let dragging = false;
  let lastX = 0;
  let lastMoveT = 0;
  let rise = reducedMotion ? 10 : 0;
  let riseStart = performance.now();
  let running = false;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let width = 1;
  let height = 1;

  function setContent({ position, color, info, index, radius: r, maxHeight: h }) {
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

    radius = r;
    maxHeight = h;
    // Sun from the upper left, shadow camera sized to the city.
    const s = sun.shadow.camera;
    s.left = -r * 1.2;
    s.right = r * 1.2;
    s.top = r * 1.2;
    s.bottom = -r * 1.2;
    s.near = 1;
    s.far = r * 6;
    s.updateProjectionMatrix();
    sun.position.set(-r * 1.1, r * 2.2, r * 0.7);
    sun.castShadow = rise >= 1.6; // no shadows while buildings are still growing
    renderer.shadowMap.needsUpdate = true;
    rise = reducedMotion ? 10 : 0;
    riseStart = performance.now();
    resize();
    renderOnce();
  }

  function setPins(list) {
    pinLayer.replaceChildren();
    pins = list.map((p) => {
      const el = document.createElement('a');
      el.className = 'city-pin';
      el.href = p.href;
      el.tabIndex = -1;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `<span class="city-pin__dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span><span class="city-pin__label"><strong></strong><span></span></span>`;
      el.querySelector('strong').textContent = p.price;
      el.querySelector('.city-pin__label > span').textContent = p.label;
      pinLayer.append(el);
      return { ...p, el, v: new Vector3() };
    });
    placePins(performance.now() / 1000);
  }

  function placePins(t) {
    world.updateMatrixWorld();
    for (const [i, p] of pins.entries()) {
      const bob = reducedMotion ? 0 : Math.sin(t * 1.6 + i) * 1.2;
      p.v.set(p.x, p.y + bob, p.z).applyMatrix4(world.matrixWorld).project(camera);
      const x = (p.v.x * 0.5 + 0.5) * width;
      const y = (-p.v.y * 0.5 + 0.5) * height;
      p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      p.el.style.opacity = rise >= 1.2 ? '1' : '0';
      p.el.style.zIndex = String(Math.round((1 - p.v.z) * 1000));
    }
  }

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    // Fit the turning slab (diameter 2R) and the tallest building.
    const needW = radius * 1.16;
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
    const d = radius * 4;
    camera.position.set(
      Math.cos(AZIMUTH) * Math.cos(ELEVATION) * d,
      Math.sin(ELEVATION) * d + maxHeight * 0.18,
      Math.sin(AZIMUTH) * Math.cos(ELEVATION) * d,
    );
    camera.lookAt(0, maxHeight * 0.18, 0);
    camera.updateProjectionMatrix();
    renderOnce();
  }

  function renderOnce() {
    world.rotation.y = angle;
    uniforms.uRise.value = rise;
    renderer.render(scene, camera);
    placePins(performance.now() / 1000);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) {
      // ease back to the idle spin after a flick
      velocity += ((reducedMotion ? 0 : SPIN) - velocity) * Math.min(1, dt * 1.5);
      angle += velocity * dt;
    }
    if (rise < 1.6) {
      // Wall-clock based, so the intro takes the same time on slow devices.
      rise = Math.min(1.6, ((now - riseStart) / 1000 / RISE_SECONDS) * 1.6);
      if (rise >= 1.6) {
        sun.castShadow = true;
        renderer.shadowMap.needsUpdate = true;
      }
    }
    renderOnce();
    if (running && visible && (!reducedMotion || dragging || Math.abs(velocity) > 0.001)) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && running && visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  // ---- drag to rotate (horizontal only, so vertical page scroll still works) ----
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastMoveT = performance.now();
    canvas.setPointerCapture(e.pointerId);
    container.classList.add('is-dragging');
    kick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const da = (dx / width) * Math.PI * 1.2;
    angle += da;
    velocity = da / Math.max(0.016, (now - lastMoveT) / 1000);
    lastX = e.clientX;
    lastMoveT = now;
    renderOnce();
  });
  const end = () => {
    dragging = false;
    container.classList.remove('is-dragging');
    kick();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // ---- pause when off-screen or in a background tab ----
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
      kick();
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mesh?.geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
      pinLayer.remove();
    },
  };
}
