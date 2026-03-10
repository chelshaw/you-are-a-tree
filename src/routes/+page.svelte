<script lang="ts">
	import Controls from '$lib/Controls.svelte';
	import DebugClock from '$lib/DebugClock.svelte';
	import DebugTree from '$lib/DebugTree.svelte';
	import { gameState } from '$lib/core/gamestate';
</script>

<h1>You are a tree</h1>
<DebugClock />
<DebugTree />
<Controls />

{#if $gameState.status === 'awaiting_input'}
	<!-- <SpecialEventPanel
    event={$gameState.pendingEvent}
    on:resolve={e => engine.resolveEvent(e.detail)}
  /> -->
{/if}

<!-- <HUD hp={$gameState.tree.hp} clock={$gameState.clock} />
  <ActionBar on:action={e => engine.spendHP(e.detail)} /> -->
