import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  OctahedronGeometry,
  Plane,
  Raycaster,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import type { Label, Observation, VideoId } from '../types';
import {
  addStageLights,
  createStage,
  fitDistance,
  h,
  hashString,
  mulberry32,
  webglAvailable,
} from './util';
import type { SceneHandle } from './util';

export interface GalaxyHandle extends SceneHandle {
  addOrb(o: Observation): void;
}

const VIDEO_COLORS: Record<VideoId, string> = { simon: '#2B6672', sarah: '#B5527A', stacey: '#C48A1F' };
const VIDEO_NAMES: Record<VideoId, string> = { simon: 'Simon', sarah: 'Sarah', stacey: 'Stacey' };
const VIDEO_ORDER: VideoId[] = ['simon', 'sarah', 'stacey'];
const LABEL_NAMES: Record<Label, string> = { O: 'observed', R: 'reported', I: 'interpretation' };
const LABEL_GLYPH: Record<Label, string> = { O: '●', R: '■', I: '◆' };

/** Region centres in world units (xy). */
const REGION: Record<VideoId, [number, number]> = {
  simon: [-3.3, 1.5],
  sarah: [3.3, 1.5],
  stacey: [0, -1.6],
};
const BOUND_X = 5.7;
const BOUND_Y = 3.4;
const MIN_SEP = 0.98;

function describe(o: Observation): string {
  return `${o.id} (${o.label}, ${LABEL_NAMES[o.label]})`;
}

// ---------------------------------------------------------------------------
// 2D fallback: chips grouped by video
// ---------------------------------------------------------------------------
function mountGalaxyFallback(
  el: HTMLElement,
  observations: Observation[],
  opts: { onSelect(o: Observation): void },
): GalaxyHandle {
  el.textContent = '';
  const root = h('div', {
    style: 'display:flex;flex-direction:column;gap:12px;',
    attrs: { role: 'group', 'aria-label': 'Observations grouped by video. Select a chip to inspect it.' },
  });
  const lists = new Map<VideoId, HTMLElement>();
  const chips = new Map<string, HTMLButtonElement>();
  const seen = new Set<string>();
  let selected: string | null = null;

  for (const v of VIDEO_ORDER) {
    const list = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;' });
    lists.set(v, list);
    const head = h(
      'div',
      { style: 'display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:6px;' },
      [
        h('span', {
          style: `width:12px;height:12px;border-radius:3px;background:${VIDEO_COLORS[v]};display:inline-block;`,
          attrs: { 'aria-hidden': 'true' },
        }),
        h('span', { text: VIDEO_NAMES[v] }),
      ],
    );
    root.append(h('div', {}, [head, list]));
  }
  root.append(
    h('div', {
      style: 'font-size:.8rem;opacity:.75;',
      text: 'Shapes: ● observed (O), ■ reported (R), ◆ interpretation (I).',
    }),
  );

  const paint = (btn: HTMLButtonElement, o: Observation, on: boolean) => {
    const c = VIDEO_COLORS[o.video];
    btn.style.background = on ? c : `color-mix(in srgb, ${c} 16%, transparent)`;
    btn.style.color = on ? '#fff' : 'inherit';
    btn.setAttribute('aria-pressed', String(on));
  };
  const add = (o: Observation) => {
    if (seen.has(o.id)) return;
    seen.add(o.id);
    const c = VIDEO_COLORS[o.video];
    const btn = h(
      'button',
      {
        style:
          `border:1.5px solid ${c};border-radius:999px;padding:6px 12px;min-height:36px;font:inherit;` +
          'font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;',
        attrs: { type: 'button', title: `${describe(o)}: ${o.excerpt}` },
      },
      [
        h('span', { text: LABEL_GLYPH[o.label], attrs: { 'aria-hidden': 'true' } }),
        h('span', { text: o.id }),
        h('span', { style: 'opacity:.7;', text: o.label }),
      ],
    );
    paint(btn, o, false);
    btn.addEventListener('click', () => {
      if (selected) {
        const prev = chips.get(selected);
        const prevObs = observationsById.get(selected);
        if (prev && prevObs) paint(prev, prevObs, false);
      }
      selected = o.id;
      paint(btn, o, true);
      opts.onSelect(o);
    });
    chips.set(o.id, btn);
    observationsById.set(o.id, o);
    lists.get(o.video)?.append(btn);
  };
  const observationsById = new Map<string, Observation>();
  observations.forEach(add);
  el.append(root);

  return {
    addOrb: add,
    dispose() {
      chips.clear();
      lists.clear();
      root.remove();
      el.textContent = '';
    },
  };
}

