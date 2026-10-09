/** Timings are independent of model loading and of frame rate. */
export const INTRO_DURATION = 9;
export const STRIKE_AT = 3.55;
export const REVEAL_AT = 4.65;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => { n = clamp(n); return n * n * (3 - 2 * n); };
export function introFrame(seconds: number) {
  const t = Math.max(0, seconds);
  return {
    time: t,
    emerge: ease((t - 0.25) / 1.5),
    energy: ease((t - 0.8) / 1.5),
    strike: clamp((t - STRIKE_AT) / 0.85),
    cut: ease((t - STRIKE_AT - 0.2) / 0.18) * (1 - ease((t - STRIKE_AT - 0.55) / 0.7)),
    reveal: ease((t - REVEAL_AT) / 1.2),
    finish: t >= INTRO_DURATION,
    phase: t < STRIKE_AT ? 'emergence' : t < REVEAL_AT ? 'strike' : 'signature',
  };
}
