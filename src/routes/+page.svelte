<script lang="ts">
	import Container from '$lib/components/layout/Container.svelte';
	import Loader from '$lib/components/utils/Loader.svelte';
	import LoadingBar from '$lib/components/utils/LoadingBar.svelte';

	import paciStore from '$lib/stores/paciStore';

	/** True whenever the paci is connected or reconnecting*/
	let showAsConnected = false;
	const showConnectedStates = ['connected', 'reconnecting'];
	$: showAsConnected = showConnectedStates.includes($paciStore.connectionState);
</script>

<Container>
	<div class="flex justify-center flex-wrap">
		<div class="w-full md:w-4/12 xl:w-3/12 mb-4">
			<div class="bg-gradient-to-tr from-blue-600/40 to-sky-400/40 rounded-md p-[2px] mb-3">
				<div class="bg-slate-50 rounded p-3 text-slate-800">
					<h2 class="text-lg font-comforta font-extrabold mb-1">
						{showAsConnected ? 'Connected' : 'Not Connected'}
						{#if $paciStore.connectionState === 'reconnecting'}
							<div class="text-xs text-slate-800/50">
								Reconnecting<span class="ml-1"><Loader isLoading={true} size="sm" /></span>
							</div>
						{/if}
					</h2>
					{#if showAsConnected}
						<p><b>Name:</b> {$paciStore.deviceInfo?.name}</p>
						<p><b>Version:</b> {$paciStore.deviceInfo?.firmware.version}</p>
						<p><b>Commit:</b> {$paciStore.deviceInfo?.firmware.commit}</p>
						<p class="mb-3"><b>Built:</b> {$paciStore.deviceInfo?.firmware.buildDate}</p>
						<button
							on:click={paciStore.disconnect}
							class="border-2 border-red-600/90 hover:bg-red-600/100 transition-all duration-200 p-2 w-full rounded text-red-600 hover:text-white"
							>Disconnect</button
						>
					{:else}
						<button
							on:click={paciStore.connect}
							disabled={$paciStore.connectionState !== 'disconnected'}
							class="bg-green-600/90 hover:bg-green-600/100 p-2 w-full rounded text-white mb-1 disabled:bg-green-800/100 disabled:cursor-wait"
							>{#if $paciStore.connectionState === 'connecting'}
								Connecting<span class="ml-2"><Loader isLoading={true} /></span>
							{:else}
								Connect
							{/if}
						</button>
					{/if}
				</div>
			</div>
			<div class="bg-gradient-to-tr from-blue-600/40 to-sky-400/40 rounded-md p-[2px]">
				<div class="bg-slate-50 rounded p-3 text-slate-800">
					<h2 class="text-lg font-comforta font-extrabold mb-1">MCU Management</h2>
					{#if $paciStore.connectionState === 'connected'}
						<button class="bg-sky-600/90 hover:bg-sky-600 p-2 w-full rounded text-white"
							>Update</button
						>
					{:else}
						<div class="text-xs text-slate-800/50">Please connect your Smart Paci</div>
					{/if}
				</div>
			</div>
		</div>
		<div class="w-full md:w-8/12 xl:w-8/12 md:pl-4">
			<div class="bg-gradient-to-tr from-slate-400 to-slate-300 h-52 mb-3 rounded"></div>
			<div class="bg-gradient-to-tr from-blue-600/40 to-sky-400/40 rounded-md p-[2px] mb-3">
				<div class="bg-slate-50 rounded p-3 text-slate-800">
					<h2 class="text-lg font-comforta font-extrabold mb-1">Sensor Values</h2>
					<p class="font-bold">
						Bite <span class="text-slate-800/60">{$paciStore.sensors.bite.toFixed(2)}%</span>
					</p>
					<LoadingBar width={$paciStore.sensors.bite} />
				</div>
			</div>
		</div>
	</div>
</Container>
