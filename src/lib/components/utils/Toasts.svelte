<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cva } from 'class-variance-authority';

	import toastStore, { type Toast } from '$lib/stores/toastStore';

	$: toasts = $toastStore.toasts;

	const removeToast = (toast: Toast) => {
		toastStore.remove(toast);
	};

	const card = cva('card', {
		variants: {
			intent: {
				info: 'bg-gray-100 border-gray-400/80',
				error: 'bg-red-200 border-red-400',
				success: 'bg-green-100 border-green-400',
			},
		},
	});

	const loaderBg = cva('loaderBg', {
		variants: {
			intent: {
				info: 'bg-gray-100',
				error: 'bg-red-100',
				success: 'bg-green-50',
			},
		},
	});
	const loader = cva('loader', {
		variants: {
			intent: {
				info: 'bg-gray-300/70',
				error: 'bg-red-300',
				success: 'bg-green-300',
			},
		},
	});
</script>

<div class="fixed left-0 bottom-2 right-0 z-40 pointer-events-none">
	<div class="max-w-xl mx-auto px-2 sm:px-6 lg:px-8 pointer-events-none">
		{#each [...toasts].reverse() as toast}
			<div
				in:fly={{ y: 20, duration: toastStore.CONFIG.FLY_IN_DURATION }}
				out:fly={{
					y: 20,
					duration: toastStore.CONFIG.FLY_OUT_DURATION,
				}}
				class="rounded relative shadow-lg border-2 p-3 mb-2 pointer-events-auto {card({
					intent: toast.intent,
				})}"
			>
				{#if toast.title}
					<h6 class="font-bold">{toast.title}</h6>
				{/if}
				{#if toast.message}
					<p>{toast.message}</p>
				{/if}
				<div
					class="absolute left-0 bottom-0 right-0 h-1 {loaderBg({
						intent: toast.intent,
					})}"
				>
					<div
						class="h-full duration-100 {loader({
							intent: toast.intent,
						})}"
						style="width: {(toast.durationRemaining / toast.duration) * 100}%"
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>
