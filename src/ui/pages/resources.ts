import { resources } from '../../data/resources';
import type { Resource } from '../../types';
import { pageHeader, type PageCtx } from '../components';
import { GROUP_LABEL, GROUP_ORDER } from '../copy';
import { h } from '../dom';
import { renderExtensions } from '../extensions';
import { resourceItem } from '../resourceItem';

export function renderResources(_ctx: PageCtx): HTMLElement {
  const groups = new Map<string, Resource[]>();
  for (const r of resources) {
    const list = groups.get(r.group) ?? [];
    list.push(r);
    groups.set(r.group, list);
  }
  const ordered = [...GROUP_ORDER, ...[...groups.keys()].filter((g) => !GROUP_ORDER.includes(g))].filter((g) => groups.has(g));

  return h(
    'div',
    { class: 'page' },
    pageHeader('Resources and extensions', 'Readings and references for this week, grouped by purpose. Links open in a new tab.'),
    h('p', { class: 'small muted' }, 'A "Check before citing" badge means the details of that reference have not been verified against the source. Confirm authors, year and pages yourself.'),
    ordered.length
      ? ordered.map((g) => h('section', { class: 'section' }, h('h2', null, GROUP_LABEL[g] ?? g), h('ul', { class: 'resource-list' }, (groups.get(g) ?? []).map(resourceItem))))
      : h('p', { class: 'muted' }, 'The resource list has not loaded.'),
    renderExtensions(),
  );
}
