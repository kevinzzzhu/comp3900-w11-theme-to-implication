import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Plane,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';
import type { Texture } from 'three';
import { createStage, fitDistance, h, hashString, mulberry32, webglAvailable } from './util';
import type { SceneHandle } from './util';

export interface WallNote {
  id: string;
  code: string;
  excerpt: string;
  why: string;
  /** hex like #2B6672 */
  color: string;
  mine: boolean;
}
export type WallPos = [number, number]; // world x, y

export interface WallHandle extends SceneHandle {
  /** Add the note, or update its text/colour if the id exists. A new note is placed at `at` when given, else at a free spot in the staging strip at the bottom of the wall. Returns where a NEW note was placed, undefined for an update. */
  upsert(n: WallNote, at?: WallPos): WallPos | undefined;
  remove(id: string): void;
  /** Move a card to a position chosen elsewhere (a groupmate). Must not fire onMoved. */
  setPosition(id: string, pos: WallPos): void;
  /** Fires once when a dragged card is dropped and has really moved (more than a small threshold), with its final position. */
  onMoved(cb: (id: string, pos: WallPos) => void): void;
  select(id: string | null): void;
  count(): number;
}

// ---------------------------------------------------------------------------
// Geometry of the wall (world units)
// ---------------------------------------------------------------------------
const CARD_W = 1.9;
const CARD_H = 1.15;
const BOUND_X = 6.4;
const BOUND_Y = 3.4;
/** Half extents of the visible wall panel (16:9). */
const PANEL_HW = 7.5;
const PANEL_HH = 4.21875;
/** Cards whose centre is below this sit in the staging strip. */
const STRIP_Y = -2.3;
const ALLOW_OVERLAP = 0.15;
const SLOT_X0 = -6.15;
const SLOT_DX = 2.05;
const SLOT_COLS = 7;
const SLOT_Y0 = -3.4;
const SLOT_DY = 1.2;
const MOVE_EPS = 0.04;
const Z_STEP = 0.012;

const TEX_W = 512;
const TEX_H = 310;
const BAND_H = 34;
const INK = '#1c1917';
const FALLBACK_COLOR = '#A47551';
const DEFAULT_FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const EMPTY_TEXT = 'No codes yet. Add them in Step 1 and they appear here.';
const FALLBACK_NOTE = '3D wall unavailable: cluster using the table below.';

