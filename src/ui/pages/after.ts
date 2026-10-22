import { checkList, collapsible, pageHeader, textField, type PageCtx } from '../components';
import { afterChecklist } from '../copy';
import { h } from '../dom';

export function renderAfter(_ctx: PageCtx): HTMLElement {
  return h(
    'div',
    { class: 'page' },
    pageHeader('After the workshop', 'Line up next steps for your final project with your research cluster.'),
    h(
      'section',
      { class: 'section' },
      h('h2', null, 'Research cluster meeting checklist'),
      checkList('t5.checklist', afterChecklist, { legend: 'Cluster meeting topics' }),
      textField({ key: 't5.notes', label: 'Notes: decisions, who does what, and when and where you will meet next', rows: 5 }),
    ),
    collapsible('A note on what you just did', [
      h(
        'ul',
        { class: 'plain-list' },
        h('li', null, 'Today was a simplified reflexive thematic analysis. A full study works through the whole dataset, repeatedly, over weeks.'),
        h('li', null, 'In your final project, qualitative data means presenting implications as well as themes.'),
        h('li', null, 'For quantitative results, a significant difference is a finding; what it means for design is the implication.'),
      ),
      h('p', null, h('a', { class: 'btn', href: '#/resources' }, 'Go to resources and extensions')),
    ]),
  );
}
