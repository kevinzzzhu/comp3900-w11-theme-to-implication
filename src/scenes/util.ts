import {
  AmbientLight,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material, Object3D } from 'three';

let webglCache: boolean | null = null;

/** True when a WebGL context can be created. The probe context is released straight away and the answer cached. */
export function webglAvailable(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;
    webglCache = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Every scene returns this. dispose() must free GPU resources and listeners. */
export interface SceneHandle {
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Small helpers shared by the scenes
// ---------------------------------------------------------------------------

/** Read a CSS custom property from :root, falling back when unset or SSR. */
export function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

export const ACCENT_FALLBACK = '#A47551';
export function accentColor(): Color {
  const c = new Color();
  try {
    c.set(cssVar('--accent', ACCENT_FALLBACK));
  } catch {
    c.set(ACCENT_FALLBACK);
  }
  return c;
}

export interface HOpts {
  style?: string;
  attrs?: Record<string, string>;
  text?: string;
  cls?: string;
}
/** Tiny DOM builder. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: HOpts = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (opts.style) e.style.cssText = opts.style;
  if (opts.cls) e.className = opts.cls;
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) e.setAttribute(k, v);
  if (opts.text !== undefined) e.textContent = opts.text;
  for (const c of children) e.append(c);
  return e;
}

/** Frame-rate independent smoothing: moves cur toward target. lambda ~ 4 (slow) to 14 (snappy). */
export function dampValue(cur: number, target: number, lambda: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-lambda * dt));
}

export function hashString(s: string): number {
  let hsh = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hsh ^= s.charCodeAt(i);
    hsh = Math.imul(hsh, 16777619);
  }
  return hsh >>> 0;
}

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from a camera looking down -z so that a half-width x half-height box fits. */
export function fitDistance(camera: PerspectiveCamera, halfW: number, halfH: number): number {
  const t = Math.tan((camera.fov * Math.PI) / 360);
  return Math.max(halfH / t, halfW / (t * camera.aspect));
}

const _v = new Vector3();
/** Project a world point to CSS pixels inside a w x h canvas. */
export function projectToPx(
  p: Vector3,
  camera: PerspectiveCamera,
  w: number,
  h: number,
): { x: number; y: number; visible: boolean } {
  _v.copy(p).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * w, y: (-_v.y * 0.5 + 0.5) * h, visible: _v.z < 1 };
}

export function addStageLights(scene: Scene): void {
  scene.add(new AmbientLight(0xffffff, 1.5));
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new DirectionalLight(0xc8d8ff, 0.9);
  rim.position.set(-4, -2, 3);
  scene.add(rim);
}

function disposeObject(root: Object3D): void {
  root.traverse((obj) => {
    const o = obj as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) m.dispose();
  });
}

// ---------------------------------------------------------------------------
// Stage: renderer, scene, camera, loop, resize, visibility, disposal
// ---------------------------------------------------------------------------

export interface StageOptions {
  fov?: number;
  /** Fallback height when the host element has no explicit height. */
  minHeight?: number;
  /** CSS aspect-ratio used when the host has no explicit height, e.g. '4 / 3'. */
  aspect?: string;
  /** What the canvas is, for assistive technology. */
  label: string;
}

export interface Stage {
  readonly root: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;
  /** pointer-events: none layer for DOM labels and legends, same size as the canvas. */
  readonly overlay: HTMLDivElement;
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly width: number;
  readonly height: number;
  /** True when the user prefers reduced motion: no continuous animation, render on change only. */
  readonly reduced: boolean;
  /** Per-frame callback. Return true to request another frame (needed for reduced-motion settling). */
  onUpdate(fn: (dt: number, time: number) => boolean | void): void;
  onResize(fn: (w: number, h: number) => void): void;
  /** Ask for (at least) one more rendered frame. */
  invalidate(): void;
  /** Damped value that snaps to target when motion is reduced. */
  damp(cur: number, target: number, lambda: number, dt: number): number;
  /** addEventListener whose removal is handled by dispose(). */
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ): void;
  /** Register an extra disposable (materials or geometries not attached to the scene graph). */
  track<T extends { dispose(): void }>(obj: T): T;
  dispose(): void;
}

