import {
  Color,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { accentColor, addStageLights, createStage, fitDistance, h, webglAvailable } from './util';
import type { SceneHandle } from './util';

export interface CrystalHandle extends SceneHandle {
  /** lit[i] true => layer i is lit/solid for the shown theme */
  setLit(lit: boolean[]): void;
  /** 'A' renders as a flat slab, 'B' as a tall crystal, 'mine' is neutral */
  setTheme(id: 'A' | 'B' | 'mine'): void;
}

type ThemeId = 'A' | 'B' | 'mine';

/** Per theme target shape for layer i: height factor, width factor, visibility. */
function shapeFor(theme: ThemeId, i: number): { sy: number; sx: number; vis: number } {
  if (theme === 'A') {
    // Flat wide slab: only the first two layers remain, squashed.
    return i < 2 ? { sy: 0.32, sx: 1.75, vis: 1 } : { sy: 0.02, sx: 1.75, vis: 0 };
  }
  if (theme === 'B') return { sy: 1.55, sx: 0.88, vis: 1 };
  return { sy: 1, sx: 1, vis: 1 };
}

const LAYER_H = 0.62;

function makeRows(layers: string[]): { list: HTMLOListElement; rows: HTMLLIElement[]; bars: HTMLElement[] } {
  const list = h('ol', {
    style:
      'list-style:none;margin:0;padding:0;display:flex;flex-direction:column-reverse;justify-content:space-around;' +
      'gap:6px;flex:1 1 160px;min-width:0;',
    attrs: { 'aria-label': 'Quality criteria, bottom layer first' },
  });
  const rows: HTMLLIElement[] = [];
  const bars: HTMLElement[] = [];
  layers.forEach((label, i) => {
    const bar = h('span', {
      style:
        'display:none;height:14px;border-radius:3px;margin-top:3px;border:1.5px dashed currentColor;' +
        'transition:width .35s ease,height .35s ease,background .35s ease,opacity .35s ease;',
      attrs: { 'aria-hidden': 'true' },
    });
    const row = h('li', { style: 'display:block;font-size:.85rem;line-height:1.3;transition:opacity .3s ease;' }, [
      h('span', {
        style:
          'display:inline-flex;align-items:center;justify-content:center;width:1.4em;height:1.4em;border-radius:50%;' +
          'border:1.5px solid currentColor;font-size:.75em;margin-right:.5em;vertical-align:middle;',
        text: String(i + 1),
        attrs: { 'aria-hidden': 'true' },
      }),
      h('span', { text: label, attrs: { 'data-role': 'text' } }),
      h('span', { style: 'position:absolute;left:-9999px;', text: ' (not met)', attrs: { 'data-role': 'sr' } }),
      bar,
    ]);
    rows.push(row);
    bars.push(bar);
    list.append(row);
  });
  return { list, rows, bars };
}

export function mountCrystal(el: HTMLElement, layers: string[]): CrystalHandle {
  el.textContent = '';
  const n = layers.length;
  // The page gives widget stages a fixed height and hides overflow; the crystal sizes itself so nothing is cut off.
  el.style.height = 'auto';
  el.style.overflow = 'visible';
  el.style.background = 'transparent';
  const STAGE_H = 'clamp(340px, 52vh, 460px)';
  const wrap = h('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;align-items:stretch;width:100%;' });
  const host = h('div', {
    style: `flex:1 1 260px;min-width:0;position:relative;height:${STAGE_H};border-radius:10px;overflow:hidden;background:#14110f;`,
  });
  const { list, rows, bars } = makeRows(layers);
  list.style.padding = '10px 0'; // stretches to the tower's height when side by side, wraps below it when narrow
  const score = h('div', {
    style:
      'position:absolute;left:10px;right:10px;bottom:8px;text-align:center;font-size:.85rem;font-weight:600;' +
      'color:#f3eadd;text-shadow:0 1px 2px rgba(0,0,0,.6);pointer-events:none;',
    attrs: { 'aria-hidden': 'true' },
  });
  host.append(score);
  el.append(wrap);

  let lit: boolean[] = new Array(n).fill(false);
  let theme: ThemeId = 'mine';

  const verdict = (met: number): string => (met <= 2 ? 'reads like a topic summary' : met <= 4 ? 'a theme taking shape' : 'a well-developed theme');
  const paintScore = () => {
    const met = lit.filter(Boolean).length;
    score.textContent = theme === 'A' && met === 0 ? `0 of ${n} criteria met` : `${met} of ${n} criteria met: ${verdict(met)}`;
  };
  const paintRows = () => {
    paintScore();
    rows.forEach((row, i) => {
      const on = !!lit[i];
      row.style.opacity = on ? '1' : '0.6';
      row.style.fontWeight = on ? '600' : '400';
      const sr = row.querySelector('[data-role="sr"]');
      if (sr) sr.textContent = on ? ' (met)' : ' (not met)';
    });
  };

  const stage = webglAvailable()
    ? createStage(host, {
        fov: 36,
        minHeight: 300,
        label: `Theme crystal: a tower of ${n} layers, one per quality criterion. Lit layers meet the criterion.`,
      })
    : null;

  // ---------------------------------------------------------------- fallback
  if (!stage) {
    wrap.append(list);
    list.style.flex = '1 1 100%';
    list.style.height = 'auto';
    const accent = '#' + accentColor().getHexString();
    const paintBars = () => {
      bars.forEach((bar, i) => {
        const s = shapeFor(theme, i);
        const on = !!lit[i];
        bar.style.display = 'block';
        const widthPct = 100 * (s.vis === 0 ? 0.3 : Math.min(1, 0.35 + 0.65 * (s.sx / 1.75)));
        bar.style.width = `${widthPct}%`;
        bar.style.height = `${Math.max(6, Math.round(14 * (s.vis === 0 ? 0.4 : Math.min(1.4, s.sy + 0.1))))}px`;
        bar.style.background = on ? accent : 'transparent';
        bar.style.borderStyle = on ? 'solid' : 'dashed';
        bar.style.borderColor = on ? accent : 'currentColor';
        bar.style.opacity = s.vis === 0 ? '0.25' : on ? '1' : '0.6';
      });
    };
    paintBars();
    paintRows();
    return {
      setLit(l) {
        lit = l.slice();
        paintBars();
        paintRows();
      },
      setTheme(id) {
        theme = id;
        paintBars();
        paintRows();
      },
      dispose() {
        wrap.remove();
        el.textContent = '';
      },
    };
  }

  // ---------------------------------------------------------------- 3D
  wrap.append(host, list);
  addStageLights(stage.scene);
  const accent = accentColor();
  const litColor = accent.clone().offsetHSL(0, 0.12, 0.04);
  const ghostColor = new Color('#8b8f96');
  const tower = new Group();
  stage.scene.add(tower);

  interface Layer {
    group: Group;
    solid: Mesh;
    mat: MeshStandardMaterial;
    edges: LineSegments;
    edgeMat: LineBasicMaterial;
    litAmt: number;
    sy: number;
    sx: number;
    vis: number;
  }
  const L: Layer[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const rBottom = 1.05 - 0.4 * t0;
    const rTop = i === n - 1 ? 0.22 : 1.05 - 0.4 * t1;
    const geo = new CylinderGeometry(rTop, rBottom, LAYER_H, 6, 1, false);
    const mat = new MeshStandardMaterial({
      color: ghostColor.clone(),
      roughness: 0.3,
      metalness: 0.12,
      flatShading: true,
      transparent: true,
      opacity: 0.06,
      emissive: litColor.clone(),
      emissiveIntensity: 0,
      depthWrite: false,
    });
    const solid = new Mesh(geo, mat);
    const edgeMat = new LineBasicMaterial({ color: ghostColor.clone(), transparent: true, opacity: 0.4 });
    const edges = new LineSegments(new EdgesGeometry(geo, 1), edgeMat);
    const group = new Group();
    group.add(solid, edges);
    tower.add(group);
    const s = shapeFor(theme, i);
    L.push({ group, solid, mat, edges, edgeMat, litAmt: 0, sy: s.sy, sx: s.sx, vis: s.vis });
  }

  const ghostEdge = new Color('#8b8f96');
  const litEdge = litColor.clone().offsetHSL(0, 0, 0.12);

  const apply = (): void => {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const l = L[i];
      const hgt = LAYER_H * l.sy;
      l.group.scale.set(l.sx, Math.max(l.sy, 0.001), l.sx);
      l.group.position.y = y + hgt / 2;
      y += hgt;
      l.mat.color.copy(ghostColor).lerp(litColor, l.litAmt);
      l.mat.emissiveIntensity = 0.55 * l.litAmt * l.vis;
      l.mat.opacity = (0.06 + 0.88 * l.litAmt) * l.vis;
      l.edgeMat.color.copy(ghostEdge).lerp(litEdge, l.litAmt);
      l.edgeMat.opacity = (0.4 + 0.5 * l.litAmt) * l.vis;
      l.group.visible = l.vis > 0.01;
    }
  };

  const frameCamera = () => {
    const cam = stage.camera;
    const target = 2.65; // slightly below centre so the base clears the score caption
    const dist = fitDistance(cam, 2.4, 3.9);
    cam.position.set(0, target + dist * 0.22, dist * 0.97);
    cam.lookAt(0, target, 0);
    cam.updateMatrixWorld();
  };
  stage.onResize(frameCamera);

  stage.onUpdate((dt) => {
    let active = false;
    for (let i = 0; i < n; i++) {
      const l = L[i];
      const t = shapeFor(theme, i);
      const target = lit[i] ? 1 : 0;
      l.litAmt = stage.damp(l.litAmt, target, 7, dt);
      l.sy = stage.damp(l.sy, t.sy, 5, dt);
      l.sx = stage.damp(l.sx, t.sx, 5, dt);
      l.vis = stage.damp(l.vis, t.vis, 6, dt);
      if (
        Math.abs(l.litAmt - target) > 0.003 ||
        Math.abs(l.sy - t.sy) > 0.003 ||
        Math.abs(l.sx - t.sx) > 0.003 ||
        Math.abs(l.vis - t.vis) > 0.003
      )
        active = true;
    }
    if (!stage.reduced) tower.rotation.y += dt * 0.18;
    apply();
    return active;
  });

  paintRows();
  apply();
  frameCamera();

  return {
    setLit(l) {
      lit = l.slice();
      paintRows();
      stage.invalidate();
    },
    setTheme(id) {
      theme = id;
      paintRows();
      stage.invalidate();
    },
    dispose() {
      stage.dispose();
      wrap.remove();
      el.textContent = '';
    },
  };
}
