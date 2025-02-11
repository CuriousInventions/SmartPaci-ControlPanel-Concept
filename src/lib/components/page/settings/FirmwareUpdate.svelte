<script lang="ts">
	import { Paci, type FirmwareInfo } from '@curious-inventions/smartpaci';

	import SmartPaciFirmware from '/static/firmware/smartpaci-latest.dfu?url'
	import {
		Badge,
		Button,
		Fileupload,
		Helper,
		Modal,
		Alert,
		Progressbar,
		Spinner,
		Accordion,
		AccordionItem,
	} from 'flowbite-svelte';

	import {
		Copy as CopyIcon,
		Upload as UploadIcon
	 } from 'svelte-feathers';

	import paciStore from '$lib/stores/paciStore';
	import toastStore from '$lib/stores/toastStore';
	import { onMount } from 'svelte';

	let firmwareFile: File | ArrayBuffer | null = null;
	let firmwareFileError: string = '';
	let firmwareInfo: FirmwareInfo | null;
	let selectedFirmwareToUpload: File | ArrayBuffer | null = null;
	let firmwareUploadOpen = false;
	let firmwareUploadStarted = false;

	let latestFirmwareFile: File | ArrayBuffer | null = null;
	let latestFirmwareInfo: FirmwareInfo | null;

	let showUploadInput = false;

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

	async function openFirmwareUploadModal(firmware: File | ArrayBuffer | null): Promise<void> {
		paciStore.clearFirmwareUpload();
		selectedFirmwareToUpload = firmware;
		firmwareUploadOpen = true;
		firmwareUploadStarted = false;
	}
	async function startFirmwareUpload(): Promise<void> {
		if (selectedFirmwareToUpload == null || $paciStore.connectionState != 'connected') return;
		await paciStore.uploadFirmware(selectedFirmwareToUpload);
		firmwareUploadStarted = true;
	}

	onMount(async () => {
		latestFirmwareFile = await fetch(SmartPaciFirmware).then((response) => response.arrayBuffer());
		if (latestFirmwareFile !== null)
			latestFirmwareInfo = await Paci.getFirmwareInfo(latestFirmwareFile);

		console.log("latest firmware is: ", latestFirmwareInfo);

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
		<Button
			outline={true}
			color="light"
			class="!p-2 float-end"
			size="xs"
			onclick="{() => showUploadInput = !showUploadInput}"
		>
			<UploadIcon class="w-4 h-4 text-primary-600" />
		</Button>
		<h2 class="text-lg font-comforta font-extrabold mb-1">Firmware Update</h2>

		{#snippet firmwareThingy(title: string, info: FirmwareInfo | null, firmware: File | ArrayBuffer | null)}
			{#if info}
				<Accordion flush>
					<AccordionItem>
						<span slot="header">{title} - v{info?.version}</span>
						<p>
							<b>Hash:</b>
							<span title={info?.hash}
								><samp>{info?.hash.slice(0, 12)}</samp>&hellip;</span
							>
							<Button
								outline={true}
								color="light"
								class="!p-2"
								size="xs"
								onclick={() => {
									navigator.clipboard.writeText(info?.hash ?? '');
									toastStore.post({ intent: 'info', title: 'Copied to Clipboard!', duration: 1000 });
								}}
							>
								<CopyIcon class="w-4 h-4 text-primary-600" />
							</Button>
							{#if info.hashValid}
								<Badge rounded color="green">Valid</Badge>
							{:else}
								<Badge rounded color="red">Invalid</Badge>
							{/if}
							<br />
							<b>Commit:</b>
							<span title={info?.version.commit}
								><samp>{info?.version.commit.slice(0, 12)}</samp>&hellip;</span
							>
							<Button
								outline={true}
								color="light"
								class="!p-2"
								size="xs"
								onclick={() => {
									navigator.clipboard.writeText(info?.version.commit ?? '');
									toastStore.post({ intent: 'info', title: 'Copied to Clipboard!', duration: 1000 });
								}}
							>
								<CopyIcon class="w-4 h-4 text-primary-600" />
							</Button>
							<br />
							<b>Built:</b>
							<et
								>{info.version.datetime.toDateString()}
								{info.version.datetime.toLocaleTimeString()}</et
							>
						</p>
					</AccordionItem>
				</Accordion>
			{/if}
			<Button
				color="primary"
				class="bg-sky-600 rounded p-2 w-full "
				disabled={info == null}
				onclick={() => openFirmwareUploadModal(firmware)}>Update</Button
			>
		{/snippet}

		{#if $paciStore.connectionState === 'connected' || true}
			{#if showUploadInput}
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
						onchange={handleFirmwareFileChange}
					/>
					{#if firmwareFileError != ''}
						<Helper class="mt-2" color="red">
							<span class="font-medium">Heck!</span>
							{firmwareFileError}
						</Helper>
					{/if}
					<p class="mt-1 text-sm text-gray-500" id="fileFirmwareHelp">.dfu or .bin</p>
				</div>
				{@render firmwareThingy("Firwmare Info", firmwareInfo, firmwareFile)}
			{:else}
				{@render firmwareThingy("Latest Firmware", latestFirmwareInfo, latestFirmwareFile)}
			{/if}

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
				<Button onclick={() => (firmwareUploadOpen = false)}>Close</Button>
				<Button
					color="yellow"
					onclick={startFirmwareUpload}
					disabled={$paciStore.connectionState != 'connected'}>Proceed</Button
				>
			{:else}
				<Button color="green" onclick={() => (firmwareUploadOpen = false)}>Close</Button>
			{/if}
		{:else if $paciStore.ota?.state == 'restarting'}
			<Button
				onclick={async () => {
					await paciStore.disconnect();
					await paciStore.connect();
				}}>Reconnect</Button
			>
			<span>Taking too long?</span>
		{:else if $paciStore.ota.state == 'failed'}
			<Button color="red" onclick={() => (firmwareUploadOpen = false)}>Close</Button>
		{/if}
	</svelte:fragment>
</Modal>
