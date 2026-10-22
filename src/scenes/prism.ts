import {
  Color,
  CylinderGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { addStageLights, createStage, fitDistance, h, webglAvailable } from './util';
import type { SceneHandle } from './util';

export interface PrismHandle extends SceneHandle {
  /** index into the lens list, or -1 for "no lens" (white light) */
  setLens(i: number): void;
}

const PRISM_R = 1.6;
// Entry point on the left face, exit point on the right face (prism centred at the origin, apex up).
const ENTRY = new Vector3(-0.433 * PRISM_R, 0.25 * PRISM_R, 0);
const EXIT = new Vector3(0.52 * PRISM_R, 0.02 * PRISM_R, 0);
const BEAM_END_X = 6.2;

function fanAngles(n: number): number[] {
  const step = n > 1 ? Math.min(0.2, 0.62 / (n - 1)) : 0;
  return Array.from({ length: n }, (_, i) => -0.2 + (i - (n - 1) / 2) * -step);
}

function mountPrismFallback(el: HTMLElement, lensColors: string[]): PrismHandle {
  el.textContent = '';
  const row = h('div', {
    style: 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;',
    attrs: { role: 'img', 'aria-label': `Lens prism: white light and ${lensColors.length} lens colors` },
  });
  const sw: HTMLElement[] = [];
  const mk = (bg: string, label: string, border: string) => {
    const s = h('span', {
      style:
        `display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:44px;padding:0 10px;` +
        `border-radius:10px;border:2px solid ${border};background:${bg};font-size:.8rem;font-weight:600;` +
        'color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.45);transition:opacity .3s ease,transform .3s ease;',
      text: label,
    });
    sw.push(s);
    row.append(s);
  };
  mk('#ffffff', 'White', 'rgba(127,127,127,.6)');
  sw[0].style.color = '#333';
  sw[0].style.textShadow = 'none';
  lensColors.forEach((c, i) => mk(c, `Lens ${i + 1}`, c));
  el.append(row);

  const set = (i: number) => {
    sw.forEach((s, k) => {
      const lens = k - 1;
      const on = k === 0 ? true : i === lens;
      s.style.opacity = k === 0 ? (i < 0 ? '1' : '0.7') : i < 0 ? '0.45' : on ? '1' : '0.45';
      s.style.transform = k > 0 && on && i >= 0 ? 'scale(1.08)' : 'none';
    });
  };
  set(-1);
  return {
    setLens: set,
    dispose() {
      row.remove();
      el.textContent = '';
    },
  };
}

export function mountPrism(el: HTMLElement, lensColors: string[]): PrismHandle {
  el.textContent = '';
  if (!webglAvailable()) return mountPrismFallback(el, lensColors);
  const stage = createStage(el, {
    fov: 34,
    minHeight: 240,
    aspect: '16 / 9',
    label: `Lens prism: white light enters a prism and splits into ${lensColors.length} colored beams, one per lens.`,
  });
  if (!stage) return mountPrismFallback(el, lensColors);

  const { scene, camera } = stage;
  addStageLights(scene);

  // Prism body: triangular cross-section in xy, depth along z, apex up.
  const prismGeo = new CylinderGeometry(PRISM_R, PRISM_R, 1.5, 3);
  prismGeo.rotateX(-Math.PI / 2);
  const prismMat = new MeshStandardMaterial({
    color: new Color('#9fb4c4'),
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    flatShading: true,
    depthWrite: false,
  });
  const prism = new Mesh(prismGeo, prismMat);
  const prismEdges = new LineSegments(
    new EdgesGeometry(prismGeo),
    new LineBasicMaterial({ color: '#7d8f9c', transparent: true, opacity: 0.9 }),
  );
  prism.add(prismEdges);
  scene.add(prism);

  // Beams are thin cylinders stretched between two points.
  const up = new Vector3(0, 1, 0);
  const dir = new Vector3();
  const mid = new Vector3();
  const place = (mesh: Object3D, a: Vector3, b: Vector3, radius: number) => {
    dir.copy(b).sub(a);
    const len = dir.length();
    mid.copy(a).add(b).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(up, dir.normalize());
    mesh.scale.set(radius, len, radius);
  };
  const unit = new CylinderGeometry(1, 1, 1, 12, 1, true);
  stage.track(unit);

  const beam = (color: string, a: Vector3, b: Vector3, r: number, opacity: number) => {
    const mat = new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const m = new Mesh(unit, mat);
    place(m, a, b, r);
    scene.add(m);
    return { m, mat, a, b, r };
  };

  const whiteIn = new Vector3(-BEAM_END_X, ENTRY.y, 0);
  const inHalo = beam('#8fa0b0', whiteIn, ENTRY, 0.17, 0.35);
  const inCore = beam('#ffffff', whiteIn, ENTRY, 0.075, 1);
  const inside = beam('#ffffff', ENTRY, EXIT, 0.06, 0.55);

  const angles = fanAngles(lensColors.length);
  interface Out {
    core: ReturnType<typeof beam>;
    glow: ReturnType<typeof beam>;
    k: number;
  }
  const outs: Out[] = lensColors.map((c, i) => {
    const th = angles[i];
    const end = new Vector3(BEAM_END_X, EXIT.y + Math.tan(th) * (BEAM_END_X - EXIT.x), 0);
    return {
      core: beam(c, EXIT, end, 0.075, 0.15),
      glow: beam(c, EXIT, end, 0.2, 0),
      k: 0,
    };
  });

  let lens = -1;
  let whiteK = 1;

  stage.onResize(() => {
    camera.position.set(0, 0, fitDistance(camera, 6.6, 3.7));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  });

  stage.onUpdate((dt, time) => {
    let active = false;
    for (let i = 0; i < outs.length; i++) {
      const o = outs[i];
      const target = lens === i ? 1 : 0;
      o.k = stage.damp(o.k, target, 8, dt);
      if (Math.abs(o.k - target) > 0.004) active = true;
      const dim = lens < 0 ? 0.22 : 0.16;
      o.core.mat.opacity = dim + (1 - dim) * o.k;
      o.glow.mat.opacity = 0.34 * o.k;
      o.core.m.scale.x = o.core.m.scale.z = o.core.r * (1 + 0.5 * o.k);
    }
    const wt = lens < 0 ? 1 : 0.8;
    whiteK = stage.damp(whiteK, wt, 8, dt);
    if (Math.abs(whiteK - wt) > 0.004) active = true;
    inCore.mat.opacity = whiteK;
    inside.mat.opacity = 0.55 * whiteK;
    inHalo.mat.opacity = 0.35 * whiteK;
    if (!stage.reduced) {
      prism.rotation.y = Math.sin(time * 0.35) * 0.5;
      prism.rotation.x = Math.sin(time * 0.23 + 1) * 0.08;
    }
    return active;
  });

  return {
    setLens(i) {
      lens = i >= 0 && i < outs.length ? i : -1;
      stage.invalidate();
    },
    dispose() {
      stage.dispose();
      el.textContent = '';
    },
  };
}
