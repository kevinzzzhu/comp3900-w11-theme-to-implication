import type { Resource } from '../types';
import { h } from './dom';

export function resourceUrl(url: string): string {
  const u = url.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^(doi:)?10\.\d{4,}/i.test(u)) return `https://doi.org/${u.replace(/^doi:/i, '')}`;
  return u;
}

export function resourceItem(r: Resource): HTMLElement {
  const href = resourceUrl(r.url);
  return h(
    'li',
    { class: 'resource' },
    href
      ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, r.title, h('span', { class: 'sr-only' }, ' (opens in a new tab)'))
      : h('strong', null, r.title),
    r.verified ? null : h('span', { class: 'badge-warn', title: 'The details of this reference have not been checked against the source' }, 'Check before citing'),
    h('p', { class: 'cite small' }, r.cite),
    h('p', { class: 'small' }, r.why),
  );
}
