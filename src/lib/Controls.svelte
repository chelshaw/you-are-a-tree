<script lang="ts">
	import { engine } from '$lib/core/engine';
</script>

<button on:click={() => engine.start()}>Start (speed {engine.speed})</button>
<button on:click={() => engine.pause()}>Pause</button>
<select bind:value={engine.speed}>
	<option value="1" selected={engine.speed == 1}>1x</option>
	<option value="2" selected={engine.speed === 2}>2x</option>
	<option value="5" selected={engine.speed === 5}>5x</option>
</select>
