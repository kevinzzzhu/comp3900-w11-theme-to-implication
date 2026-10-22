import { clearAll, onClear, onStatus, toMarkdown } from './state';
import { copyText, downloadText } from './components';
import { FOOTER_LINE, SITE_TITLE } from './copy';
import { h } from './dom';
import type { Route } from './router';

export interface Shell {
  main: HTMLElement;
  setActive(r: Route): void;
}

export function buildShell(app: HTMLElement, routes: Route[]): Shell {
  const main = h('main', { id: 'main', tabindex: -1, class: 'main' });

  const skip = h('a', { class: 'skip-link', href: '#main' }, 'Skip to content');
  skip.addEventListener('click', (e) => {
    e.preventDefault();
    main.focus();
  });

  /* nav */
  const navLinks = routes.map((r) => h('a', { href: `#${r.path}`, 'data-path': r.path }, r.nav));
  const nav = h('nav', { class: 'site-nav', 'aria-label': 'Workshop sections' }, h('ul', null, navLinks.map((a) => h('li', null, a))));

  /* saved indicator */
  const saved = h('span', { class: 'saved', role: 'status', 'aria-live': 'polite' });
  onStatus((s, at) => {
    const base = 'Saved in this browser';
    if (s === 'saving') saved.textContent = 'Saving...';
    else if (s === 'error') saved.textContent = 'Could not save to browser storage; export before closing';
    else if (s === 'saved' && at) saved.textContent = `${base} (${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    else saved.textContent = base;
    saved.classList.toggle('is-error', s === 'error');
  });

  /* export menu */
  const exportStatus = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const menuBtn = h('button', { type: 'button', class: 'btn', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, 'Export');
  const copyItem = h('button', { type: 'button', role: 'menuitem', class: 'menu-item' }, 'Copy Markdown');
  const dlItem = h('button', { type: 'button', role: 'menuitem', class: 'menu-item' }, 'Download .md');
  const printItem = h('button', { type: 'button', role: 'menuitem', class: 'menu-item' }, 'Print');
  const menu = h('div', { class: 'menu', role: 'menu', hidden: true }, copyItem, dlItem, printItem);
  const closeMenu = (restore = false): void => {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    if (restore) menuBtn.focus();
  };
  const openMenu = (): void => {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    copyItem.focus();
  };
  menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  menu.addEventListener('keydown', (e) => {
    const items = [copyItem, dlItem, printItem];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length].focus();
    } else if (e.key === 'Tab') {
      closeMenu();
    }
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !(e.target as Element).closest?.('.export-wrap')) closeMenu();
  });
  copyItem.addEventListener('click', async () => {
    const ok = await copyText(toMarkdown());
    exportStatus.textContent = ok ? 'Markdown copied to clipboard' : 'Copy failed; use Download .md instead';
    closeMenu(true);
  });
  dlItem.addEventListener('click', () => {
    downloadText('week11-my-notes.md', toMarkdown());
    exportStatus.textContent = 'Markdown downloaded';
    closeMenu(true);
  });
  printItem.addEventListener('click', () => {
    closeMenu();
    window.print();
  });

  /* clear all dialog */
  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'clear-title' });
  const confirmBtn = h('button', { type: 'button', class: 'btn btn-danger' }, 'Yes, clear everything');
  const cancelBtn = h('button', { type: 'button', class: 'btn' }, 'Cancel');
  dialog.append(
    h('h2', { id: 'clear-title' }, 'Clear all saved answers?'),
    h('p', null, 'This removes every answer saved in this browser for this workshop. It cannot be undone. Use Export first if you want a copy.'),
    h('div', { class: 'dialog-actions' }, cancelBtn, confirmBtn),
  );
  const clearBtn = h('button', { type: 'button', class: 'btn btn-quiet' }, 'Clear all');
  clearBtn.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      cancelBtn.focus();
    } else if (window.confirm('Clear all saved answers in this browser? This cannot be undone.')) {
      clearAll();
    }
  });
  cancelBtn.addEventListener('click', () => dialog.close());
  confirmBtn.addEventListener('click', () => {
    clearAll();
    dialog.close();
    clearBtn.focus();
  });

  onClear(() => {
    exportStatus.textContent = 'All saved answers cleared';
  });

  const header = h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'header-row' },
      h('a', { class: 'brand', href: '#/' }, SITE_TITLE),
      h('div', { class: 'header-tools' }, saved, h('div', { class: 'export-wrap' }, menuBtn, menu), clearBtn),
    ),
    nav,
  );

  const footer = h('footer', { class: 'site-footer' }, h('p', null, FOOTER_LINE));
  const announcer = h('div', { id: 'route-announcer', class: 'sr-only', role: 'status', 'aria-live': 'polite' });

  app.append(skip, header, main, footer, dialog, exportStatus, announcer);

  return {
    main,
    setActive(r) {
      navLinks.forEach((a) => {
        if (a.getAttribute('data-path') === r.path) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    },
  };
}
