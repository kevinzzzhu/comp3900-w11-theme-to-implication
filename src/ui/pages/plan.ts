import { researchQuestion, segments } from '../../data/plan';
import { videos } from '../../data/videos';
import { pageHeader, quoteBox, type PageCtx } from '../components';
import { h } from '../dom';
import { VideoEmbed } from '../video';

export function renderPlan(_ctx: PageCtx): HTMLElement {
  const total = segments.reduce((a, s) => a + s.minutes, 0);
  let start = 0;
  const items = segments.map((s, i) => {
    const from = start;
    start += s.minutes;
    const route = ['', '#/task-1', '#/task-2', '#/task-3', '#/task-4'][i];
    return h(
      'li',
      { class: 'tl-item', style: `flex:${s.minutes} 1 0` },
      h('div', { class: 'tl-bar' }),
      h('p', { class: 'tl-time' }, `${from}-${start} min`),
      h('p', { class: 'tl-label' }, route ? h('a', { href: route }, s.label) : s.label),
    );
  });

  return h(
    'div',
    { class: 'page' },
    pageHeader('From Theme to Implication', 'Build a theme from three videos, test it against a rival, then ask: so what?'),
    h('section', { class: 'section' }, h('h2', null, 'Research question'), quoteBox(researchQuestion)),
    h(
      'section',
      { class: 'section' },
      h('h2', null, `Timeline (${total} minutes)`),
      h('ol', { class: 'timeline', 'aria-label': 'Workshop timeline' }, items),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'Your three videos'),
      videos.length
        ? h('div', { class: 'video-grid' }, videos.map((v) => VideoEmbed(v)))
        : h('p', { class: 'muted' }, 'Video details have not loaded.'),
    ),
    h(
      'p',
      { class: 'small muted' },
      'Your own answers stay in this browser; only group boxes are shared, and only if you join a group room. Use Export (top right) to copy answers for Ed. Videos load from YouTube only when you press a button. If anything goes wrong, use the ',
      h('a', { href: `${import.meta.env.BASE_URL}backup/Week11-group-backup.xlsx`, download: '' }, 'Excel backup workbook (one tab per group)'),
      '.',
    ),
  );
}
