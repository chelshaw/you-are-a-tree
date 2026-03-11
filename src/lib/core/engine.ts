import { advanceClock } from './clock';
import { gameState } from './gamestate';
import { type GameState, initialGameState } from './types';

const TICK_MS = 1000; // how often ticks happen, in milliseconds

function advanceGameState(state: GameState, elapsed: number, speed: number): GameState {
	// For now, just advance the clock; tree doesn't do anything yet
	const clock = advanceClock(state.clock, elapsed, speed);
	// earn HP
	// check for events
	return {
		...state,
		clock
	};
}

// TODO: flesh this out
type PlayerAction = {
	amount: number;
	target: 'height' | 'girth' | 'leafiness';
};

// TODO: take in action
function applyPlayerAction(state: GameState): GameState {
	// For now, just a stub; no actual actions implemented yet
	return state;
}

// engine.ts — completely framework-agnostic
class GameEngine {
	private state: GameState;
	private listeners: Set<(state: GameState) => void> = new Set();
	private animFrame: number | null = null;
	private lastTick: number = 0;
	speed: number = 1; // speed multiplier for time-based events

	constructor() {
		this.state = initialGameState;
	}

	private startClock() {
		if (this.animFrame !== null) return; // already running — no double-start
		this.lastTick = Date.now();
		this.animFrame = requestAnimationFrame(() => this.tick());
	}

	private stopClock() {
		if (this.animFrame === null) return;
		cancelAnimationFrame(this.animFrame);
		this.animFrame = null;
	}

	private tick() {
		const now = Date.now();
		const elapsed = now - this.lastTick;

		if (elapsed >= TICK_MS && this.state.status === 'running') {
			this.lastTick = now;
			// const prevPosition = this.state.clock.position;
			this.state = advanceGameState(this.state, elapsed, this.speed);
			// processEvents(prevPosition, this.state.clock.position, this.state);
			this.notify();
		}

		this.animFrame = requestAnimationFrame(() => this.tick());
	}

	private notify() {
		gameState.set(this.state); // update the Svelte store with the new state
		this.listeners.forEach((fn) => {
			fn(this.state);
		});
	}

	// React (or Svelte) subscribes here
	subscribe(fn: (state: GameState) => void) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	// PLAYER ACTIONS
	start() {
		this.state.status = 'running';
		this.startClock();
		this.notify();
	}

	pause() {
		this.state.status = 'paused';
		this.stopClock();
		this.notify();
	}
	spendHP(action: PlayerAction) {
		console.log('Player action:', action);
		this.state = applyPlayerAction(this.state);
		this.notify();
	}
}

export const engine = new GameEngine();
