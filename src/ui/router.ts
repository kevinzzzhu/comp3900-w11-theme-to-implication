import { growAll, type PageCtx } from './components';
import { SITE_TITLE } from './copy';
import { clearEmbeds } from './video';

export interface Route {
  path: string;
  title: string;
  nav: string;
  render(ctx: PageCtx): HTMLElement;
}

export interface Router {
  rerender(): void;
  current(): Route;
}

function currentPath(): string | null {
  const hash = window.location.hash;
  if (hash === '' || hash === '#' || hash === '#/') return '/';
  if (!hash.startsWith('#/')) return null;
  return hash.slice(1);
}

export function startRouter(main: HTMLElement, routes: Route[], onChange: (r: Route) => void): Router {
  let disposers: (() => void)[] = [];
  let active: Route = routes[0];
  const announcer = document.getElementById('route-announcer');

  const render = (focus: boolean): void => {
    for (const d of disposers) {
      try {
        d();
      } catch (err) {
        console.error(err);
      }
    }
    disposers = [];
    clearEmbeds();
    const path = currentPath();
    active = routes.find((r) => r.path === path) ?? routes[0];
    const mounts: (() => void)[] = [];
    const ctx: PageCtx = {
      onDispose: (fn) => disposers.push(fn),
      afterMount: (fn) => mounts.push(fn),
    };
    main.replaceChildren();
    try {
      main.appendChild(active.render(ctx));
    } catch (err) {
      console.error(err);
      const p = document.createElement('p');
      p.textContent = 'This page failed to render. Reload the page; your saved answers are kept.';
      main.appendChild(p);
    }
    for (const m of mounts) {
      try {
        m();
      } catch (err) {
        console.error(err);
      }
    }
    growAll(main);
    document.title = active.path === '/' ? SITE_TITLE : `${active.title} | ${SITE_TITLE}`;
    onChange(active);
    if (announcer) announcer.textContent = `${active.title} loaded`;
    if (focus) {
      window.scrollTo(0, 0);
      const h1 = main.querySelector<HTMLElement>('h1');
      (h1 ?? main).focus({ preventScroll: true });
    }
  };

  window.addEventListener('hashchange', () => {
    if (currentPath() === null) return; // in-page anchors such as the skip link
    render(true);
  });
  render(false);
  return { rerender: () => render(false), current: () => active };
}
