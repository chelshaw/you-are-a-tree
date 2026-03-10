import type { GameClock } from './types';

const CYCLE_DURATION_MS = 1000 * 60 * 1; // 4 minutes per cycle (year)

// getSeason returns the current season based on the position in the cycle
// 0 is winter solstice, 0.25 is spring equinox, 0.5 is summer solstice, 0.75 is autumn equinox
export const getSeason = (pos: number): string => {
	if (pos < 0.25) return 'winter';
	if (pos < 0.5) return 'spring';
	if (pos < 0.75) return 'summer';
	return 'autumn';
};

export const getDay = (pos: number, daysPerCycle = 120): number =>
	Math.floor(pos * daysPerCycle) + 1;

// Advancing the clock
export function advanceClock(
	clock: GameClock,
	elapsedMs: number,
	speedMultiplier: number
): GameClock {
	const tickSize = (elapsedMs / CYCLE_DURATION_MS) * speedMultiplier;
	const newPosition = clock.position + tickSize;

	if (newPosition >= 1.0) {
		return { cycle: clock.cycle + 1, position: newPosition - 1.0 };
	}
	return { ...clock, position: newPosition };
}
