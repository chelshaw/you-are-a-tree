<script lang="ts">
	import { getSeason } from '$lib/core/clock';
	import { engine } from '$lib/core/engine';
	import { gameState } from '$lib/core/gamestate';
</script>

<h1>You are a tree</h1>
<p>Year: {$gameState.clock.cycle}</p>
<p>Season: {getSeason($gameState.clock.position)}</p>
<pre>pos: {$gameState.clock.position}</pre>
<button on:click={() => engine.start()}>Start (speed {engine.speed})</button>
<button on:click={() => engine.pause()}>Pause</button>

{#if $gameState.status === 'awaiting_input'}
	<!-- <SpecialEventPanel
    event={$gameState.pendingEvent}
    on:resolve={e => engine.resolveEvent(e.detail)}
  /> -->
{/if}

<!-- <HUD hp={$gameState.tree.hp} clock={$gameState.clock} />
  <ActionBar on:action={e => engine.spendHP(e.detail)} /> -->
