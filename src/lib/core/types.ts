export type GameClock = {
	cycle: number; // which year we're on (integer, ever-increasing)
	position: number; // 0.0–1.0, position within current cycle
};

type TreeState = { height: number; girth: number; leafiness: number };

type PendingEvent = {
	type: string;
};

export type GameState = {
	status: 'paused' | 'running' | 'awaiting_input';
	php: number; // photosynthesis energy
	clock: GameClock;
	tree: TreeState;
	pendingEvent: PendingEvent | undefined;
};

// DEFAULTS

const DEFAULT_CLOCK: GameClock = {
	cycle: 1,
	position: 0.25 // start at beginning of spring
};
export const initialGameState: GameState = {
	status: 'awaiting_input',
	clock: DEFAULT_CLOCK,
	php: 0,
	tree: { height: 1, girth: 1, leafiness: 1 },
	pendingEvent: {
		type: 'start_game'
	}
};
