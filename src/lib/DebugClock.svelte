<script lang="ts">
	import { getSeason } from '$lib/core/clock';
	import { gameState } from '$lib/core/gamestate';
</script>

<h2>Clock</h2>
<dl>
	<dt>Year</dt>
	<dd>{$gameState.clock.cycle}</dd>
	<dt>Season</dt>
	<dd>{getSeason($gameState.clock.position)}</dd>
	<pre>pos: {$gameState.clock.position}</pre>
</dl>
