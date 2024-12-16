<script lang="ts">
	import { Paci, type FirmwareInfo } from '$lib/smartpaci/paci';
	import { Badge, Button, Fileupload, Input, Helper } from 'flowbite-svelte'

	import { Copy as CopyIcon } from 'svelte-feathers';

	import paciStore from '$lib/stores/paciStore';
	import toastStore  from '$lib/stores/toastStore';'$lib/stores/toastStore';

	let firmwareFileError: string = "";
	let firmwareInfo: FirmwareInfo;

	const handleFirmwareFileChange = async (event: Event) => {
		firmwareFileError = ""
		try {
			const file = (event.target as HTMLInputElement).files?.item(0);
			if (file == null) return;

			firmwareInfo = await Paci.getFirmwareInfo(file);
			if (!firmwareInfo.hashValid)
				firmwareFileError = "Invalid file has been provided"
		} catch (err) {
			console.log(err);
			firmwareFileError = (err as Error).message;
		}
	};

</script>

<div class="bg-gradient-to-tr from-blue-600/40 to-sky-400/40 rounded-md p-[2px]">
	<div class="bg-slate-50 rounded p-3 text-slate-800">
		<h2 class="text-lg font-comforta font-extrabold mb-1">Firmware Update</h2>
		{#if $paciStore.connectionState === 'connected' || true}
			<div class="mb-2">
				<label class="block mb-1 text-sm font-medium" for="fileFirmware">Firmware Image</label>
				<Fileupload
					class="block w-full rounded bg-slate-200"
					size="sm"
					color={firmwareFileError == "" ? 'base' : 'red'}
					aria-describedby="fileFirmwareHelp"
					id="fileFirmware"
					type="file"
					accept=".dfu,.bin"
					on:change={handleFirmwareFileChange}
				/>
				{#if firmwareFileError != ""}
					<Helper class="mt-2" color="red">
						<span class="font-medium">Heck!</span>
						{firmwareFileError}
					</Helper>
				{/if}
				<p class="mt-1 text-sm text-gray-500" id="fileFirmwareHelp">.dfu or .bin</p>
			</div>
			{#if firmwareInfo}
				<div class="mb-3 bg-slate-200 p-2 rounded">
					<p class="font-bold">
						Firmware info
						{#if firmwareInfo.hashValid}
							<Badge rounded color="green">Valid</Badge>
						{:else}
							<Badge rounded color="red">Invalid</Badge>
						{/if}
					</p>
					<p>
						Version: {firmwareInfo?.version}<br />
						Hash:
						<span title="{firmwareInfo?.hash}"><samp>{firmwareInfo?.hash.slice(0, 12)}</samp>&hellip;</span>
						<Button outline={true} color="light" class="!p-2" size="xs" on:click={() => {navigator.clipboard.writeText(firmwareInfo?.hash); toastStore.post({intent: 'info', title: 'Copied to Clipboard!', duration: 1000})}}>
							<CopyIcon class="w-4 h-4 text-primary-600"/>
						</Button>
						<br />
						Commit:
						<span title="{firmwareInfo?.version.commit}"><samp>{firmwareInfo?.version.commit.slice(0, 12)}</samp>&hellip;</span>
						<Button outline={true} color="light" class="!p-2" size="xs" on:click={() => {navigator.clipboard.writeText(firmwareInfo?.version.commit); toastStore.post({intent: 'info', title: 'Copied to Clipboard!', duration: 1000})}}>
							<CopyIcon class="w-4 h-4 text-primary-600" />
						</Button>
						<br />
						Built: <et>{firmwareInfo.version.datetime.toDateString()} {firmwareInfo.version.datetime.toLocaleTimeString()}</et>
					</p>
				</div>
			{/if}
			<Button color="primary" class="bg-sky-600 rounded p-2 w-full ">Update</Button>
		{:else}
			<div class="text-xs text-slate-800/50">Please connect your Smart Paci</div>
		{/if}
	</div>
</div>
