export type GameClock = {
	cycle: number; // which year we're on (integer, ever-increasing)
	position: number; // 0.0–1.0, position within current cycle
};

const DEFAULT_CLOCK: GameClock = {
	cycle: 1,
	position: 0.25 // start at beginning of spring
};

type TreeState = { height: number; girth: number; leafiness: number };

export type GameState = {
	status: 'paused' | 'running' | 'awaiting_input';
	clock: GameClock;
	tree: TreeState;
	php: number; // photosynthesis energy
};

export const initialGameState: GameState = {
	status: 'paused',
	clock: DEFAULT_CLOCK,
	php: 0,
	tree: { height: 1, girth: 1, leafiness: 1 }
};
