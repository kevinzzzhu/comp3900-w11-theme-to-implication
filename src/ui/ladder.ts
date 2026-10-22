import { mountLadder } from '../scenes/ladder';
import { mountScene, widgetPanel, type PageCtx } from './components';
import { rungDescriptions } from './copy';
import { h } from './dom';

export interface LadderPanel {
  el: HTMLElement;
  /** call from afterMount, after the page is in the document */
  start(): void;
}

/** Implication Ladder widget plus step buttons; optionally follows scroll through sections marked data-rung. */
export function ladderPanel(ctx: PageCtx, opts: { initial: number; follow?: () => HTMLElement[] }): LadderPanel {
  const panel = widgetPanel(
    'Implication Ladder',
    'A four-rung ladder from observation, to code, to theme, to implication. The active rung is highlighted as you move up. The point is that an implication sits above the theme: it needs something the theme does not already say.',
  );
  const buttons: HTMLButtonElement[] = [];
  const desc = h('p', { class: 'rung-desc', 'aria-live': 'polite' });
  let handle: ReturnType<typeof mountLadder> | null = null;
  let current = opts.initial;

  const setRung = (i: number): void => {
    current = i;
    handle?.setRung(i);
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    desc.textContent = `${rungDescriptions[i].name}: ${rungDescriptions[i].text}`;
  };

  const group = h('div', { class: 'pill-tabs', role: 'group', 'aria-label': 'Ladder rungs' });
  rungDescriptions.forEach((r, i) => {
    const b = h('button', { type: 'button', class: 'pill-tab', 'aria-pressed': 'false', onClick: () => setRung(i) }, r.name);
    buttons.push(b);
    group.append(b);
  });
  panel.el.append(group, desc);
  setRung(current);

  return {
    el: panel.el,
    start() {
      handle = mountScene(ctx, panel, (el) => mountLadder(el, rungDescriptions.map((r) => r.name)));
      setRung(current);
      const sections = opts.follow?.() ?? [];
      if (sections.length && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries) => {
            const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (hit) {
              const r = Number((hit.target as HTMLElement).dataset.rung);
              if (!Number.isNaN(r) && r !== current) setRung(r);
            }
          },
          { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.5, 1] },
        );
        sections.forEach((s) => io.observe(s));
        ctx.onDispose(() => io.disconnect());
      }
    },
  };
}
