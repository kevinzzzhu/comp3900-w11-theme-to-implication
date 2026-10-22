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
      h('p', { class: 'small muted' }, `${s.minutes} min`),
    );
  });

  return h(
    'div',
    { class: 'page' },
    pageHeader(
      'From Theme to Implication',
      'Today you take a handful of observations from three short videos, build a theme out of them, test it against a rival theme, and then ask what it means for design, research or practice.',
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'Research question'),
      quoteBox(researchQuestion),
      h('p', null, 'Keep this question in view. A good theme speaks to it, and a good implication says what follows from the theme.'),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, `Timeline (${total} minutes)`),
      h('ol', { class: 'timeline', 'aria-label': 'Workshop timeline' }, items),
      h('p', { class: 'small muted' }, 'You work in groups of 4-5. Members may have watched different videos; that is useful, because you each bring a different piece of the data.'),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'Your three videos'),
      h('p', null, 'Each video is a different kind of source. Read the format note before you code, because it changes what counts as the participant\'s own voice.'),
      videos.length
        ? h('div', { class: 'video-grid' }, videos.map((v) => VideoEmbed(v)))
        : h('p', { class: 'muted' }, 'Video details have not loaded.'),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'How to use this site'),
      h(
        'ul',
        { class: 'plain-list' },
        h('li', null, 'Work through Task 1 to Task 4 in order. Each step shows its timing and whether it is individual or group work.'),
        h('li', null, 'Every timestamp is a link. If a video is loaded on the page it jumps there; otherwise it opens YouTube in a new tab.'),
        h('li', null, 'The 3D widgets are thinking aids. Everything they show is also available as text and tables.'),
        h('li', null, 'Use Export (top right) to copy or download all your answers as Markdown, or print them.'),
      ),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'Privacy'),
      h(
        'p',
        { class: 'panel' },
        'Your answers are saved only in this browser on this device (local storage). There is no account, no analytics and nothing is sent to a server. Videos load from YouTube only when you press a load button or click a timestamp with a video panel open. Clear all removes everything.',
      ),
    ),
  );
}
