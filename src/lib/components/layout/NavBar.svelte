<script lang="ts">
	import Container from './Container.svelte';

	import paciStore from '$lib/stores/paciStore';
</script>

<nav class="bg-slate-50 w-full fixed shadow-md z-30">
	<Container>
		<div class="py-3">
			<div class="flex items-center">
				<h1
					class="font-extrabold text-transparent text-2xl font-comforta bg-clip-text bg-gradient-to-tr from-blue-600 to-sky-400 drop-shadow"
				>
					Smart Paci
				</h1>
				<div class="ml-auto">
					<p class="text-black/80">
						{$paciStore.connectionState === 'connected'
							? `Connected: ${$paciStore.deviceInfo?.name}`
							: 'Not Connected'}
					</p>
				</div>
			</div>
		</div>
	</Container>
</nav>
