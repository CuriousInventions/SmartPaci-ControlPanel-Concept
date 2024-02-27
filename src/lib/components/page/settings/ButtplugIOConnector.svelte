<script lang="ts">
	import buttplugIOStore from '$lib/stores/buttplugIOStore';
</script>

<div class="bg-gradient-to-tr from-blue-600/40 to-sky-400/40 rounded-md p-[2px]">
	<div class="bg-slate-50 rounded p-3 text-slate-800">
		<h2 class="text-lg font-comforta font-extrabold mb-1">Connect Intiface (Buttplug.io)</h2>
		<button
			class="bg-slate-500 text-white rounded p-2 w-full"
			on:click={buttplugIOStore.connectClient}>Connect Intiface<br />(ws://localhost:12345)</button
		>
	</div>
</div>
