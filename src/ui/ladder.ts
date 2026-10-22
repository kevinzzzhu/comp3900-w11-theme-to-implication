import { mountLadder } from '../scenes/ladder';
import { mountWhenVisible, widgetPanel, type PageCtx } from './components';
import { rungDescriptions } from './copy';
import { h } from './dom';

export interface LadderPanel {
  el: HTMLElement;
}

/** Implication Ladder widget plus rung buttons. Mounts when it first becomes visible. */
export function ladderPanel(ctx: PageCtx, opts: { initial: number }): LadderPanel {
  const panel = widgetPanel('Implication Ladder', 'An implication sits above the theme: it needs something the theme does not already say.');
  const buttons: HTMLButtonElement[] = [];
  const desc = h('p', { class: 'rung-desc', 'aria-live': 'polite' });
  let current = opts.initial;
  const scene = mountWhenVisible(ctx, panel, (el) => mountLadder(el, rungDescriptions.map((r) => r.name)));

  const setRung = (i: number): void => {
    current = i;
    scene.get()?.setRung(i);
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
  scene.ready(() => setRung(current));
  setRung(current);

  return { el: panel.el };
}