// ---------------------------------------------------------------------------
// Colour and text helpers
// ---------------------------------------------------------------------------
function parseHex(hex: string): [number, number, number] {
  let s = (hex || '').trim().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) s = FALLBACK_COLOR.slice(1);
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function rgb(c: [number, number, number], a = 1): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
}
function mixWhite(c: [number, number, number], t: number): [number, number, number] {
  return [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t];
}
function luminance(c: [number, number, number]): number {
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + hh - r);
  ctx.arcTo(x + w, y + hh, x + w - r, y + hh, r);
  ctx.lineTo(x + r, y + hh);
  ctx.arcTo(x, y + hh, x, y + hh - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Greedy word wrap with character breaking for words wider than the line. Uses the current ctx.font. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ').filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  const pushWord = (word: string) => {
    if (ctx.measureText(word).width <= maxW) {
      cur = word;
      return;
    }
    // Break a very long word by characters.
    let piece = '';
    for (const ch of word) {
      if (ctx.measureText(piece + ch).width > maxW && piece) {
        lines.push(piece);
        piece = ch;
      } else {
        piece += ch;
      }
    }
    cur = piece;
  };
  for (const word of words) {
    if (!cur) {
      pushWord(word);
      continue;
    }
    const trial = `${cur} ${word}`;
    if (ctx.measureText(trial).width <= maxW) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = '';
      pushWord(word);
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Keep at most maxLines lines; if lines were cut, end the last one with an ellipsis that still fits. */
function clampLines(ctx: CanvasRenderingContext2D, lines: string[], maxLines: number, maxW: number): string[] {
  if (lines.length <= maxLines) return lines;
  const out = lines.slice(0, maxLines);
  let last = out[maxLines - 1];
  while (last.length > 0 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
  out[maxLines - 1] = `${last.trimEnd()}…`;
  return out;
}

function squash(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function drawCard(ctx: CanvasRenderingContext2D, n: WallNote, font: string): void {
  const W = TEX_W;
  const H = TEX_H;
  const base = parseHex(n.color);
  const paper = mixWhite(base, 0.78);
  const R = 22;
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  roundRectPath(ctx, 2, 2, W - 4, H - 4, R);
  ctx.clip();
  ctx.fillStyle = rgb(paper);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgb(base);
  ctx.fillRect(0, 0, W, BAND_H + 2);
  ctx.restore();

  // Thin darker outline.
  roundRectPath(ctx, 2, 2, W - 4, H - 4, R);
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgb([base[0] * 0.62, base[1] * 0.62, base[2] * 0.62], 0.9);
  ctx.stroke();

  // "you" marker in the band.
  if (n.mine) {
    const bandInk = luminance(base) > 0.62 ? INK : '#ffffff';
    ctx.fillStyle = bandInk;
    ctx.beginPath();
    ctx.arc(W - 30, 19, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 19px ${font}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('you', W - 44, 20);
  }

  const padX = 28;
  const maxW = W - padX * 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Excerpt first (bottom anchored) so the code can use what is left.
  const excerpt = squash(n.excerpt);
  let exLines: string[] = [];
  if (excerpt) {
    ctx.font = `400 22px ${font}`;
    exLines = clampLines(ctx, wrapText(ctx, excerpt, maxW), 2, maxW);
  }
  const exLH = 28;
  const exTop = H - 24 - exLines.length * exLH;

  const codeTop = BAND_H + 18;
  const availH = exTop - 10 - codeTop;
  const code = squash(n.code) || '(empty)';
  let size = 54;
  let lines: string[] = [];
  for (; size >= 30; size -= 2) {
    ctx.font = `700 ${size}px ${font}`;
    lines = wrapText(ctx, code, maxW);
    if (lines.length <= 3 && lines.length * size * 1.14 <= availH) break;
  }
  if (size < 30) {
    size = 30;
    ctx.font = `700 ${size}px ${font}`;
    lines = clampLines(ctx, wrapText(ctx, code, maxW), 3, maxW);
  }
  ctx.fillStyle = INK;
  lines.forEach((ln, i) => ctx.fillText(ln, padX, codeTop + i * size * 1.14));

  if (exLines.length) {
    ctx.font = `400 22px ${font}`;
    ctx.fillStyle = 'rgba(28,25,23,0.72)';
    exLines.forEach((ln, i) => ctx.fillText(ln, padX, exTop + i * exLH));
  }
}

// ---------------------------------------------------------------------------
// Static textures
// ---------------------------------------------------------------------------
function makeCanvas(w: number, hh: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = hh;
  return [c, c.getContext('2d')];
}

function wallTexture(): CanvasTexture {
  const PX = 128; // pixels per world unit
  const W = PANEL_HW * 2 * PX;
  const H = PANEL_HH * 2 * PX;
  const [c, ctx] = makeCanvas(W, H);
  if (ctx) {
    ctx.save();
    roundRectPath(ctx, 3, 3, W - 6, H - 6, 28);
    ctx.clip();
    ctx.fillStyle = '#1f1b18';
    ctx.fillRect(0, 0, W, H);
    // Dot grid every half world unit.
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    const step = PX / 2;
    for (let y = step; y < H; y += step) {
      for (let x = step; x < W; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Staging strip.
    const sy = (PANEL_HH - STRIP_Y) * PX;
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(0, sy, W, H - sy);
    ctx.setLineDash([14, 12]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(30, sy);
    ctx.lineTo(W - 30, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `600 22px ${DEFAULT_FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText('NEW NOTES LAND HERE', W - 36, sy - 14);
    ctx.restore();
    roundRectPath(ctx, 3, 3, W - 6, H - 6, 28);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** 100 px per world unit; card is 190x115 inside a 250x175 canvas (30px blur margin). */
function shadowTexture(): CanvasTexture {
  const [c, ctx] = makeCanvas(250, 175);
  if (ctx) {
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = 10000;
    ctx.fillStyle = '#000';
    roundRectPath(ctx, 30 - 10000, 30, 190, 115, 12);
    ctx.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Selection outline, 100 px per world unit, 210x135 around the card. */
function ringTexture(): CanvasTexture {
  const [c, ctx] = makeCanvas(210, 135);
  if (ctx) {
    ctx.shadowColor = 'rgba(244,237,228,0.7)';
    ctx.shadowBlur = 6;
    roundRectPath(ctx, 6, 6, 198, 123, 14);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f4ede4';
    ctx.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// 2D fallback: chips in a wrapping list
// ---------------------------------------------------------------------------
function mountWallFallback(el: HTMLElement, opts: { onSelect(id: string): void }): WallHandle {
  el.textContent = '';
  const root = h('div', {
    style: 'display:flex;flex-direction:column;gap:10px;padding:8px;',
    attrs: { role: 'group', 'aria-label': 'Code notes. Select a chip to inspect it.' },
  });
  const note = h('div', { style: 'font-size:.8rem;opacity:.75;', text: FALLBACK_NOTE });
  const empty = h('div', { style: 'font-size:.9rem;opacity:.7;', text: EMPTY_TEXT });
  const list = h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;' });
  root.append(note, empty, list);
  el.append(root);

  const notes = new Map<string, WallNote>();
  const chips = new Map<string, HTMLButtonElement>();
  let selected: string | null = null;

  const paint = (id: string) => {
    const btn = chips.get(id);
    const n = notes.get(id);
    if (!btn || !n) return;
    const on = id === selected;
    const c = rgb(parseHex(n.color));
    btn.style.background = on ? c : `color-mix(in srgb, ${c} 18%, transparent)`;
    btn.style.color = on ? (luminance(parseHex(n.color)) > 0.62 ? INK : '#fff') : 'inherit';
    btn.style.border = `1.5px solid ${c}`;
    btn.setAttribute('aria-pressed', String(on));
  };
  const fill = (btn: HTMLButtonElement, n: WallNote) => {
    btn.textContent = '';
    btn.title = n.why ? `${n.code}: ${n.why}` : n.code;
    btn.append(
      h('span', { style: 'font-weight:700;display:block;', text: n.mine ? `${n.code} (you)` : n.code }),
      h('span', { style: 'font-size:.78rem;opacity:.8;display:block;', text: squash(n.excerpt) }),
    );
  };
  const sync = () => {
    empty.style.display = notes.size ? 'none' : 'block';
  };
  sync();

  return {
    upsert(n) {
      const existing = chips.get(n.id);
      notes.set(n.id, n);
      if (existing) {
        fill(existing, n);
        paint(n.id);
        return undefined;
      }
      const btn = h('button', {
        style:
          'border-radius:12px;padding:8px 12px;min-height:36px;font:inherit;font-size:.85rem;cursor:pointer;' +
          'text-align:left;max-width:260px;',
        attrs: { type: 'button' },
      });
      fill(btn, n);
      btn.addEventListener('click', () => {
        selected = n.id;
        for (const id of chips.keys()) paint(id);
        opts.onSelect(n.id);
      });
      chips.set(n.id, btn);
      list.append(btn);
      paint(n.id);
      sync();
      return undefined;
    },
    remove(id) {
      chips.get(id)?.remove();
      chips.delete(id);
      notes.delete(id);
      if (selected === id) selected = null;
      sync();
    },
    setPosition() {},
    onMoved() {},
    select(id) {
      selected = id && notes.has(id) ? id : null;
      for (const k of chips.keys()) paint(k);
    },
    count: () => notes.size,
    dispose() {
      chips.clear();
      notes.clear();
      root.remove();
      el.textContent = '';
    },
  };
}

// ---------------------------------------------------------------------------
// 3D scene
// ---------------------------------------------------------------------------
interface Card {
  note: WallNote;
  key: string;
  group: Group;
  mesh: Mesh;
  shadow: Mesh;
  ring: Mesh;
  mat: MeshBasicMaterial;
  tex: CanvasTexture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  /** Current resting position. */
  pos: Vector2;
  /** Where a groupmate (or overlap resolution) wants it; pos eases there. */
  target: Vector2 | null;
  /** Last position reported or received, to tell real moves from echoes. */
  known: Vector2;
  rot: number;
  phase: number;
  speed: number;
  s: number;
  lift: number;
  spawn: number;
  z: number;
}

const noteKey = (n: WallNote) => `${n.code}\u0000${n.excerpt}\u0000${n.color}\u0000${n.mine ? 1 : 0}`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function mountWall(el: HTMLElement, opts: { onSelect(id: string): void }): WallHandle {
  el.textContent = '';
  if (!webglAvailable()) return mountWallFallback(el, opts);
  const stage = createStage(el, {
    fov: 34,
    minHeight: 200,
    aspect: '16 / 9',
    label: 'Code wall: 0 notes. Drag notes to cluster them.',
  });
  if (!stage) return mountWallFallback(el, opts);

  const { scene, camera, canvas, overlay, renderer } = stage;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'default';

  let font = DEFAULT_FONT;
  try {
    const f = getComputedStyle(el).fontFamily;
    if (f) font = `${f}, system-ui, sans-serif`;
  } catch {
    /* keep default */
  }
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  // ---- shared geometry, materials and textures ----
  const cardGeo = stage.track(new PlaneGeometry(CARD_W, CARD_H));
  const shadowGeo = stage.track(new PlaneGeometry(2.5, 1.75));
  const ringGeo = stage.track(new PlaneGeometry(2.1, 1.35));
  const wallGeo = stage.track(new PlaneGeometry(PANEL_HW * 2, PANEL_HH * 2));

  const wallTex = wallTexture();
  const shadowTex = shadowTexture();
  const ringTex = ringTexture();
  const sharedTex: Texture[] = [wallTex, shadowTex, ringTex];
  for (const t of sharedTex) t.anisotropy = maxAniso;
  const wallMat = stage.track(new MeshBasicMaterial({ map: wallTex, transparent: true, toneMapped: false }));
  const shadowMat = stage.track(
    new MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }),
  );
  const ringMat = stage.track(
    new MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  const wall = new Mesh(wallGeo, wallMat);
  wall.position.z = -0.3;
  wall.renderOrder = -10;
  scene.add(wall);

  // ---- overlay: empty state ----
  const emptyMsg = h('div', {
    style:
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;' +
      'padding:24px;font-size:.95rem;line-height:1.4;color:rgba(255,255,255,.6);pointer-events:none;',
    text: EMPTY_TEXT,
  });
  overlay.append(emptyMsg);

  // ---- state ----
  const cards = new Map<string, Card>();
  /** Back to front. */
  const stack: Card[] = [];
  const byMesh = new Map<Mesh, Card>();
  let selected: Card | null = null;
  let hovered: Card | null = null;
  let dragging: Card | null = null;
  let disposed = false;
  const movedCbs: ((id: string, pos: WallPos) => void)[] = [];

  const syncMeta = () => {
    emptyMsg.style.display = cards.size > 0 ? 'none' : 'flex';
    canvas.setAttribute('aria-label', `Code wall: ${cards.size} notes. Drag notes to cluster them.`);
  };

  const relayout = () => {
    stack.forEach((c, i) => {
      c.z = i * Z_STEP;
    });
  };
  const toFront = (c: Card) => {
    const i = stack.indexOf(c);
    if (i >= 0) stack.splice(i, 1);
    stack.push(c);
    relayout();
  };

  const clampPos = (v: Vector2) => {
    v.x = clamp(v.x, -BOUND_X, BOUND_X);
    v.y = clamp(v.y, -BOUND_Y, BOUND_Y);
  };
  const eff = (c: Card) => c.target ?? c.pos;

  const paintCard = (c: Card) => {
    if (!c.ctx) return;
    drawCard(c.ctx, c.note, font);
    c.tex.needsUpdate = true;
    c.key = noteKey(c.note);
  };

  // Redraw once the page fonts are ready so textures use the real face.
  try {
    void document.fonts?.ready.then(() => {
      if (disposed) return;
      for (const c of cards.values()) paintCard(c);
      stage.invalidate();
    });
  } catch {
    /* no font loading API */
  }

  // ---- placement ----
  const isFree = (x: number, y: number) => {
    for (const c of cards.values()) {
      const p = eff(c);
      if (Math.abs(p.x - x) < CARD_W * (1 - ALLOW_OVERLAP) && Math.abs(p.y - y) < CARD_H * (1 - ALLOW_OVERLAP)) {
        return false;
      }
    }
    return true;
  };
  const freeSlot = (id: string): Vector2 => {
    for (let row = 0; SLOT_Y0 + row * SLOT_DY <= BOUND_Y; row++) {
      for (let col = 0; col < SLOT_COLS; col++) {
        const x = SLOT_X0 + col * SLOT_DX;
        const y = SLOT_Y0 + row * SLOT_DY;
        if (isFree(x, y)) return new Vector2(x, y);
      }
    }
    // Wall is full: take the least crowded of several seeded candidates.
    const rng = mulberry32(hashString(`slot:${id}`));
    let best = new Vector2(0, 0);
    let bestD = -1;
    for (let i = 0; i < 48; i++) {
      const cx = (rng() * 2 - 1) * BOUND_X;
      const cy = (rng() * 2 - 1) * BOUND_Y;
      let md = Infinity;
      for (const c of cards.values()) {
        const p = eff(c);
        md = Math.min(md, Math.hypot((p.x - cx) / CARD_W, (p.y - cy) / CARD_H));
      }
      if (md > bestD) {
        bestD = md;
        best = new Vector2(cx, cy);
      }
    }
    return best;
  };

  // ---- card factory ----
  const makeCard = (n: WallNote, at: Vector2): Card => {
    const [canvas2, ctx] = makeCanvas(TEX_W, TEX_H);
    const tex = new CanvasTexture(canvas2);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = maxAniso;
    const mat = new MeshBasicMaterial({
      map: tex,
      alphaTest: 0.5,
      alphaToCoverage: true,
      toneMapped: false,
    });
    const group = new Group();
    const mesh = new Mesh(cardGeo, mat);
    const shadow = new Mesh(shadowGeo, shadowMat);
    shadow.position.set(0.05, -0.07, -0.006);
    const ring = new Mesh(ringGeo, ringMat);
    ring.position.z = 0.004;
    ring.visible = false;
    group.add(shadow, mesh, ring);
    scene.add(group);

    const rng = mulberry32(hashString(n.id) ^ 0x51ed270b);
    const card: Card = {
      note: n,
      key: '',
      group,
      mesh,
      shadow,
      ring,
      mat,
      tex,
      canvas: canvas2,
      ctx,
      pos: at.clone(),
      target: null,
      known: at.clone(),
      rot: (rng() * 2 - 1) * ((2 * Math.PI) / 180),
      phase: rng() * Math.PI * 2,
      speed: 0.5 + rng() * 0.5,
      s: 1,
      lift: 0,
      spawn: stage.reduced ? 1 : 0,
      z: 0,
    };
    if (card.spawn < 1) group.scale.setScalar(0.0001);
    group.position.set(at.x, at.y, 0);
    group.rotation.z = card.rot;
    paintCard(card);
    cards.set(n.id, card);
    stack.push(card);
    byMesh.set(mesh, card);
    relayout();
    return card;
  };

  const destroyCard = (c: Card) => {
    scene.remove(c.group);
    byMesh.delete(c.mesh);
    cards.delete(c.note.id);
    const i = stack.indexOf(c);
    if (i >= 0) stack.splice(i, 1);
    relayout();
    c.tex.dispose();
    c.mat.dispose();
    c.canvas.width = 1;
    c.canvas.height = 1;
  };

  // ---- overlap resolution on drop ----
  /** Push cards apart (dropped card barely moves) until overlaps are at most ALLOW_OVERLAP. Returns final positions. */
  const resolve = (dropped: Card): Map<Card, Vector2> => {
    const out = new Map<Card, Vector2>();
    for (const c of stack) out.set(c, c === dropped ? c.pos.clone() : eff(c).clone());
    let active = new Set<Card>([dropped]);
    for (let it = 0; it < 14 && active.size; it++) {
      const moved = new Set<Card>();
      for (let i = 0; i < stack.length; i++) {
        for (let j = i + 1; j < stack.length; j++) {
          const a = stack[i];
          const b = stack[j];
          if (!active.has(a) && !active.has(b)) continue;
          const pa = out.get(a)!;
          const pb = out.get(b)!;
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const needX = CARD_W - Math.abs(dx) - ALLOW_OVERLAP * CARD_W;
          const needY = CARD_H - Math.abs(dy) - ALLOW_OVERLAP * CARD_H;
          if (needX <= 0 || needY <= 0) continue;
          const shareA = a === dropped ? 0.15 : b === dropped ? 0.85 : 0.5;
          const sign = (d: number, salt: string) => (d !== 0 ? Math.sign(d) : hashString(salt) & 1 ? 1 : -1);
          if (needY <= needX) {
            const dir = sign(dy, a.note.id + b.note.id);
            const amt = needY + 0.02;
            pa.y -= dir * amt * shareA;
            pb.y += dir * amt * (1 - shareA);
          } else {
            const dir = sign(dx, b.note.id + a.note.id);
            const amt = needX + 0.02;
            pa.x -= dir * amt * shareA;
            pb.x += dir * amt * (1 - shareA);
          }
          clampPos(pa);
          clampPos(pb);
          moved.add(a);
          moved.add(b);
        }
      }
      active = moved;
    }
    return out;
  };

  const commitDrop = (dropped: Card) => {
    const finals = resolve(dropped);
    const reports: [Card, Vector2][] = [];
    for (const [c, p] of finals) {
      if (c === dropped || p.distanceTo(c.known) > MOVE_EPS) {
        reports.push([c, p]);
        c.known.copy(p);
      }
      if (stage.reduced) {
        c.pos.copy(p);
        c.target = null;
      } else if (p.distanceTo(c.pos) > 0.001) {
        c.target = p.clone();
      } else {
        c.pos.copy(p);
        c.target = null;
      }
    }
    // Dropped card first, then the cards it pushed.
    reports.sort((a, b) => (a[0] === dropped ? -1 : b[0] === dropped ? 1 : 0));
    for (const [c, p] of reports) for (const cb of movedCbs) cb(c.note.id, [p.x, p.y]);
  };

  // ---- picking and dragging ----
  const ray = new Raycaster();
  const ndc = new Vector2();
  const dragPlane = new Plane(new Vector3(0, 0, 1), 0);
  const hit = new Vector3();
  const setRay = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const pick = (clientX: number, clientY: number): Card | null => {
    if (!cards.size) return null;
    scene.updateMatrixWorld();
    setRay(clientX, clientY);
    const hits = ray.intersectObjects(
      stack.map((c) => c.mesh),
      false,
    );
    let best: Card | null = null;
    for (const hh of hits) {
      const c = byMesh.get(hh.object as Mesh);
      if (c && (!best || c.z > best.z)) best = c;
    }
    return best;
  };

  let startX = 0;
  let startY = 0;
  let moved = false;
  const startPos = new Vector2();
  const grab = new Vector2();

  const setSelected = (c: Card | null) => {
    if (selected) selected.ring.visible = false;
    selected = c;
    if (selected) selected.ring.visible = true;
    stage.invalidate();
  };

  stage.listen(canvas, 'pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const c = pick(e.clientX, e.clientY);
    if (!c) return;
    dragging = c;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    c.target = null;
    startPos.copy(c.pos);
    toFront(c);
    dragPlane.constant = -c.z;
    setRay(e.clientX, e.clientY);
    if (ray.ray.intersectPlane(dragPlane, hit)) grab.set(c.pos.x - hit.x, c.pos.y - hit.y);
    else grab.set(0, 0);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best effort */
    }
    stage.invalidate();
  });

  stage.listen(canvas, 'pointermove', (e) => {
    if (dragging) {
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > 4) {
        moved = true;
        canvas.style.cursor = 'grabbing';
      }
      if (moved) {
        setRay(e.clientX, e.clientY);
        if (ray.ray.intersectPlane(dragPlane, hit)) {
          dragging.pos.set(hit.x + grab.x, hit.y + grab.y);
          clampPos(dragging.pos);
        }
        stage.invalidate();
      }
      return;
    }
    if (e.pointerType === 'touch') return;
    const c = pick(e.clientX, e.clientY);
    if (c !== hovered) {
      hovered = c;
      canvas.style.cursor = c ? 'grab' : 'default';
      stage.invalidate();
    }
  });

  const endDrag = (e: PointerEvent, cancelled: boolean) => {
    if (!dragging) return;
    const c = dragging;
    dragging = null;
    try {
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    canvas.style.cursor = hovered ? 'grab' : 'default';
    const realMove = moved && c.pos.distanceTo(startPos) > 0.08;
    if (realMove) {
      commitDrop(c);
    } else {
      c.pos.copy(startPos);
      if (!cancelled) {
        setSelected(c);
        opts.onSelect(c.note.id);
      }
    }
    moved = false;
    stage.invalidate();
  };
  stage.listen(canvas, 'pointerup', (e) => endDrag(e, false));
  stage.listen(canvas, 'pointercancel', (e) => endDrag(e, true));
  stage.listen(canvas, 'pointerleave', () => {
    if (dragging) return;
    hovered = null;
    canvas.style.cursor = 'default';
    stage.invalidate();
  });

  // ---- camera framing: head-on ----
  stage.onResize(() => {
    camera.position.set(0, 0, fitDistance(camera, PANEL_HW + 0.1, PANEL_HH + 0.08));
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
    for (const c of stack) {
      const isDrag = c === dragging;
      if (c.target && !isDrag) {
        c.pos.x = stage.damp(c.pos.x, c.target.x, 9, dt);
        c.pos.y = stage.damp(c.pos.y, c.target.y, 9, dt);
        if (c.pos.distanceTo(c.target) < 0.004) {
          c.pos.copy(c.target);
          c.target = null;
        } else {
          active = true;
        }
      }
      const tScale = isDrag && moved ? 1.07 : c === selected ? 1.04 : c === hovered ? 1.03 : 1;
      c.s = stage.damp(c.s, tScale, 14, dt);
      if (Math.abs(c.s - tScale) > 0.002) active = true;
      const tLift = isDrag && moved ? 1 : 0;
      c.lift = stage.damp(c.lift, tLift, 12, dt);
      if (Math.abs(c.lift - tLift) > 0.01) active = true;
      if (c.spawn < 1) {
        c.spawn = Math.min(1, c.spawn + dt / 0.45);
        active = true;
      }
      const sp = c.spawn >= 1 ? 1 : Math.max(0.0001, easeOutBack(c.spawn));
      const bob = stage.reduced || isDrag ? 0 : Math.sin(time * c.speed + c.phase);
      c.group.position.set(c.pos.x, c.pos.y + bob * 0.014, c.z);
      c.group.rotation.z = c.rot + bob * 0.003;
      c.group.scale.setScalar(c.s * sp);
      c.shadow.position.set(0.05 + 0.07 * c.lift, -0.07 - 0.09 * c.lift, -0.006);
      c.shadow.scale.setScalar(1 + 0.06 * c.lift);
    }
    return active;
  });

  const handle: WallHandle = {
    upsert(n, at) {
      const existing = cards.get(n.id);
      if (existing) {
        existing.note = n;
        if (noteKey(n) !== existing.key) paintCard(existing);
        stage.invalidate();
        return undefined;
      }
      let p: Vector2;
      if (at) {
        p = new Vector2(at[0], at[1]);
        clampPos(p);
      } else {
        p = freeSlot(n.id);
      }
      const c = makeCard(n, p);
      if (stage.reduced) c.group.scale.setScalar(1);
      syncMeta();
      stage.invalidate();
      return [p.x, p.y];
    },
    remove(id) {
      const c = cards.get(id);
      if (!c) return;
      if (c === dragging) {
        dragging = null;
        moved = false;
        canvas.style.cursor = 'default';
      }
      if (c === selected) selected = null;
      if (c === hovered) hovered = null;
      destroyCard(c);
      syncMeta();
      stage.invalidate();
    },
    setPosition(id, pos) {
      const c = cards.get(id);
      if (!c || c === dragging) return;
      const t = new Vector2(pos[0], pos[1]);
      clampPos(t);
      c.known.copy(t); // a groupmate's move is not ours to report back
      if (stage.reduced) {
        c.pos.copy(t);
        c.target = null;
      } else {
        c.target = t;
      }
      stage.invalidate();
    },
    onMoved(cb) {
      movedCbs.push(cb);
    },
    select(id) {
      setSelected(id ? (cards.get(id) ?? null) : null);
    },
    count: () => cards.size,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const c of [...cards.values()]) destroyCard(c);
      for (const t of sharedTex) t.dispose();
      movedCbs.length = 0;
      stage.dispose();
      el.textContent = '';
    },
  };
  syncMeta();
  stage.invalidate();
  return handle;
}
