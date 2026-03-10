import { advanceClock, DEFAULT_CLOCK, type GameClock } from "./utils/clock";

type TreeState = {
  height: number;
  girth: number;
  leafiness: number;
};

type GameState = {
  clock: GameClock;
  tree: TreeState;
  php: number; // photosynthesis energy
};

function advanceGameState(state: GameState, elapsed: number): GameState {
  // For now, just advance the clock; tree doesn't do anything yet
  const clock = advanceClock(state.clock, elapsed, 1); // speed multiplier hardcoded to 1 for now
  // earn HP
  // check for events
  return {
    ...state,
    clock,
  };
}

// TODO: flesh this out
type PlayerAction = {
  amount: number;
  target: "height" | "girth" | "leafiness";
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

  constructor() {
    this.state = {
      clock: DEFAULT_CLOCK,
      php: 0,
      tree: {
        height: 1,
        girth: 1,
        leafiness: 1,
      },
    };
  }

  tick(elapsed: number) {
    this.state = advanceGameState(this.state, elapsed);
    this.notify(); // only called at render rate, not every tick
  }

  // React (or Svelte) subscribes here
  subscribe(fn: (state: GameState) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Player actions called directly — no React event needed
  spendHP(action: PlayerAction) {
    console.log("Player action:", action);
    this.state = applyPlayerAction(this.state);
    this.notify();
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }
}

export const engine = new GameEngine();