/**
 * Create a stage inside `el`. Returns null if a renderer cannot be created (caller should show its 2D fallback).
 * One WebGL context per stage; dispose() releases it.
 */
export function createStage(el: HTMLElement, opts: StageOptions): Stage | null {
  const reduced = prefersReducedMotion();

  const root = h('div', {
    style:
      'position:relative;width:100%;height:100%;overflow:hidden;' +
      `min-height:${opts.minHeight ?? 260}px;` +
      (opts.aspect ? `aspect-ratio:${opts.aspect};` : ''),
  });
  const canvas = h('canvas', {
    style: 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;',
    attrs: { role: 'img', 'aria-label': opts.label },
  });
  const overlay = h('div', {
    style: 'position:absolute;inset:0;pointer-events:none;overflow:hidden;user-select:none;-webkit-user-select:none;',
  });
  root.append(canvas, overlay);
  el.append(root);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
  } catch {
    root.remove();
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(opts.fov ?? 40, 1, 0.1, 200);

  const updaters: ((dt: number, time: number) => boolean | void)[] = [];
  const resizers: ((w: number, h: number) => void)[] = [];
  const disposers: (() => void)[] = [];
  const extra: { dispose(): void }[] = [];

  let w = 0;
  let h2 = 0;
  let raf = 0;
  let last = 0;
  let time = 0;
  let dirty = true;
  let visible = true;
  let disposed = false;

  const shouldRun = () => !disposed && visible && !document.hidden && w > 0 && h2 > 0;

  function frame(now: number) {
    raf = 0;
    if (!shouldRun()) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    dirty = false;
    let active = !reduced;
    for (const fn of updaters) if (fn(dt, time) === true) active = true;
    renderer.render(scene, camera);
    if (active || dirty) raf = requestAnimationFrame(frame);
  }
  function schedule() {
    if (raf || !shouldRun()) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const stage: Stage = {
    root,
    canvas,
    overlay,
    renderer,
    scene,
    camera,
    get width() {
      return w;
    },
    get height() {
      return h2;
    },
    reduced,
    onUpdate(fn) {
      updaters.push(fn);
    },
    onResize(fn) {
      resizers.push(fn);
      // Catch up with the size measured before this handler was registered.
      if (w > 0 && h2 > 0) fn(w, h2);
    },
    invalidate() {
      dirty = true;
      schedule();
    },
    damp(cur, target, lambda, dt) {
      return reduced ? target : dampValue(cur, target, lambda, dt);
    },
    listen(target, type, fn, o) {
      target.addEventListener(type, fn as EventListener, o);
      disposers.push(() => target.removeEventListener(type, fn as EventListener, o));
    },
    track(obj) {
      extra.push(obj);
      return obj;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      for (const d of disposers) d();
      disposers.length = 0;
      updaters.length = 0;
      resizers.length = 0;
      disposeObject(scene);
      for (const e of extra) e.dispose();
      extra.length = 0;
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      root.remove();
    },
  };

  const measure = () => {
    const nw = Math.floor(root.clientWidth);
    const nh = Math.floor(root.clientHeight);
    if (nw === w && nh === h2) return;
    w = nw;
    h2 = nh;
    if (w <= 0 || h2 <= 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h2, false);
    camera.aspect = w / h2;
    camera.updateProjectionMatrix();
    for (const fn of resizers) fn(w, h2);
    stage.invalidate();
  };
  const ro = new ResizeObserver(measure);
  ro.observe(root);

  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      visible = e.isIntersecting;
      if (visible) stage.invalidate();
    });
    io.observe(root);
  }
  const onVisibility = () => {
    if (!document.hidden) stage.invalidate();
  };
  document.addEventListener('visibilitychange', onVisibility);

  stage.listen(canvas, 'webglcontextlost' as keyof HTMLElementEventMap, ((e: Event) => e.preventDefault()) as never);
  stage.listen(canvas, 'webglcontextrestored' as keyof HTMLElementEventMap, (() => stage.invalidate()) as never);

  measure();
  return stage;
}
