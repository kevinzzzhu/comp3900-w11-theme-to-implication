import { checkList, pageHeader, quoteBox, textField, type PageCtx } from '../components';
import { afterChecklist } from '../copy';
import { h } from '../dom';

export function renderAfter(_ctx: PageCtx): HTMLElement {
  return h(
    'div',
    { class: 'page' },
    pageHeader('After the workshop', 'Use the last minutes of class, or your first cluster meeting, to line up the next steps for your final project.'),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'Research cluster meeting checklist'),
      h('p', null, 'Tick things off as your cluster covers them. Your ticks are saved in this browser and included in Export.'),
      checkList('t5.checklist', afterChecklist, { legend: 'Cluster meeting topics' }),
      textField({ key: 't5.notes', label: 'Notes: decisions, who does what, and when and where you will meet next', rows: 5 }),
    ),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'A note on what you just did'),
      quoteBox('Today was a simplified version of reflexive thematic analysis.'),
      h(
        'ul',
        { class: 'plain-list' },
        h('li', null, 'A full study engages with the whole dataset, repeatedly, over weeks rather than minutes. You worked from a few moments in three short videos.'),
        h('li', null, 'In your final project, if you collect qualitative data, you will be expected to present implications as well as themes.'),
        h('li', null, 'For quantitative results the same idea holds: a significant difference is a finding, and what that difference means for design is the implication.'),
      ),
      h('p', null, h('a', { class: 'btn', href: '#/resources' }, 'Go to resources and extensions')),
    ),
  );
}
