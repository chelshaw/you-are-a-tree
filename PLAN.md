# You Are A Tree — Build Plan & Cheatsheet

> A meditative idle/incremental game. You are a tree. Survive as many cycles as possible by growing, adapting, and giving back to the systems that sustain you.

---

## Table of Contents

1. [Concept Summary](#concept-summary)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [The Game Clock](#the-game-clock)
5. [The Game Loop](#the-game-loop)
6. [HP Economy](#hp-economy)
7. [The Soil System](#the-soil-system)
8. [Seasonal Design](#seasonal-design)
9. [Scheduled Events](#scheduled-events)
10. [The Math Cheatsheet](#the-math-cheatsheet)
11. [Build Phases](#build-phases)
12. [State Management](#state-management)
13. [Persistence & Auth](#persistence--auth)
14. [Visual Layer](#visual-layer)
15. [Balancing Workflow](#balancing-workflow)
16. [Design Principles to Protect](#design-principles-to-protect)

---

## Concept Summary

- Player is a tree sapling growing through seasonal cycles
- HP is earned by photosynthesis (leaf surface × sunlight) and spent on growth decisions
- The soil ecosystem is a living character — neglect it and it deteriorates, invest in it and it becomes an ally
- Climate starts stable, becomes increasingly volatile over cycles
- **Goal:** survive as many cycles as possible — no win state, just a leaderboard
- **Core lesson:** survival requires giving back to the systems that sustain you

---

## Tech Stack

| Layer           | Choice                          | Reason                                                                                                                       |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | Svelte + TypeScript             | Push-based reactivity is a natural fit for a game loop; stores update from outside components without hooks or subscriptions |
| State           | Svelte stores + plain TS engine | Writable stores for UI-reactive state; game engine is a plain TS class that owns the authoritative state                     |
| Canvas / Art    | PixiJS                          | 2D rendering, particle systems, fully decoupled from Svelte                                                                  |
| Animations (UI) | Svelte built-in transitions     | `transition:`, `animate:`, spring physics — first-class, no extra library needed                                             |
| Backend         | Supabase (free tier)            | Auth + Postgres + REST API, near-zero cost                                                                                   |
| Deployment      | Vercel                          | Free, fast CDN, zero config for SvelteKit                                                                                    |
| Noise           | simplex-noise                   | Organic environmental variation                                                                                              |

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│             Svelte UI Layer             │
│   Panels, menus, decisions, HUD         │
│   Built-in transitions for animations  │
├─────────────────────────────────────────┤
│           Svelte Writable Stores        │
│   Reactive bridge between engine & UI  │
│   UI subscribes with $ prefix, no hooks │
├─────────────────────────────────────────┤
│         Game Engine (plain TS class)    │
│   Tick loop, clock, event queue         │
│   Owns authoritative state              │
│   Pushes to Svelte stores at render rate│
├─────────────────────────────────────────┤
│            PixiJS Canvas                │
│   Background art, particles, soil viz   │
│   Mounted once, reads engine state      │
├─────────────────────────────────────────┤
│         Supabase (optional)             │
│   Auth + JSON save blobs per user       │
└─────────────────────────────────────────┘
```

**Key principle:** The game engine is a plain TypeScript class with no knowledge of Svelte, Pixi, or Supabase. It owns authoritative game state internally and pushes snapshots to Svelte stores for the UI to render. Player actions call engine methods directly. This separation means:

- The tick loop never fights a framework's rendering model
- Player actions (spend HP, invest in soil) are synchronous engine calls — no UI state round-trips
- The engine can be tested in isolation
- Future multiplayer is an infrastructure problem, not a logic rewrite

---

## The Game Clock

Time is **cyclical**, not linear. No timestamps. No relationship to real time.

```typescript
type GameClock = {
  cycle: number; // which year we're on (integer, ever-increasing)
  position: number; // 0.0–1.0, position within current cycle
};

// Derived helpers
const getSeason = (pos: number): Season => {
  if (pos < 0.25) return "spring";
  if (pos < 0.5) return "summer";
  if (pos < 0.75) return "autumn";
  return "winter";
};

const getDay = (pos: number, daysPerCycle = 120): number =>
  Math.floor(pos * daysPerCycle) + 1;

// Advancing the clock
function advanceClock(
  clock: GameClock,
  elapsed: number,
  speedMultiplier: number,
): GameClock {
  const tickSize = (elapsed / CYCLE_DURATION_MS) * speedMultiplier;
  const newPosition = clock.position + tickSize;

  if (newPosition >= 1.0) {
    return { cycle: clock.cycle + 1, position: newPosition - 1.0 };
  }
  return { ...clock, position: newPosition };
}
```

**Why this works:**

- Speed-up is just a multiplier — no special cases
- Scheduled events fire at `position` thresholds, not timestamps
- Cycle count gives long-term progression without polluting the seasonal feel
- No timezone, DST, or system clock issues

---

## The Game Loop

The engine is a plain TypeScript class. It has no dependency on Svelte — it pushes state snapshots to a writable store at render rate, not tick rate.

```typescript
// engine.ts
import { gameState } from "./stores";

const TICK_MS = 100;

class GameEngine {
  private state: GameState = initialState;
  private lastTick: number = 0;
  private animFrame: number | null = null;

  begin(initialClock?: Partial<GameClock>) {
    this.state = {
      ...initialState,
      clock: { ...DEFAULT_CLOCK, ...initialClock },
      phase: "running",
    };
    this.lastTick = Date.now();
    this.scheduleNextTick();
    this.setupVisibilityPause();
  }

  private tick() {
    const now = Date.now();
    const elapsed = now - this.lastTick;

    if (elapsed >= TICK_MS && this.state.phase === "running") {
      this.lastTick = now;
      const prevPosition = this.state.clock.position;
      this.state = advanceGameState(this.state, elapsed);
      processEvents(prevPosition, this.state.clock.position, this.state);
      gameState.set(this.state); // push to Svelte store — UI updates here
    }

    this.animFrame = requestAnimationFrame(() => this.tick());
  }

  // Player actions — called directly, no UI state round-trip
  spendHP(action: PlayerAction) {
    this.state = applyPlayerAction(this.state, action);
    gameState.set(this.state);
  }

  resolveEvent(choice: Choice) {
    this.state = applyEventChoice(this.state, choice);
    this.state = { ...this.state, phase: "running", pendingEvent: null };
    gameState.set(this.state);
  }

  private setupVisibilityPause() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.state = { ...this.state, phase: "paused" };
        gameState.set(this.state);
      } else if (this.state.phase === "paused") {
        this.lastTick = Date.now(); // reset — no catch-up
        this.state = { ...this.state, phase: "running" };
        gameState.set(this.state);
      }
    });
  }

  private scheduleNextTick() {
    this.animFrame = requestAnimationFrame(() => this.tick());
  }

  getState(): GameState {
    return this.state;
  }
  serialize(): SaveBlob {
    return { version: 1, savedAt: Date.now(), gameState: this.state };
  }
  loadFrom(blob: SaveBlob) {
    this.state = blob.gameState;
    gameState.set(this.state);
  }
}

export const engine = new GameEngine();
```

```typescript
// stores.ts
import { writable } from "svelte/store";
export const gameState = writable<GameState>(initialState);
```

```svelte
<!-- GameUI.svelte — clean, no hook management -->
<script lang="ts">
  import { gameState } from './stores';
  import { engine } from './engine';
</script>

{#if $gameState.phase === 'awaiting_input'}
  <SpecialEventPanel
    event={$gameState.pendingEvent}
    on:resolve={e => engine.resolveEvent(e.detail)}
  />
{:else}
  <HUD hp={$gameState.tree.hp} clock={$gameState.clock} />
  <ActionBar on:action={e => engine.spendHP(e.detail)} />
{/if}
```

**Why this works:**

- The engine ticks freely at 100ms intervals — Svelte only re-renders when `gameState.set()` is called
- Player actions (`spendHP`, `resolveEvent`) are synchronous and immediate — no async state round-trips
- `phase === 'awaiting_input'` pauses the engine's tick logic; Svelte reactively swaps the UI
- `visibilitychange` resets `lastTick` on return — no catch-up, no offline progression

---

## HP Economy

HP is the player's energy currency — earned by photosynthesis, spent on decisions.

```typescript
type TreeState = {
  hp: number;
  leafSurface: number; // 0–1, determines photosynthesis rate
  rootDepth: number; // 0–1, determines soil interaction quality
  rootBreadth: number; // 0–1, determines moisture access
  branchCount: number; // integer, determines max leaf surface
  age: number; // cycles survived
};

function photosynthesisIncome(
  tree: TreeState,
  soil: SoilState,
  clock: GameClock,
  noise: number,
): number {
  const sunlight = getSeasonalSunlight(clock) * (0.85 + 0.15 * noise); // noisy
  const soilBonus = getSoilBonus(soil); // 0–1 multiplier
  return tree.leafSurface * sunlight * soilBonus;
}
```

**Budget sketch (tune this before coding):**

| Season | Base Income | Maintenance | Net Margin         |
| ------ | ----------- | ----------- | ------------------ |
| Spring | Medium      | Low         | Positive — invest  |
| Summer | High        | Medium      | Positive — grow    |
| Autumn | Low         | Medium      | Thin — prepare     |
| Winter | Very Low    | High        | Negative — survive |

**Design target:** Player should be operating near-zero margin in winter. Decisions only feel meaningful under scarcity.

---

## The Soil System

The soil is a living character with its own internal dynamics. Keep each relationship simple; let interactions create complexity.

```typescript
type SoilState = {
  organicMatter: number; // 0–1, primary resource pool
  microbialActivity: number; // 0–1, drives nutrient cycling
  moisture: number; // 0–1, affected by season and roots
  fungalNetwork: number; // 0–1, the mycorrhizal relationship
};
```

### Internal Dynamics (per tick)

```typescript
function updateSoil(
  soil: SoilState,
  tree: TreeState,
  clock: GameClock,
  treeInvestment: number,
): SoilState {
  const season = getSeason(clock.position);

  // Organic matter: replenished by fungal network + leaf litter, depleted over time
  const organicDecay = 0.0002;
  const fungalReplenishment = soil.fungalNetwork * 0.0003;
  const leafLitter = season === "autumn" ? 0.0005 : 0.0001;
  const newOrganicMatter = clamp(
    soil.organicMatter - organicDecay + fungalReplenishment + leafLitter,
  );

  // Microbial activity: depends on organic matter AND moisture
  const targetMicrobial = soil.organicMatter * soil.moisture;
  const newMicrobial = lerp(soil.microbialActivity, targetMicrobial, 0.01); // lags behind

  // Moisture: seasonal baseline + root breadth influence
  const seasonalMoisture = getSeasonalMoisture(season);
  const rootInfluence = tree.rootBreadth * 0.1;
  const newMoisture = clamp(
    lerp(soil.moisture, seasonalMoisture + rootInfluence, 0.005),
  );

  // Fungal network: grows with tree investment, decays without it
  const fungalGrowth = treeInvestment * 0.01;
  const fungalDecay = 0.0003;
  const newFungal = clamp(soil.fungalNetwork + fungalGrowth - fungalDecay);

  return {
    organicMatter: newOrganicMatter,
    microbialActivity: newMicrobial,
    moisture: newMoisture,
    fungalNetwork: newFungal,
  };
}
```

### Soil → Tree Benefits (threshold-based, not smooth)

```typescript
function getSoilBonus(soil: SoilState): number {
  const health =
    (soil.organicMatter + soil.microbialActivity + soil.fungalNetwork) / 3;

  if (health > 0.7) return 1.4; // thriving: meaningful bonus
  if (health > 0.5) return 1.0; // healthy: baseline
  if (health > 0.3) return 0.7; // stressed: noticeable penalty
  return 0.3; // collapsing: severe penalty
}
```

**Important:** The tipping points should feel surprising. The player should not see "0.5 threshold" — they should just feel the floor drop out.

### Lag Effects

Soil consequences should arrive **1–2 seasons after** the cause. Track a rolling average or use a delayed variable. This is the mechanic that teaches "ecosystems have memory."

---

## Seasonal Design

Each season has a distinct mechanical identity and emotional register.

| Season | Sunlight | Moisture | Maintenance Cost | Strategic Priority                |
| ------ | -------- | -------- | ---------------- | --------------------------------- |
| Spring | Medium   | High     | Low              | Grow aggressively                 |
| Summer | High     | Low      | Medium           | Expand leaf surface; drought risk |
| Autumn | Low      | Medium   | Medium           | Invest in soil before winter      |
| Winter | Very Low | Medium   | High             | Survive; soil investment pays off |

### Milestone Years

Every N cycles, a significant environmental event punctuates the meditative rhythm:

- Cycle 3: First drought summer
- Cycle 5: Early frost (winter arrives at 0.6 instead of 0.75)
- Cycle 8: Pest outbreak — leaf surface temporarily reduced
- Cycle 12+: Climate volatility increases permanently (noise amplitude scales with `cycle`)

```typescript
// Climate volatility increases over time
const volatility = Math.min(0.1 + cycle * 0.008, 0.5);
const sunlight = baseSunlight + volatility * simplexNoise(gameTime);
```

---

## Scheduled Events

Events fire at `position` thresholds, not timestamps. This handles speed-up naturally.

```typescript
type ScheduledEvent = {
  id: string;
  triggerPosition: number; // 0.0–1.0 within cycle
  triggerCycle?: number; // if undefined, fires every cycle
  type: EventType;
  payload?: unknown;
};

function processEvents(
  prevPos: number,
  nextPos: number,
  cycle: number,
  events: ScheduledEvent[],
) {
  // Handle cycle wrap (prevPos > nextPos means we crossed 1.0)
  const wrapped = nextPos < prevPos;

  const due = events.filter((e) => {
    const matchesCycle =
      e.triggerCycle === undefined || e.triggerCycle === cycle;
    const inWindow = wrapped
      ? e.triggerPosition > prevPos || e.triggerPosition <= nextPos
      : e.triggerPosition > prevPos && e.triggerPosition <= nextPos;
    return matchesCycle && inWindow;
  });

  // Sort by position to preserve causality at high speed
  due.sort((a, b) => a.triggerPosition - b.triggerPosition);
  due.forEach(handleEvent);
}
```

**"Pause for user input" events:** transition `gamePhase` to `'awaiting_input'`. Stop advancing clock. Resume on player action.

```typescript
type GamePhase = "running" | "awaiting_input" | "paused";
```

---

## The Math Cheatsheet

### Curve Types

```typescript
// Linear — default, use first
const value = base - decayRate * elapsed;

// Exponential decay — neglect compounds
soil.health *= 0.999; // loses ~0.1% per tick, accelerates toward 0

// Logistic (S-curve) — natural growth and recovery
const logistic = (x: number, k = 10) => 1 / (1 + Math.exp(-k * (x - 0.5)));

// Lerp — smooth approach to target (good for soil lag)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Clamp — always normalize outputs
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
```

### Noise

```typescript
import { createNoise2D } from "simplex-noise";
const noise2D = createNoise2D();

// Organic sunlight variation
const sunlight = 0.7 + 0.3 * noise2D(clock.position * 3, clock.cycle * 0.1);

// Layered noise (weather patterns + daily variation)
const weather =
  0.6 * noise2D(clock.position * 2, clock.cycle) +
  0.4 * noise2D(clock.position * 10, clock.cycle);
```

### Key Formulas

```typescript
// Photosynthesis income
hp_income = leafSurface × sunlight × soilBonus × seasonMultiplier

// Soil composite health (used for display and thresholds)
soilHealth = (organicMatter + microbialActivity + fungalNetwork) / 3

// Climate volatility (scales with age)
volatility = clamp(0.1 + cycle * 0.008, 0, 0.5)

// Leaderboard score
score = cycle + (soilHealth * 0.5) // reward cycles survived + ecosystem stewardship
```

---

## Build Phases

### Phase 1 — The Clock and Loop

**Goal:** Time advances. Seasons cycle. Debug view only.

- Game engine class with clock, tick loop, `begin()` method
- `gameState` Svelte store wired to engine
- `visibilitychange` pause/resume in engine
- Speed multiplier (slow, normal, fast)
- Svelte debug component showing raw store values

**Done when:** You can watch a full cycle pass at multiple speeds and see it wrap correctly.

### Phase 2 — The HP Economy

**Goal:** Basic photosynthesis loop is playable. Decisions exist.

- `leafSurface`, `rootDepth` as tree stats
- HP income per tick
- 2–3 spending options (grow branch, grow root, idle)
- Seasonal sunlight multiplier
- No soil yet

**Done when:** You're making real tradeoffs and some seasons feel harder than others.

### Phase 3 — The Soil as Character

**Goal:** Soil has internal dynamics. Neglect has consequences.

- Full `SoilState` with interactions
- Tree investment mechanic
- Threshold-based soil bonus
- Lag effects (1–2 season delay on consequences)
- Visible soil feedback (even if abstract)

**Done when:** You've neglected soil for two cycles and felt it hurt. Then recovered it. Tune obsessively here.

### Phase 4 — Seasonal Differentiation + Events

**Goal:** Each season feels distinct. Events fire correctly at high speed.

- Per-season constants tuned
- Scheduled event queue
- Milestone year events (drought, frost, pests)
- `awaiting_input` phase for player decisions
- Climate volatility scaling with cycle count

**Done when:** Year 5 feels meaningfully harder than Year 1.

### Phase 5 — Art and Feel

**Goal:** The game feels like itself.

- PixiJS canvas with particle background (mounted via Svelte `onMount`)
- Seasonal visual transitions (color palette, particle behavior)
- Svelte built-in transitions for panel animations (`transition:fly`, `transition:fade`)
- `svelte/motion` spring values for physical UI feedback
- Sound design (ambient, seasonal, soil health feedback)
- Soil visualization (abstract noise — the player senses something is there)

**Done when:** You'd show it to someone without apologizing.

### Phase 6 — Persistence and Leaderboard

**Goal:** Save/load works. Scores are recorded.

- Supabase auth (optional login)
- Game state serialized to JSON, saved as blob
- `localStorage` autosave as fallback for logged-out play
- Cycle count leaderboard
- Load saved state on login

**Done when:** You can close the tab, return, and continue or start fresh with your score recorded.

---

## State Management

State lives in two places with clearly defined roles:

**The engine** owns authoritative game state as a plain TypeScript object. It is the source of truth. Nothing mutates it except engine methods.

**Svelte stores** are a reactive snapshot of engine state for the UI. They are write-only from the engine's perspective — the UI reads them with `$`, never writes back.

```typescript
// stores.ts — UI-reactive snapshots only
import { writable } from "svelte/store";

export const gameState = writable<GameState>(initialState);

// Optionally, derived stores for expensive computations
import { derived } from "svelte/store";
export const soilHealth = derived(
  gameState,
  ($s) =>
    ($s.soil.organicMatter +
      $s.soil.microbialActivity +
      $s.soil.fungalNetwork) /
    3,
);
```

```typescript
// The authoritative state shape — lives inside the engine class
type GameState = {
  clock: GameClock;
  phase: "idle" | "running" | "awaiting_input" | "paused";
  tree: TreeState;
  soil: SoilState;
  events: ScheduledEvent[];
  speedMultiplier: number;
  pendingEvent: GameEvent | null;
  soilHistory: number[]; // rolling window for lag effects
};
```

**Rules:**

- All state transitions are pure functions: `(state, input) => newState`
- Never mutate state directly — always return new objects (spread operator)
- Serializing to JSON must always work — no functions, no circular refs
- All tunable values live in `constants.ts` — never hardcode rates inline

```typescript
// constants.ts — tune here, never in logic files
export const CONSTANTS = {
  CYCLE_DURATION_MS: 5 * 60 * 1000, // 5 real minutes per cycle
  ORGANIC_DECAY_RATE: 0.0002,
  FUNGAL_DECAY_RATE: 0.0003,
  SOIL_LAG_SEASONS: 1.5,
  VOLATILITY_PER_CYCLE: 0.008,
  // ...
};
```

---

## Persistence & Auth

**Logged-out flow:** Autosave to `localStorage` every 30 seconds. On load, restore from `localStorage` if present.

**Logged-in flow:** On login, fetch save blob from Supabase. On meaningful actions and periodic intervals, push updated state blob. `localStorage` remains as a fast cache.

```typescript
// Save blob shape
type SaveBlob = {
  version: number; // for migration handling
  savedAt: number; // real timestamp for display
  gameState: GameState;
};
```

**Leaderboard:** Simple Supabase table — `user_id`, `cycles_survived`, `final_soil_health`, `achieved_at`. Query top N on game over screen.

---

## Visual Layer

PixiJS mounts once into a DOM node in a Svelte `onMount` and runs its own loop, reading directly from the engine:

```svelte
<!-- GameCanvas.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as PIXI from 'pixi.js';
  import { engine } from './engine';

  let container: HTMLDivElement;
  let app: PIXI.Application;

  onMount(() => {
    app = new PIXI.Application({ resizeTo: container });
    container.appendChild(app.view as HTMLCanvasElement);
    startGameRenderer(app, engine); // Pixi loop reads engine.getState()
  });

  onDestroy(() => app?.destroy());
</script>

<div bind:this={container} class="game-canvas" />
```

No Strict Mode double-invocation issues. `onMount` runs exactly once.

**Soil visualization:** Use particle density, color warmth, and animation speed to reflect soil health — without ever showing a number. The player should _sense_ the soil's state before they understand it.

**Seasonal palette:** Transition background color, particle color, and ambient light smoothly as `clock.position` advances. No hard cuts.

**Svelte transitions for UI panels:** Use built-in `transition:fly` or `transition:fade` for panel entry/exit. Spring physics via `svelte/motion` for any value that should feel physical (HP meter, soil indicator).

---

## Balancing Workflow

1. **Spreadsheet first.** Model a full 4-season cycle with proposed numbers before writing code. Simulate "good player" vs "neglectful player" runs.
2. **Debug overlay always on during dev.** Show all raw 0–1 values on screen. You'll spend hours watching these.
3. **Expose all constants as runtime-tuneable** — a dev panel that lets you change decay rates without reloading saves days of iteration.
4. **Plot your curves.** Use [Desmos](https://desmos.com) to visualize curve shapes before implementing. Check that thresholds land where you want them.
5. **Playtest with soil neglect deliberately.** The neglect → collapse path needs to feel instructive, not punishing. Tune until it does.

---

## Design Principles to Protect

These are easy to erode under the pressure of adding features. Revisit this list often.

- **The tree can die, but struggles visibly first.** Death should feel like the end of a long effort, not a sudden punishment. The tree deteriorates slowly, carries the marks of its decisions, and dies later than it looks like it will.
- **Decisions are infrequent but weighty.** Don't ask for input every few seconds. Let the game breathe. The pause-for-input moments should feel like they matter.
- **Soil complexity is discovered, not explained.** The player should notice something is there before understanding it. Abstract visualization, not a health bar and a tooltip.
- **Lag effects are features.** Consequences arriving 1–2 seasons late is the lesson. Don't shorten this to make the game feel more responsive.
- **Simplicity in individual mechanics, complexity in interactions.** Resist writing complicated formulas. Write simple ones that talk to each other.
- **The leaderboard is not the game.** Build the solo experience until it's worth playing for its own sake before optimizing for score.
