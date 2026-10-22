import {
  BackSide,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Segment } from '../types';
import { accentColor, addStageLights, createStage, fitDistance, h, projectToPx, webglAvailable } from './util';
import type { SceneHandle } from './util';

export interface RingHandle extends SceneHandle {
  /** segIndex: active segment; fraction 0..1 elapsed within it; paused dims the ring */
  setState(s: { segIndex: number; fraction: number; paused: boolean }): void;
}

const RING_R = 2.4;
const TUBE_R = 0.3;
const GAP = 0.07; // radians between segments

interface RingState {
  segIndex: number;
  fraction: number;
  paused: boolean;
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}

const PALETTE = ['#A47551', '#6E8F78', '#5B8BA3', '#B5527A', '#C48A1F', '#8573B0', '#4F9A9A', '#B8654A'];
function segmentHue(i: number): string {
  return PALETTE[i % PALETTE.length];
}

function mountRingFallback(el: HTMLElement, segments: Segment[]): RingHandle {
  el.textContent = '';
  const total = segments.reduce((a, s) => a + s.minutes, 0) || 1;
  const bar = h('div', {
    style: 'display:flex;gap:4px;width:100%;transition:opacity .3s ease;',
    attrs: { role: 'progressbar', 'aria-label': 'Session progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
  });
  const cells = segments.map((s, i) => {
    const fill = h('div', { style: `height:100%;width:0%;background:${segmentHue(i)};transition:width .3s linear;` });
    const cell = h(
      'div',
      {
        style:
          `flex:${s.minutes} 1 0;min-width:0;border:1.5px solid rgba(127,127,127,.5);border-radius:8px;overflow:hidden;` +
          'position:relative;height:40px;transition:opacity .3s ease,border-color .3s ease;',
        attrs: { title: `${s.label} (${s.minutes} min)` },
      },
      [
        fill,
        h('span', {
          style:
            'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.75rem;' +
            'font-weight:600;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
            'color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.55);',
          text: s.label,
        }),
      ],
    );
    bar.append(cell);
    return { cell, fill };
  });
  el.append(bar);

  const set = (st: RingState) => {
    const f = clamp01(st.fraction);
    let done = 0;
    cells.forEach((c, i) => {
      const pct = i < st.segIndex ? 100 : i === st.segIndex ? f * 100 : 0;
      c.fill.style.width = `${pct}%`;
      c.cell.style.opacity = i < st.segIndex ? '0.7' : i === st.segIndex ? '1' : '0.5';
      c.cell.style.borderColor = i === st.segIndex ? segmentHue(i) : 'rgba(127,127,127,.5)';
      if (i === st.segIndex) c.cell.setAttribute('aria-current', 'step');
      else c.cell.removeAttribute('aria-current');
      if (i < st.segIndex) done += segments[i].minutes;
    });
    const cur = segments[st.segIndex];
    if (cur && st.segIndex >= 0) done += cur.minutes * f;
    bar.setAttribute('aria-valuenow', String(Math.round((done / total) * 100)));
    bar.setAttribute('aria-valuetext', cur ? `${cur.label}, ${Math.round(f * 100)} percent${st.paused ? ', paused' : ''}` : 'Not started');
    bar.style.opacity = st.paused ? '0.55' : '1';
  };
  set({ segIndex: -1, fraction: 0, paused: false });
  return {
    setState: set,
    dispose() {
      bar.remove();
      el.textContent = '';
    },
  };
}

export function mountRing(el: HTMLElement, segments: Segment[]): RingHandle {
  el.textContent = '';
  if (!webglAvailable() || segments.length === 0) return mountRingFallback(el, segments);
  const stage = createStage(el, {
    fov: 34,
    minHeight: 280,
    aspect: '1 / 1',
    label: `Session ring: ${segments.length} segments sized by minutes. The active segment is raised and a marker sweeps along it.`,
  });
  if (!stage) return mountRingFallback(el, segments);

  const { scene, camera, overlay } = stage;
  addStageLights(scene);
  const accent = accentColor();

  const total = segments.reduce((a, s) => a + s.minutes, 0) || 1;
  const usable = Math.PI * 2 - GAP * segments.length;

  const root = new Group();
  root.rotation.x = -0.8; // tilt toward the viewer
  scene.add(root);
  const spinner = new Group(); // idle sway
  root.add(spinner);

  interface Seg {
    mesh: Mesh;
    mat: MeshStandardMaterial;
    start: number; // clockwise from top, radians
    arc: number;
    color: Color;
    activeColor: Color;
    k: number; // activity 0 future, 1 active
    done: number;
    z: number;
  }
  const segs: Seg[] = [];
  let cursor = 0;
  segments.forEach((s, i) => {
    const arc = Math.max(0.05, (usable * s.minutes) / total);
    const geo = new TorusGeometry(RING_R, TUBE_R, 18, Math.max(6, Math.ceil(arc * 14)), arc);
    const color = new Color(segmentHue(i));
    const activeColor = color.clone().lerp(accent, 0.35).offsetHSL(0, 0.15, 0.03);
    const mat = new MeshStandardMaterial({
      color: color.clone(),
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.15,
      emissive: activeColor.clone(),
      emissiveIntensity: 0,
    });
    const mesh = new Mesh(geo, mat);
    // Torus arcs run counter-clockwise from +x; map our clockwise-from-top layout onto that.
    mesh.rotation.z = Math.PI / 2 - (cursor + arc);
    spinner.add(mesh);
    segs.push({ mesh, mat, start: cursor, arc, color, activeColor, k: 0, done: 0, z: 0 });
    cursor += arc + GAP;
  });

  // Marker: bright bead with a dark halo so it reads on light and dark pages.
  const marker = new Group();
  marker.add(
    new Mesh(new SphereGeometry(TUBE_R * 1.05, 20, 14), new MeshStandardMaterial({
      color: '#fffaf0',
      emissive: '#ffe2b0',
      emissiveIntensity: 0.9,
      roughness: 0.3,
    })),
  );
  marker.add(
    new Mesh(
      new SphereGeometry(TUBE_R * 1.38, 20, 14),
      new MeshBasicMaterial({ color: '#1c1c1c', transparent: true, opacity: 0.22, side: BackSide, depthWrite: false }),
    ),
  );
  spinner.add(marker);

  // Labels.
  const labelEls = segments.map((s) => {
    const d = h(
      'div',
      {
        style:
          'position:absolute;left:0;top:0;font-size:.8rem;line-height:1.2;text-align:center;max-width:7.5em;' +
          'transition:opacity .3s ease;will-change:transform;',
      },
      [
        h('div', { style: 'font-weight:600;', text: s.label }),
        h('div', { style: 'font-size:.72rem;opacity:.7;', text: `${s.minutes} min` }),
      ],
    );
    overlay.append(d);
    return d;
  });

  let state: RingState = { segIndex: -1, fraction: 0, paused: false };
  let dim = 1; // paused dimming (1 normal, 0.45 paused)
  let swayPhase = 0;
  let swayRate = 1;

  const v = new Vector3();
  const layoutLabels = () => {
    root.updateMatrixWorld(true);
    const w = stage.width;
    const hh = stage.height;
    segs.forEach((sg, i) => {
      const a = Math.PI / 2 - (sg.start + sg.arc / 2); // ccw angle of the midpoint
      v.set(Math.cos(a) * (RING_R + 0.95), Math.sin(a) * (RING_R + 0.95), 0);
      spinner.localToWorld(v);
      const p = projectToPx(v, camera, w, hh);
      const el2 = labelEls[i];
      // Keep each label fully inside the canvas, whatever the host width.
      const halfW = el2.offsetWidth / 2 + 4;
      const halfH = el2.offsetHeight / 2 + 4;
      const x = Math.min(Math.max(p.x, halfW), Math.max(halfW, w - halfW));
      const y = Math.min(Math.max(p.y, halfH), Math.max(halfH, hh - halfH));
      el2.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%,-50%)`;
    });
  };
  const paintLabels = () => {
    labelEls.forEach((d, i) => {
      const act = i === state.segIndex;
      d.style.opacity = String((act ? 1 : i < state.segIndex ? 0.75 : 0.6) * (state.paused ? 0.7 : 1));
      (d.firstElementChild as HTMLElement).style.fontWeight = act ? '800' : '600';
    });
  };

  stage.onResize(() => {
    camera.position.set(0, 0, fitDistance(camera, RING_R + 2.3, (RING_R + 1.7) * 0.85));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  });

  stage.onUpdate((dt) => {
    let active = false;
    // Idle sway slows to zero when paused.
    const wantRate = state.paused || stage.reduced ? 0 : 1;
    swayRate = stage.damp(swayRate, wantRate, 3, dt);
    if (swayRate > 0.001) {
      swayPhase += dt * 0.45 * swayRate;
      active = true;
    }
    root.rotation.y = stage.reduced ? 0 : Math.sin(swayPhase) * 0.28;

    const dimTarget = state.paused ? 0.45 : 1;
    dim = stage.damp(dim, dimTarget, 6, dt);
    if (Math.abs(dim - dimTarget) > 0.004) active = true;

    segs.forEach((sg, i) => {
      const isActive = i === state.segIndex;
      const isDone = i < state.segIndex;
      const kT = isActive ? 1 : 0;
      sg.k = stage.damp(sg.k, kT, 8, dt);
      sg.done = stage.damp(sg.done, isDone ? 1 : 0, 8, dt);
      sg.z = stage.damp(sg.z, isActive ? 0.55 : 0, 8, dt);
      if (Math.abs(sg.k - kT) > 0.004 || Math.abs(sg.done - (isDone ? 1 : 0)) > 0.004) active = true;
      sg.mat.opacity = (0.2 + 0.4 * sg.done + 0.4 * sg.k) * (0.4 + 0.6 * dim);
      sg.mat.color.copy(sg.color).lerp(sg.activeColor, sg.k);
      sg.mat.emissiveIntensity = 0.4 * sg.k * dim;
      sg.mesh.position.z = sg.z;
      const s = 1 + 0.12 * sg.k;
      sg.mesh.scale.set(1, 1, s);
    });

    // Marker along the active segment.
    const act = segs[state.segIndex];
    if (act) {
      const a = Math.PI / 2 - (act.start + clamp01(state.fraction) * act.arc);
      marker.position.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, act.z);
      marker.visible = true;
      marker.scale.setScalar(0.85 + 0.15 * dim);
    } else {
      marker.visible = false;
    }
    layoutLabels();
    return active;
  });

  paintLabels();
  stage.invalidate();

  return {
    setState(s) {
      state = { segIndex: Math.round(s.segIndex), fraction: clamp01(s.fraction), paused: !!s.paused };
      if (stage.reduced) {
        dim = state.paused ? 0.45 : 1;
      }
      paintLabels();
      stage.invalidate();
    },
    dispose() {
      stage.dispose();
      el.textContent = '';
    },
  };
}
