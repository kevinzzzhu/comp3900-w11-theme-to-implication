import { resources } from '../../data/resources';
import type { Resource } from '../../types';
import { collapsible, pageHeader, type PageCtx } from '../components';
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
    pageHeader('Resources and extensions', 'Readings grouped by purpose. "Check before citing" means the reference is not fully verified.'),
    h('p', { class: 'panel' }, h('strong', null, 'Backup worksheet: '), h('a', { href: `${import.meta.env.BASE_URL}backup/Week11-group-backup.xlsx`, download: '' }, 'download the Excel file'), ' with a tab for each task, in case the website is unavailable. Your tutor can share one copy per group.'),
    ordered.length
      ? ordered.map((g, i) => collapsible(`${GROUP_LABEL[g] ?? g} (${groups.get(g)?.length ?? 0})`, [h('ul', { class: 'resource-list' }, (groups.get(g) ?? []).map(resourceItem))], { open: i === 0 }))
      : h('p', { class: 'muted' }, 'The resource list has not loaded.'),
    renderExtensions(),
  );
}
