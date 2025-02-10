<script lang="ts">
	import buttplugIOStore from '$lib/stores/buttplugIOStore';
</script>

<div class="bg-gradient-to-tr from-blue-600/40 to-sky-400/40 rounded-md p-[2px]">
	<div class="bg-slate-50 rounded p-3 text-slate-800">
		{#if $buttplugIOStore.connection == 'disconnected'}
			<h2 class="text-lg font-comforta font-extrabold mb-1">Intiface (Buttplug.io)</h2>
			<button
				class="bg-slate-500 text-white rounded p-2 w-full"
				onclick={buttplugIOStore.connectClient}
				>Connect Intiface<br />(ws://localhost:12345)</button
			>
		{:else if $buttplugIOStore.connection == 'connecting'}
			<h2 class="text-lg font-comforta font-extrabold mb-1">Intiface (Buttplug.io)</h2>
			<button disabled class="bg-primary-500 text-white rounded p-2 w-full">Connecting...</button>
		{:else if $buttplugIOStore.connection == 'connected'}
			<h2 class="text-lg font-comforta font-extrabold mb-1">Connected to Intiface</h2>
			<button
				onclick={buttplugIOStore.disconnectClient}
				class="border-2 border-red-600/90 hover:bg-red-600/100 transition-all duration-200 p-2 w-full rounded text-red-600 hover:text-white"
				>Disconnect</button
			>
			<ol class="list-disc ps-5 mt-2 space-y-1">
				{#each $buttplugIOStore.devices as device}
					<li>{device.name}</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
