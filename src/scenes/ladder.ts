import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { accentColor, addStageLights, createStage, fitDistance, h, projectToPx, webglAvailable } from './util';
import type { SceneHandle } from './util';

export interface LadderHandle extends SceneHandle {
  /** 0 observation, 1 code, 2 theme, 3 implication */
  setRung(i: number): void;
}

const RUNG_GAP = 1.75;
const RAIL_X = 0.95;
const RUNG_COUNT = 4;

function mountLadderFallback(el: HTMLElement, rungLabels: string[]): LadderHandle {
  el.textContent = '';
  const list = h('ol', {
    style: 'list-style:none;margin:0;padding:0;display:flex;flex-direction:column-reverse;gap:8px;',
    attrs: { 'aria-label': 'Implication ladder, bottom step first' },
  });
  const accent = '#' + accentColor().getHexString();
  const items = rungLabels.map((label, i) => {
    const li = h(
      'li',
      {
        style:
          'display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;border:1.5px solid rgba(127,127,127,.4);' +
          'transition:background .3s ease,opacity .3s ease,border-color .3s ease;',
      },
      [
        h('span', {
          style:
            'display:inline-flex;align-items:center;justify-content:center;width:1.7em;height:1.7em;border-radius:50%;' +
            'border:1.5px solid currentColor;font-size:.8rem;flex:none;',
          text: String(i + 1),
          attrs: { 'aria-hidden': 'true' },
        }),
        h('span', { text: label }),
      ],
    );
    list.append(li);
    return li;
  });
  const set = (cur: number) => {
    items.forEach((li, i) => {
      const reached = i <= cur;
      li.style.background = reached ? `color-mix(in srgb, ${accent} ${i === cur ? 30 : 14}%, transparent)` : 'transparent';
      li.style.borderColor = reached ? accent : 'rgba(127,127,127,.4)';
      li.style.opacity = reached ? '1' : '0.6';
      li.style.fontWeight = i === cur ? '700' : '400';
      if (i === cur) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  };
  set(0);
  el.append(list);
  return {
    setRung: (i) => set(Math.max(0, Math.min(RUNG_COUNT - 1, Math.round(i)))),
    dispose() {
      list.remove();
      el.textContent = '';
    },
  };
}

export function mountLadder(el: HTMLElement, rungLabels: string[]): LadderHandle {
  el.textContent = '';
  if (!webglAvailable()) return mountLadderFallback(el, rungLabels);
  const stage = createStage(el, {
    fov: 34,
    minHeight: 300,
    aspect: '4 / 3',
    label: 'Implication ladder: four rungs from observation to implication with a glowing block marking your current rung.',
  });
  if (!stage) return mountLadderFallback(el, rungLabels);

  const { scene, camera, overlay } = stage;
  addStageLights(scene);
  const accent = accentColor();
  const accentHi = accent.clone().offsetHSL(0, 0.1, 0.1);
  const dimColor = new Color('#8a8f98');

  // Rails and rungs.
  const ladder = new Group();
  scene.add(ladder);
  const railTop = (RUNG_COUNT - 1) * RUNG_GAP + 1.1;
  const railBottom = -0.9;
  const railMat = new MeshStandardMaterial({ color: '#9a8f84', roughness: 0.55, metalness: 0.2 });
  const railGeo = new CylinderGeometry(0.09, 0.09, railTop - railBottom, 14);
  for (const sx of [-1, 1]) {
    const r = new Mesh(railGeo, railMat);
    r.position.set(sx * RAIL_X, (railTop + railBottom) / 2, 0);
    ladder.add(r);
  }
  const rungGeo = new CylinderGeometry(0.1, 0.1, RAIL_X * 2, 14);
  rungGeo.rotateZ(Math.PI / 2);
  const rungs: { mesh: Mesh; mat: MeshStandardMaterial; k: number }[] = [];
  for (let i = 0; i < RUNG_COUNT; i++) {
    const mat = new MeshStandardMaterial({
      color: dimColor.clone(),
      roughness: 0.45,
      metalness: 0.15,
      emissive: accentHi.clone(),
      emissiveIntensity: 0,
    });
    const mesh = new Mesh(rungGeo, mat);
    mesh.position.set(0, i * RUNG_GAP, 0);
    ladder.add(mesh);
    rungs.push({ mesh, mat, k: 0 });
  }

  // Glowing block with a soft halo.
  const block = new Group();
  const blockMat = new MeshStandardMaterial({
    color: accent.clone(),
    roughness: 0.3,
    metalness: 0.1,
    emissive: accent.clone(),
    emissiveIntensity: 0.7,
  });
  block.add(new Mesh(new BoxGeometry(1.0, 0.62, 0.8), blockMat));
  const halo = new Mesh(
    new SphereGeometry(0.95, 20, 14),
    new MeshBasicMaterial({ color: accentHi, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  block.add(halo);
  ladder.add(block);

  let rung = 0;
  let y = 0.4;
  let vy = 0;
  const blockY = (i: number) => i * RUNG_GAP + 0.42;
  y = blockY(0);

  // Labels, positioned from projected rung coordinates.
  const labelEls = rungLabels.slice(0, RUNG_COUNT).map((text, i) => {
    const d = h('div', {
      style:
        'position:absolute;left:0;top:0;max-width:60%;font-size:.9rem;line-height:1.25;font-weight:600;' +
        'transition:opacity .3s ease;will-change:transform;',
    });
    d.append(
      h('span', {
        style:
          'display:inline-block;margin-right:.45em;font-size:.72rem;opacity:.7;font-weight:500;',
        text: String(i + 1),
      }),
      text,
    );
    overlay.append(d);
    return d;
  });

  const tmp = new Vector3();
  const layoutLabels = () => {
    const w = stage.width;
    const hh = stage.height;
    labelEls.forEach((d, i) => {
      tmp.set(RAIL_X + 0.35, i * RUNG_GAP, 0);
      const p = projectToPx(tmp, camera, w, hh);
      d.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translateY(-50%)`;
      d.style.maxWidth = `${Math.max(80, w - p.x - 8)}px`;
    });
  };
  const paintLabels = () => {
    labelEls.forEach((d, i) => {
      d.style.opacity = i <= rung ? '1' : '0.55';
    });
  };

  stage.onResize((w, hh) => {
    // Shift the scene so the ladder sits on the left and labels have room on the right.
    const ladderPx = Math.max(64, Math.min(w * 0.3, 150));
    const midY = ((RUNG_COUNT - 1) * RUNG_GAP) / 2;
    camera.position.set(0, midY, fitDistance(camera, 2, 4.0));
    camera.lookAt(0, midY, 0);
    camera.setViewOffset(w, hh, w / 2 - ladderPx, 0, w, hh);
    camera.updateMatrixWorld();
    layoutLabels();
  });

  stage.onUpdate((dt, time) => {
    let active = false;
    const target = blockY(rung);
    if (stage.reduced) {
      y = target;
      vy = 0;
    } else {
      const acc = (target - y) * 60 - vy * 9;
      vy += acc * dt;
      y += vy * dt;
      if (Math.abs(target - y) > 0.002 || Math.abs(vy) > 0.01) active = true;
    }
    block.position.y = y;
    const bob = stage.reduced ? 0 : Math.sin(time * 2.2) * 0.04;
    block.position.y += bob;
    const pulse = stage.reduced ? 0.7 : 0.7 + Math.sin(time * 2.2) * 0.12;
    blockMat.emissiveIntensity = pulse;
    halo.scale.setScalar(stage.reduced ? 1 : 1 + Math.sin(time * 2.2) * 0.05);
    for (let i = 0; i < RUNG_COUNT; i++) {
      const r = rungs[i];
      const t = i <= rung ? 1 : 0;
      r.k = stage.damp(r.k, t, 8, dt);
      if (Math.abs(r.k - t) > 0.004) active = true;
      r.mat.color.copy(dimColor).lerp(accent, r.k);
      r.mat.emissiveIntensity = 0.55 * r.k;
    }
    return active;
  });

  paintLabels();
  stage.invalidate();

  return {
    setRung(i) {
      rung = Math.max(0, Math.min(RUNG_COUNT - 1, Math.round(i)));
      paintLabels();
      stage.invalidate();
    },
    dispose() {
      stage.dispose();
      el.textContent = '';
    },
  };
}
