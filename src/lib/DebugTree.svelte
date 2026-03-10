<script lang="ts">
	import { gameState } from '$lib/core/gamestate';
</script>

<h2>Tree</h2>
<dl>
	<dt>HP</dt>
	<dd>{$gameState.php}</dd>
	<dt>Height</dt>
	<dd>{$gameState.tree.height}</dd>
	<dt>Girth</dt>
	<dd>{$gameState.tree.leafiness}</dd>
</dl>
