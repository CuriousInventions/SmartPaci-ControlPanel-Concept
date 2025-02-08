<script lang="ts">
	import paciStore from '$lib/stores/paciStore';
	import { Button, Modal } from 'flowbite-svelte';
	export let open = false;
	export let sensor: null | 'bite' | 'suck' = null;

	paciStore.connect;
</script>

<Modal bind:open>
	<ol class="list-decimal ps-5 mt-2 space-y-1">
		<li>Take the pacifier out of your mouth and click <b>It's out!</b></li>
		<li>Popthe pacifier back in your mouth and bite down comfortably on the nipple. then click <b>Nom nom nom</b></li>
	</ol>
	<Button
		color="alternative"
		on:click={async () => {
			if (sensor != null) paciStore.calibrate(sensor, 'min');
		}}
	>
		It's out!
	</Button>
	<Button
		color="alternative"
		on:click={async () => {
			if (sensor != null) paciStore.calibrate(sensor, 'max');
		}}
	>
		Nom nom nom
	</Button>
	<svelte:fragment slot="footer">
		<Button
			class="ms-auto"
			on:click={() => {
				open = false;
			}}>Close</Button
		>
	</svelte:fragment>
</Modal>
