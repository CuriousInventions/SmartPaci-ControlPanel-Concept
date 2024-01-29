<script lang="ts">
	import { fly } from 'svelte/transition';

	import toastStore, { type Toast } from '$lib/stores/toastStore';

	$: toasts = $toastStore.toasts;

	const removeToast = (toast: Toast) => {
		toastStore.remove(toast);
	};
</script>

<div class="fixed left-0 bottom-2 right-0 z-40 pointer-events-none">
	<div class="max-w-xl mx-auto px-2 sm:px-6 lg:px-8 pointer-events-none">
		{#each [...toasts].reverse() as toast}
			<div
				in:fly={{ y: 20, duration: toastStore.CONFIG.FLY_IN_DURATION }}
				out:fly={{
					y: 20,
					duration: toastStore.CONFIG.FLY_OUT_DURATION
				}}
				class="rounded relative bg-red-200 shadow-lg border-red-400 border-2 p-3 mb-2 pointer-events-auto"
			>
				{#if toast.title}
					<h6 class="font-bold">{toast.title}</h6>
				{/if}
				{#if toast.title}
					<p>{toast.message}</p>
				{/if}
				<div class="absolute left-0 bottom-0 right-0 h-1 bg-red-100">
					<div
						class="h-full bg-red-300 duration-100"
						style="width: {(toast.durationRemaining / toast.duration) * 100}%"
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>
