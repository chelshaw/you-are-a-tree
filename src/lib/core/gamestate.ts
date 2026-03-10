import { writable } from 'svelte/store';
import { type GameState, initialGameState } from './types';

export const gameState = writable<GameState>(initialGameState);
