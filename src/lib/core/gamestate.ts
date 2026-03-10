import { writable } from 'svelte/store';
import { type GameState, initialGameState } from './engine';

export const gameState = writable<GameState>(initialGameState);
