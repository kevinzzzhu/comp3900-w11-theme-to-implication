import { generateCode, prettyCode } from '../sync/config';
import { deleteRoomData, groupRoomsAvailable, joinRoom, leaveRoom, onRoom, roomState } from '../sync/room';
import { copyText } from './components';
import { h } from './dom';

/** Join / status strip for group steps. Null when this build has no group service. */
export function roomBar(note?: string): HTMLElement | null {
  if (!groupRoomsAvailable()) return null;
  const root = h('div', { class: 'room-bar', role: 'group', 'aria-label': 'Group room' });

  const render = (): void => {
    const s = roomState();
    root.replaceChildren();
    root.dataset.phase = s.phase;

    if (s.phase === 'live' || s.phase === 'offline') {
      const status = h('span', { class: `room-badge is-${s.phase}` }, s.phase === 'live' ? 'Live' : 'Offline');
      const people = h('span', { class: 'room-people' }, `${s.online} ${s.online === 1 ? 'person' : 'people'} here`);
      const copy = h('button', { type: 'button', class: 'btn btn-small' }, 'Copy code');
      copy.addEventListener('click', async () => {
        copy.textContent = (await copyText(s.code)) ? 'Copied' : 'Copy failed';
        window.setTimeout(() => (copy.textContent = 'Copy code'), 1800);
      });
      const leave = h('button', { type: 'button', class: 'btn btn-small btn-quiet' }, 'Leave room');
      leave.addEventListener('click', () => leaveRoom());
      const del = h('button', { type: 'button', class: 'btn btn-small btn-quiet' }, 'Delete room data');
      del.addEventListener('click', () => {
        if (window.confirm('Delete this room and everything your group wrote in it, for everyone? Your own copy on this device stays.')) void deleteRoomData();
      });
      root.append(
        h('p', { class: 'room-line' }, status, h('strong', { class: 'room-code' }, prettyCode(s.code)), people),
        h('p', { class: 'small muted' }, s.phase === 'live'
          ? note ?? 'Boxes and tables on this step are shared with everyone in the room, and sync live.'
          : 'Offline: your edits are kept on this device and will sync when you reconnect.'),
        h('div', { class: 'btn-row' }, copy, leave, del),
      );
      return;
    }

    if (s.phase === 'connecting') {
      root.append(h('p', { class: 'room-line' }, h('span', { class: 'room-badge is-connecting' }, 'Connecting'), h('strong', { class: 'room-code' }, prettyCode(s.code))));
      return;
    }

    const input = h('input', { type: 'text', id: `room-${Math.random().toString(36).slice(2, 7)}`, class: 'room-input', placeholder: 'Group code', maxlength: 8, autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, 'aria-label': 'Group code' });
    const join = h('button', { type: 'submit', class: 'btn btn-primary btn-small' }, 'Join or start');
    const make = h('button', { type: 'button', class: 'btn btn-small' }, 'New code');
    make.addEventListener('click', () => {
      input.value = prettyCode(generateCode());
      input.focus();
      input.select();
    });
    const form = h('form', { class: 'room-form', novalidate: true }, input, join, make);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void joinRoom(input.value);
    });
    root.append(
      h('p', { class: 'room-line' }, h('strong', null, 'Work live with your group'), h('span', { class: 'muted' }, ' (optional)')),
      form,
      ...(s.phase === 'error' ? [h('p', { class: 'note-warn small', role: 'alert' }, s.message)] : []),
      ...(note ? [h('p', { class: 'small muted' }, note)] : []),
      h('p', { class: 'small muted' }, 'One person taps "New code", the rest type it. Shared boxes are stored on a group server, so leave out names and personal details.'),
    );
  };

  const unsub = onRoom(() => {
    if (!root.isConnected && root.dataset.mounted === '1') {
      unsub();
      return;
    }
    root.dataset.mounted = root.isConnected ? '1' : root.dataset.mounted ?? '';
    render();
  });
  render();
  return root;
}