// ---------------------------------------------------------------------------
// 3D scene
// ---------------------------------------------------------------------------
interface Orb {
  o: Observation;
  mesh: Mesh;
  /** Resting position (no drift). */
  base: Vector3;
  phase: [number, number, number];
  speed: [number, number, number];
  driftK: number;
  s: number;
  spawn: number;
  settle: number;
  spin: number;
}

export function mountGalaxy(
  el: HTMLElement,
  observations: Observation[],
  opts: { onSelect(o: Observation): void },
): GalaxyHandle {
  el.textContent = '';
  if (!webglAvailable()) return mountGalaxyFallback(el, observations, opts);
  const stage = createStage(el, {
    fov: 42,
    minHeight: 320,
    aspect: '4 / 3',
    label: `Observation galaxy: ${observations.length} orbs colored by video and shaped by label. Drag orbs to cluster them.`,
  });
  if (!stage) return mountGalaxyFallback(el, observations, opts);

  const { scene, camera, canvas, overlay } = stage;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'default';
  addStageLights(scene);

  // Shared geometries and materials (disposed through the scene graph / track()).
  const geoms: Record<Label, BufferGeometry> = {
    O: new SphereGeometry(0.38, 28, 20),
    R: new BoxGeometry(0.62, 0.62, 0.62),
    I: new OctahedronGeometry(0.47, 0),
  };
  const mats = {} as Record<VideoId, MeshStandardMaterial>;
  const matsSel = {} as Record<VideoId, MeshStandardMaterial>;
  for (const v of VIDEO_ORDER) {
    const col = new Color(VIDEO_COLORS[v]);
    mats[v] = stage.track(
      new MeshStandardMaterial({ color: col, roughness: 0.42, metalness: 0.08, emissive: col, emissiveIntensity: 0.12 }),
    );
    matsSel[v] = stage.track(
      new MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.08, emissive: col, emissiveIntensity: 0.85 }),
    );
  }
  for (const g of Object.values(geoms)) stage.track(g);

  // ---- overlay: legend + tooltip ----
  const legend = h('div', {
    style:
      'position:absolute;left:8px;bottom:8px;display:flex;flex-wrap:wrap;gap:4px 12px;max-width:calc(100% - 16px);' +
      'padding:6px 10px;border-radius:10px;font-size:.75rem;line-height:1.3;background:rgba(127,127,127,.14);' +
      '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);',
  });
  for (const v of VIDEO_ORDER) {
    legend.append(
      h('span', { style: 'display:inline-flex;align-items:center;gap:5px;' }, [
        h('span', {
          style: `width:10px;height:10px;border-radius:50%;background:${VIDEO_COLORS[v]};display:inline-block;`,
        }),
        VIDEO_NAMES[v],
      ]),
    );
  }
  legend.append(
    h('span', { style: 'opacity:.85;', text: `${LABEL_GLYPH.O} O  ${LABEL_GLYPH.R} R  ${LABEL_GLYPH.I} I` }),
  );
  const tip = h('div', {
    style:
      'position:absolute;left:0;top:0;display:none;padding:4px 8px;border-radius:6px;font-size:.75rem;white-space:nowrap;' +
      'background:rgba(30,30,30,.9);color:#fff;transform:translate(-50%,-135%);box-shadow:0 2px 8px rgba(0,0,0,.25);',
  });
  overlay.append(legend, tip);

  // Selection ring in the page's text colour so it reads on light and dark pages.
  let ringColor = '#444444';
  try {
    ringColor = getComputedStyle(el).color || ringColor;
  } catch {
    /* keep default */
  }
  const selRing = stage.track(new MeshBasicMaterial({ color: new Color(ringColor), transparent: true, opacity: 0.9, depthTest: false }));
  const selMesh = new Mesh(stage.track(new RingGeometry(0.62, 0.7, 40)), selRing);
  selMesh.visible = false;
  selMesh.renderOrder = 10;
  scene.add(selMesh);

  // ---- orbs ----
  const orbs: Orb[] = [];
  const byMesh = new Map<Mesh, Orb>();
  const byId = new Set<string>();
  let selected: Orb | null = null;
  let hovered: Orb | null = null;
  let dragging: Orb | null = null;

  const clampBase = (p: Vector3) => {
    p.x = Math.max(-BOUND_X, Math.min(BOUND_X, p.x));
    p.y = Math.max(-BOUND_Y, Math.min(BOUND_Y, p.y));
  };

  const makeOrb = (o: Observation, pos: Vector3, spawnAnim: boolean): Orb => {
    const mesh = new Mesh(geoms[o.label], mats[o.video]);
    mesh.position.copy(pos);
    const rng = mulberry32(hashString(o.id) ^ 0x9e3779b9);
    const orb: Orb = {
      o,
      mesh,
      base: pos.clone(),
      phase: [rng() * 6.28, rng() * 6.28, rng() * 6.28],
      speed: [0.25 + rng() * 0.25, 0.22 + rng() * 0.25, 0.2 + rng() * 0.2],
      driftK: 1,
      s: 1,
      spawn: spawnAnim && !stage.reduced ? 0 : 1,
      settle: 0,
      spin: (rng() - 0.5) * 0.6,
    };
    mesh.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    if (orb.spawn < 1) mesh.scale.setScalar(0.0001);
    scene.add(mesh);
    orbs.push(orb);
    byMesh.set(mesh, orb);
    byId.add(o.id);
    return orb;
  };

  // Seeded layout: phyllotaxis spiral per video region, then a deterministic relaxation pass.
  const counts: Record<VideoId, number> = { simon: 0, sarah: 0, stacey: 0 };
  for (const o of observations) counts[o.video]++;
  const placed: Record<VideoId, number> = { simon: 0, sarah: 0, stacey: 0 };
  for (const o of observations) {
    if (byId.has(o.id)) continue;
    const v = o.video;
    const n = Math.max(counts[v], 6);
    const k = placed[v]++;
    const rng = mulberry32(hashString(`${v}:${o.id}`));
    const R = Math.max(1.5, Math.min(2.3, 0.55 * Math.sqrt(n)));
    const r = R * Math.sqrt((k + 0.5) / n);
    const a = k * 2.399963 + rng() * 0.5;
    const [cx, cy] = REGION[v];
    const pos = new Vector3(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 0.9, (rng() - 0.5) * 1.6);
    clampBase(pos);
    makeOrb(o, pos, false);
  }
  const relaxAll = (iterations: number) => {
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const a = orbs[i].base;
          const b = orbs[j].base;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          if (d < MIN_SEP) {
            const push = ((MIN_SEP - d) / 2) * 0.6;
            const ux = dx / d;
            const uy = dy / d;
            a.x -= ux * push;
            a.y -= uy * push;
            b.x += ux * push;
            b.y += uy * push;
          }
        }
      }
      for (const orb of orbs) clampBase(orb.base);
    }
    for (const orb of orbs) orb.mesh.position.copy(orb.base);
  };
  relaxAll(40);

  // Soft magnetism for a freshly dropped orb: gentle pull toward its neighbours, never overlapping them.
  const magnetStep = (orb: Orb, dt: number, strength: number) => {
    let cx = 0;
    let cy = 0;
    let wsum = 0;
    for (const other of orbs) {
      if (other === orb) continue;
      const dx = other.base.x - orb.base.x;
      const dy = other.base.y - orb.base.y;
      const d = Math.hypot(dx, dy) || 0.001;
      if (d < 2.6) {
        const wt = 1 - d / 2.6;
        cx += other.base.x * wt;
        cy += other.base.y * wt;
        wsum += wt;
      }
      if (d < MIN_SEP) {
        const push = (MIN_SEP - d) * Math.min(1, dt * 8);
        orb.base.x -= (dx / d) * push * 0.75;
        orb.base.y -= (dy / d) * push * 0.75;
        other.base.x += (dx / d) * push * 0.25;
        other.base.y += (dy / d) * push * 0.25;
      }
    }
    if (wsum > 0) {
      const tx = cx / wsum;
      const ty = cy / wsum;
      const dx = tx - orb.base.x;
      const dy = ty - orb.base.y;
      const d = Math.hypot(dx, dy);
      if (d > MIN_SEP * 1.05) {
        const step = Math.min(d - MIN_SEP, 0.35 * strength * dt * Math.min(1, wsum));
        orb.base.x += (dx / d) * step;
        orb.base.y += (dy / d) * step;
      }
    }
    clampBase(orb.base);
  };

  // ---- selection / hover ----
  const applySelection = () => {
    for (const orb of orbs) orb.mesh.material = (orb === selected ? matsSel : mats)[orb.o.video];
  };
  const showTip = (orb: Orb | null) => {
    if (!orb) {
      tip.style.display = 'none';
      return;
    }
    tip.textContent = `${orb.o.id} · ${orb.o.label} (${LABEL_NAMES[orb.o.label]})`;
    tip.style.display = 'block';
  };
  const placeTip = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    const x = Math.max(40, Math.min(r.width - 40, clientX - r.left));
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(24, clientY - r.top - 14)}px`;
  };

  // ---- picking ----
  const ray = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane();
  const hit = new Vector3();
  const dirv = new Vector3();
  const setRay = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const pick = (clientX: number, clientY: number): Orb | null => {
    setRay(clientX, clientY);
    const hits = ray.intersectObjects(
      orbs.map((o) => o.mesh),
      false,
    );
    return hits.length ? (byMesh.get(hits[0].object as Mesh) ?? null) : null;
  };

  let startX = 0;
  let startY = 0;
  let moved = false;
  const grab = new Vector3();

  stage.listen(canvas, 'pointerdown', (e) => {
    const orb = pick(e.clientX, e.clientY);
    if (!orb) return;
    dragging = orb;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    camera.getWorldDirection(dirv);
    plane.setFromNormalAndCoplanarPoint(dirv, orb.mesh.position);
    setRay(e.clientX, e.clientY);
    if (ray.ray.intersectPlane(plane, hit)) grab.copy(orb.mesh.position).sub(hit);
    else grab.set(0, 0, 0);
    showTip(orb);
    placeTip(e.clientX, e.clientY);
    stage.invalidate();
  });

  stage.listen(canvas, 'pointermove', (e) => {
    if (dragging) {
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > 5) {
        moved = true;
        canvas.style.cursor = 'grabbing';
      }
      if (moved) {
        setRay(e.clientX, e.clientY);
        if (ray.ray.intersectPlane(plane, hit)) {
          dragging.base.copy(hit).add(grab);
          clampBase(dragging.base);
          dragging.mesh.position.x = dragging.base.x;
          dragging.mesh.position.y = dragging.base.y;
          dragging.mesh.position.z = dragging.base.z;
        }
        placeTip(e.clientX, e.clientY);
        stage.invalidate();
      }
      return;
    }
    if (e.pointerType === 'touch') return;
    const orb = pick(e.clientX, e.clientY);
    if (orb !== hovered) {
      hovered = orb;
      canvas.style.cursor = orb ? 'grab' : 'default';
      showTip(orb);
      stage.invalidate();
    }
    if (orb) placeTip(e.clientX, e.clientY);
  });

  const endDrag = (e: PointerEvent, cancelled: boolean) => {
    if (!dragging) return;
    const orb = dragging;
    dragging = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = hovered ? 'grab' : 'default';
    if (moved) {
      if (stage.reduced) {
        for (let i = 0; i < 40; i++) magnetStep(orb, 0.05, 1);
        orb.mesh.position.copy(orb.base);
      } else {
        orb.settle = 1.4;
      }
    } else if (!cancelled) {
      selected = orb;
      applySelection();
      opts.onSelect(orb.o);
    }
    if (e.pointerType === 'touch' || !hovered) {
      // Keep the tooltip for a tapped orb only while it is hovered or selected.
      showTip(e.pointerType === 'touch' ? orb : hovered);
    }
    stage.invalidate();
  };
  stage.listen(canvas, 'pointerup', (e) => endDrag(e, false));
  stage.listen(canvas, 'pointercancel', (e) => endDrag(e, true));
  stage.listen(canvas, 'pointerleave', () => {
    if (dragging) return;
    hovered = null;
    showTip(null);
    canvas.style.cursor = 'default';
    stage.invalidate();
  });

  // ---- camera framing ----
  stage.onResize(() => {
    camera.position.set(0, 0, fitDistance(camera, 6.2, 4.2));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  });

  // ---- frame update ----
  const easeOutBack = (x: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };

  stage.onUpdate((dt, time) => {
    let active = false;
    for (const orb of orbs) {
      const isDrag = orb === dragging;
      if (orb.settle > 0) {
        orb.settle = Math.max(0, orb.settle - dt);
        magnetStep(orb, dt, orb.settle / 1.4);
        active = true;
      }
      const wantDrift = stage.reduced || isDrag || orb.settle > 0.9 ? 0 : 1;
      orb.driftK = stage.damp(orb.driftK, wantDrift, 3, dt);
      const dk = stage.reduced ? 0 : orb.driftK;
      const m = orb.mesh;
      if (!isDrag) {
        m.position.set(
          orb.base.x + Math.sin(time * orb.speed[0] + orb.phase[0]) * 0.1 * dk,
          orb.base.y + Math.cos(time * orb.speed[1] + orb.phase[1]) * 0.1 * dk,
          orb.base.z + Math.sin(time * orb.speed[2] + orb.phase[2]) * 0.14 * dk,
        );
      }
      const target = isDrag ? 1.28 : orb === selected ? 1.3 : orb === hovered ? 1.14 : 1;
      orb.s = stage.damp(orb.s, target, 12, dt);
      if (Math.abs(orb.s - target) > 0.002) active = true;
      if (orb.spawn < 1) {
        orb.spawn = Math.min(1, orb.spawn + dt / 0.7);
        active = true;
      }
      const sp = orb.spawn >= 1 ? 1 : Math.max(0.0001, easeOutBack(orb.spawn));
      m.scale.setScalar(orb.s * sp);
      if (!stage.reduced) m.rotation.y += orb.spin * dt;
    }
    selMesh.visible = !!selected;
    if (selected) {
      selMesh.position.copy(selected.mesh.position);
      selMesh.quaternion.copy(camera.quaternion);
      selMesh.scale.setScalar(selected.mesh.scale.x * 1.15);
    }
    return active;
  });

  const makeHandle: GalaxyHandle = {
    addOrb(o) {
      if (byId.has(o.id)) return;
      // Pick the freest of several seeded candidates near this video's region.
      const rng = mulberry32(hashString(`add:${o.id}`));
      const [cx, cy] = REGION[o.video];
      let best = new Vector3(cx, cy, 0);
      let bestD = -1;
      for (let i = 0; i < 24; i++) {
        const a = rng() * Math.PI * 2;
        const r = 0.4 + rng() * 2.4;
        const c = new Vector3(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 0.9, (rng() - 0.5) * 1.4);
        clampBase(c);
        let md = Infinity;
        for (const orb of orbs) md = Math.min(md, Math.hypot(orb.base.x - c.x, orb.base.y - c.y));
        if (md > bestD) {
          bestD = md;
          best = c;
        }
      }
      const orb = makeOrb(o, best, true);
      if (stage.reduced) {
        orb.s = 1;
        orb.mesh.scale.setScalar(1);
      }
      canvas.setAttribute(
        'aria-label',
        `Observation galaxy: ${orbs.length} orbs colored by video and shaped by label. Drag orbs to cluster them.`,
      );
      stage.invalidate();
    },
    dispose() {
      stage.dispose();
      el.textContent = '';
    },
  };
  canvas.setAttribute(
    'aria-label',
    `Observation galaxy: ${orbs.length} orbs colored by video and shaped by label. Drag orbs to cluster them.`,
  );
  stage.invalidate();
  return makeHandle;
}
