import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MEDIA_MAX_BYTES, createStallGuard } from './upload-limits';

describe('MEDIA_MAX_BYTES', () => {
  it('vaut 100 Mo, comme le backend', () => {
    expect(MEDIA_MAX_BYTES).toBe(100 * 1024 * 1024);
  });
});

describe('createStallGuard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sans progression pendant le délai : envoi interrompu', () => {
    const guard = createStallGuard(1_000);
    vi.advanceTimersByTime(999);
    expect(guard.stalled).toBe(false);
    vi.advanceTimersByTime(1);
    expect(guard.stalled).toBe(true);
    expect(guard.signal.aborted).toBe(true);
  });

  it('une progression régulière le garde en vie bien au-delà du délai', () => {
    const guard = createStallGuard(1_000);
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(800);
      guard.tick();
    }
    // 8 secondes écoulées pour un délai d'une seconde : c'est l'inactivité qui
    // compte, pas la durée totale.
    expect(guard.stalled).toBe(false);
    guard.stop();
  });

  it('arrêté, il ne se déclenche plus', () => {
    const guard = createStallGuard(1_000);
    guard.stop();
    vi.advanceTimersByTime(5_000);
    expect(guard.stalled).toBe(false);
  });
});
