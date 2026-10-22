import { videos } from '../data/videos';
import type { Video, VideoId } from '../types';
import { clear, fmtTime, h, prefersReduced } from './dom';

const YT_ORIGIN = 'https://www.youtube-nocookie.com';

interface EmbedHandle {
  root: HTMLElement;
  seek(sec: number): void;
  pause(): void;
}
const embeds = new Map<VideoId, EmbedHandle>();

export function clearEmbeds(): void {
  embeds.clear();
}

export function getVideo(id: VideoId): Video | undefined {
  return videos.find((v) => v.id === id);
}

export function videoColor(id: VideoId): string {
  return getVideo(id)?.color ?? '#888888';
}

export function personName(id: VideoId): string {
  return getVideo(id)?.person ?? id;
}

export function youtubeUrl(youtubeId: string, sec = 0): string {
  return `https://www.youtube.com/watch?v=${youtubeId}${sec > 0 ? `&t=${Math.floor(sec)}s` : ''}`;
}

function openAncestorDetails(el: HTMLElement): void {
  let p: HTMLElement | null = el.parentElement;
  while (p) {
    if (p instanceof HTMLDetailsElement && !p.open) p.open = true;
    p = p.parentElement;
  }
}

/** Seek the on-page embed for this video if there is one; otherwise open YouTube at the timestamp in a new tab. */
export function seekTo(videoId: VideoId, seconds: number): void {
  const e = embeds.get(videoId);
  if (e && e.root.isConnected) {
    e.seek(seconds);
    return;
  }
  const v = getVideo(videoId);
  if (v) window.open(youtubeUrl(v.youtubeId, seconds), '_blank', 'noopener');
}

export interface TimeLinkOpts {
  endSec?: number;
  prefix?: string;
}

/** A timestamp that jumps the embedded player (or opens YouTube in a new tab). */
export function TimeLink(videoId: VideoId, sec: number, opts: TimeLinkOpts = {}): HTMLAnchorElement {
  const v = getVideo(videoId);
  const label = opts.endSec !== undefined ? `${fmtTime(sec)} to ${fmtTime(opts.endSec)}` : fmtTime(sec);
  const who = v ? v.person : videoId;
  const a = h(
    'a',
    {
      class: 'timelink',
      href: v ? youtubeUrl(v.youtubeId, sec) : '#',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `Jump to ${label} in ${who}'s video`,
      style: `--vc:${videoColor(videoId)}`,
    },
    opts.prefix ?? '',
    h('span', { class: 'timelink-time' }, label),
  );
  a.addEventListener('click', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    seekTo(videoId, sec);
  });
  return a;
}

export function VideoChip(videoId: VideoId): HTMLElement {
  return h('span', { class: 'vchip', style: `--vc:${videoColor(videoId)}` }, h('span', { class: 'vdot', 'aria-hidden': 'true' }), personName(videoId));
}

export interface VideoEmbedOpts {
  compact?: boolean;
}

/** Content warning first, then a poster button. The iframe is created only when the user asks for it. */
export function VideoEmbed(video: Video, opts: VideoEmbedOpts = {}): HTMLElement {
  const stage = h('div', { class: 'video-stage' });
  let iframe: HTMLIFrameElement | null = null;

  const load = (start: number): void => {
    if (iframe) return;
    const params = new URLSearchParams({ enablejsapi: '1', rel: '0', playsinline: '1', autoplay: '1' });
    if (start > 0) params.set('start', String(Math.floor(start)));
    if (location.protocol.startsWith('http')) params.set('origin', location.origin);
    iframe = h('iframe', {
      src: `${YT_ORIGIN}/embed/${video.youtubeId}?${params.toString()}`,
      title: `${video.person}: ${video.title}`,
      allow: 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin',
    });
    clear(stage);
    stage.classList.add('is-loaded');
    root.classList.add('is-active');
    stage.appendChild(iframe);
  };

  const loadBtn = h(
    'button',
    { type: 'button', class: 'btn video-load', onClick: () => seek(0) },
    h('span', { class: 'play-glyph', 'aria-hidden': 'true' }),
    ` Load video (${fmtTime(video.durationSec)})`,
  );
  stage.append(h('div', { class: 'video-poster' }, loadBtn, h('p', { class: 'muted small' }, 'Loads from youtube-nocookie.com only when you press the button.')));

  const root = h(
    'article',
    { class: `video-card${opts.compact ? ' is-compact' : ''}`, style: `--vc:${video.color}`, 'data-video': video.id },
    h('header', { class: 'video-head' }, h('span', { class: 'vdot', 'aria-hidden': 'true' }), h('h3', null, `${video.person}: ${video.title}`), h('span', { class: 'pill' }, fmtTime(video.durationSec))),
    h('p', { class: 'video-warning' }, h('strong', null, 'Content note: '), video.warning),
    opts.compact ? null : h('p', { class: 'video-context' }, video.context),
    h('p', { class: 'video-format' }, h('strong', null, 'What this video is: '), video.formatNote),
    stage,
    h(
      'p',
      { class: 'small' },
      h('a', { href: youtubeUrl(video.youtubeId), target: '_blank', rel: 'noopener noreferrer' }, 'Open on YouTube (new tab)'),
    ),
  );

  const send = (func: string, args: unknown[]) =>
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), YT_ORIGIN);

  const seek = (sec: number): void => {
    // One video at a time: pause the others so audio never overlaps in class.
    embeds.forEach((e, id) => {
      if (id !== video.id) e.pause();
    });
    openAncestorDetails(root);
    root.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'center' });
    if (!iframe) {
      load(sec);
      return;
    }
    send('seekTo', [sec, true]);
    send('playVideo', []);
  };

  embeds.set(video.id, { root, seek, pause: () => send('pauseVideo', []) });
  return root;
}

/** Collapsible group of embeds so timestamps on any page have a player to jump. */
export function VideoPanel(summary = 'Watch or re-check a video'): HTMLElement {
  return h(
    'details',
    { class: 'panel video-panel' },
    h('summary', null, summary),
    videos.length
      ? h('div', { class: 'video-grid' }, videos.map((v) => VideoEmbed(v, { compact: true })))
      : h('p', { class: 'muted' }, 'Video details have not loaded.'),
  );
}
