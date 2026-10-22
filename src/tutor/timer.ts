// TUTOR_ONLY: session timer state machine for the tutor drawer.
import type { Segment } from '../types';

export interface TimerView {
  segIndex: number;
  elapsedMs: number;
  totalMs: number;
  remainingMs: number;
  fraction: number;
  running: boolean;
}

export class SessionTimer {
  private seg = 0;
  private elapsed = 0;
  private extra = 0;
  private running = false;
  private last = 0;
  private handle: number | undefined;

  constructor(private segments: Segment[], private onChange: (v: TimerView) => void) {}

  view(): TimerView {
    const totalMs = (this.segments[this.seg]?.minutes ?? 0) * 60000 + this.extra;
    const remainingMs = totalMs - this.elapsed;
    return {
      segIndex: this.seg,
      elapsedMs: this.elapsed,
      totalMs,
      remainingMs,
      fraction: totalMs > 0 ? Math.min(1, this.elapsed / totalMs) : 0,
      running: this.running,
    };
  }

  private emit(): void {
    this.onChange(this.view());
  }

  private tick = (): void => {
    const now = performance.now();
    this.elapsed += now - this.last;
    this.last = now;
    this.emit();
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.handle = window.setInterval(this.tick, 250);
    this.emit();
  }

  pause(): void {
    if (!this.running) return;
    this.tick();
    this.running = false;
    if (this.handle !== undefined) window.clearInterval(this.handle);
    this.handle = undefined;
    this.emit();
  }

  toggle(): void {
    if (this.running) this.pause();
    else this.start();
  }

  addMinute(): void {
    this.extra += 60000;
    this.emit();
  }

  goto(i: number): void {
    const clamped = Math.max(0, Math.min(this.segments.length - 1, i));
    this.seg = clamped;
    this.elapsed = 0;
    this.extra = 0;
    this.last = performance.now();
    this.emit();
  }

  next(): void {
    this.goto(this.seg + 1);
  }

  prev(): void {
    this.goto(this.seg - 1);
  }

  destroy(): void {
    if (this.handle !== undefined) window.clearInterval(this.handle);
  }
}
