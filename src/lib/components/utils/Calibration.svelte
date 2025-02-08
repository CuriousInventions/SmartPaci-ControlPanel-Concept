<script lang="ts">
	import paciStore from '$lib/stores/paciStore';
	import { Button, Modal } from 'flowbite-svelte';
	export let open = false;
	export let sensor: null | 'bite' | 'suck' = null;

	paciStore.connect;
</script>

<Modal bind:open>
	<p class="strike">
		I guess it'd be good to put instructions here on how to calibrate the sensor....
	</p>
	<Button
		color="alternative"
		on:click={async () => {
			if (sensor != null) paciStore.calibrate(sensor, 'max');
		}}
	>
		Max
	</Button>
	<Button
		color="alternative"
		on:click={async () => {
			if (sensor != null) paciStore.calibrate(sensor, 'min');
		}}
	>
		Min
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
