<script lang="ts">
	import { Paci, type FirmwareInfo } from '@curious-inventions/smartpaci';
	import {
		Badge,
		Button,
		Fileupload,
		Helper,
		Modal,
		Alert,
		Progressbar,
		Spinner,
	} from 'flowbite-svelte';

	import { Copy as CopyIcon } from 'svelte-feathers';

	import paciStore from '$lib/stores/paciStore';
	import toastStore from '$lib/stores/toastStore';
	import { onMount } from 'svelte';

	let firmwareFile: File | null = null;
	let firmwareFileError: string = '';
	let firmwareInfo: FirmwareInfo | null;
	let firmwareUploadOpen = false;
	let firmwareUploadStarted = false;

	const handleFirmwareFileChange = async (event: Event) => {
		firmwareFileError = '';
		firmwareInfo = null;
		try {
			firmwareFile = (event.target as HTMLInputElement).files?.item(0) ?? null;
			if (firmwareFile == null) return;

			firmwareInfo = await Paci.getFirmwareInfo(firmwareFile);
			if (!firmwareInfo.hashValid) firmwareFileError = 'Invalid file has been provided';
		} catch (err) {
			console.log(err);
			firmwareFileError = (err as Error).message;
		}
	};

	async function openFirmwareUploadModal(): Promise<void> {
		paciStore.clearFirmwareUpload();
		firmwareUploadOpen = true;
		firmwareUploadStarted = false;
	}
	async function startFirmwareUpload(): Promise<void> {
		if (firmwareFile == null || $paciStore.connectionState != 'connected') return;
		await paciStore.uploadFirmware(firmwareFile);
		firmwareUploadStarted = true;
	}

	onMount(() => {
		// Try to prevent navigation away from the page.
		addEventListener('beforeunload', (event) => {
			if ($paciStore.ota?.state != null) {
				event.preventDefault();
				return (event.returnValue = '');
			}
		});
	});
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
					color={firmwareFileError == '' ? 'base' : 'red'}
					aria-describedby="fileFirmwareHelp"
					id="fileFirmware"
					type="file"
					accept=".dfu,.bin"
					on:change={handleFirmwareFileChange}
				/>
				{#if firmwareFileError != ''}
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
						<span title={firmwareInfo?.hash}
							><samp>{firmwareInfo?.hash.slice(0, 12)}</samp>&hellip;</span
						>
						<Button
							outline={true}
							color="light"
							class="!p-2"
							size="xs"
							on:click={() => {
								navigator.clipboard.writeText(firmwareInfo?.hash ?? '');
								toastStore.post({ intent: 'info', title: 'Copied to Clipboard!', duration: 1000 });
							}}
						>
							<CopyIcon class="w-4 h-4 text-primary-600" />
						</Button>
						<br />
						Commit:
						<span title={firmwareInfo?.version.commit}
							><samp>{firmwareInfo?.version.commit.slice(0, 12)}</samp>&hellip;</span
						>
						<Button
							outline={true}
							color="light"
							class="!p-2"
							size="xs"
							on:click={() => {
								navigator.clipboard.writeText(firmwareInfo?.version.commit ?? '');
								toastStore.post({ intent: 'info', title: 'Copied to Clipboard!', duration: 1000 });
							}}
						>
							<CopyIcon class="w-4 h-4 text-primary-600" />
						</Button>
						<br />
						Built:
						<et
							>{firmwareInfo.version.datetime.toDateString()}
							{firmwareInfo.version.datetime.toLocaleTimeString()}</et
						>
					</p>
				</div>
			{/if}
			<Button
				color="primary"
				class="bg-sky-600 rounded p-2 w-full "
				disabled={firmwareInfo == null}
				on:click={openFirmwareUploadModal}>Update</Button
			>
		{:else}
			<div class="text-xs text-slate-800/50">Please connect your Smart Paci</div>
		{/if}
	</div>
</div>

<!-- Firmware Update Modal -->
<Modal
	title="Firmware Upload"
	bind:open={firmwareUploadOpen}
	dismissable={false}
	classFooter={[undefined, 'failed', 'restarting'].includes($paciStore.ota?.state)
		? ''
		: 'collapse'}
>
	{#if $paciStore.ota?.state == null}
		{#if !firmwareUploadStarted}
			<Alert class="alert-warning" color="yellow">
				<ul>
					<li>Do not close or refresh this page.</li>
					<li>
						This may prevent your paci from operating correctly. For support please contact us at <a
							href="https://curious.toys/support">https://curious.toys/support</a
						>
					</li>
				</ul>
			</Alert>
			<p>Are you sure you want to proceed?</p>
		{:else}
			<p>All done! 🎉</p>
		{/if}
	{:else if $paciStore.ota?.state == 'uploading'}
		<p>This may take several minutes. Please be patient.</p>
		{#if ($paciStore.ota?.uploadPercent ?? 0) == 0}
			<p><Spinner />Erasing...</p>
		{:else}
			<Progressbar progress={$paciStore.ota?.uploadPercent ?? 0} />
		{/if}
	{:else if $paciStore.ota?.state == 'restarting'}
		<p>Give it a minute while the device updates...</p>
	{:else if $paciStore.ota.state == 'failed'}
		<p>Something appears to gave gone wrong.</p>
		<Alert class="alert-warning" color="yellow">
			{$paciStore.ota.reason}
		</Alert>
	{/if}
	<svelte:fragment slot="footer">
		{#if $paciStore.ota?.state == null}
			{#if !firmwareUploadStarted}
				<Button on:click={() => (firmwareUploadOpen = false)}>Close</Button>
				<Button
					color="yellow"
					on:click={startFirmwareUpload}
					disabled={$paciStore.connectionState != 'connected'}>Proceed</Button
				>
			{:else}
				<Button color="green" on:click={() => (firmwareUploadOpen = false)}>Close</Button>
			{/if}
		{:else if $paciStore.ota?.state == 'restarting'}
			<Button
				on:click={async () => {
					await paciStore.disconnect();
					await paciStore.connect();
				}}>Reconnect</Button
			>
			<span>Taking too long?</span>
		{:else if $paciStore.ota.state == 'failed'}
			<Button color="red" on:click={() => (firmwareUploadOpen = false)}>Close</Button>
		{/if}
	</svelte:fragment>
</Modal>
