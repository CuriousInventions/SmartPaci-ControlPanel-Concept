<script lang="ts">
	import { Paci, type FirmwareInfo } from '$lib/smartpaci/paci';

	import paciStore from '$lib/stores/paciStore';

	let firmwareFileInput: HTMLInputElement;

	let firmwareInfo: FirmwareInfo;

	const handleFirmwareFileChange = async () => {
		try {
			const file = firmwareFileInput.files?.item(0);
			if (file == null) return;

			firmwareInfo = await Paci.getFirmwareInfo(file);
		} catch (err) {
			console.log(err);
		}
	};

</script>

<div class="bg-gradient-to-tr from-blue-600/40 to-sky-400/40 rounded-md p-[2px]">
	<div class="bg-slate-50 rounded p-3 text-slate-800">
		<h2 class="text-lg font-comforta font-extrabold mb-1">Firmware Update</h2>
		{#if $paciStore.connectionState === 'connected' || true}
			<div class="mb-2">
				<label class="block mb-1 text-sm font-medium" for="fileFirmware">Firmware Image</label>
				<input
					class="block w-full text-sm text-gray-900 border border-gray-300 rounded cursor-pointer bg-gray-50"
					aria-describedby="fileFirmwareHelp"
					id="fileFirmware"
					type="file"
					accept=".dfu,.bin"
					bind:this={firmwareFileInput}
					on:change={handleFirmwareFileChange}
				/>
				<p class="mt-1 text-sm text-gray-500" id="fileFirmwareHelp">.dfu or .bin</p>
			</div>
			{#if firmwareInfo && firmwareInfo.hashValid}
				<div class="mb-3 bg-slate-200 p-2 rounded">
					<p class="font-bold">Firmare info</p>
					<p>
						Version: {firmwareInfo?.version}<br />
						Hash: <samp>{firmwareInfo?.hash}</samp><br />
						Commit:
						<samp>{firmwareInfo?.version.commit}</samp><br />
						Built: <et>{firmwareInfo.version.datetime}</et>
					</p>
				</div>
			{/if}
			<button class="bg-sky-600/90 hover:bg-sky-600 p-2 w-full rounded text-white">Update</button>
		{:else}
			<div class="text-xs text-slate-800/50">Please connect your Smart Paci</div>
		{/if}
	</div>
</div>

<style>
	#fileFirmware::file-selector-button {
		@apply py-2;
		@apply px-3;
		@apply border-none;
		@apply bg-slate-200;
		@apply cursor-pointer;
	}
	#fileFirmware:hover::file-selector-button {
		@apply bg-slate-300/70;
	}
</style>
