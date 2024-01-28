<script lang="ts">
	export let isLoading = true;
	export let size: 'sm' | 'md' = 'md';
</script>

{#if isLoading}
	<div class:size-sm={size === 'sm'} class:size-md={size === 'md'} class="inline-block relative">
		<div
			class="ball-1 inline-block z-1 aspect-square rounded-full bg-gradient-to-tr from-green-700 to-lime-400 opacity-80"
		></div>
		<div
			class="ball-2 inline-block z-1 aspect-square rounded-full bg-gradient-to-tr from-green-700 to-lime-400 opacity-80"
		></div>
		<div
			class="ball-3 inline-block z-1 aspect-square rounded-full bg-gradient-to-tr from-green-700 to-lime-400 opacity-80"
		></div>
	</div>
{/if}

<style>
	@keyframes bounce {
		0%,
		100% {
			transform: translateY(-75%);
			animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
		}
		50% {
			transform: none;
			animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
		}
	}

	.size-sm .ball-1,
	.size-sm .ball-2,
	.size-sm .ball-3 {
		height: 0.3rem;
	}

	.size-md .ball-1,
	.size-md .ball-2,
	.size-md .ball-3 {
		height: 0.5rem;
	}
	.size-md .ball-2,
	.size-md .ball-3 {
		margin-left: 0rem;
	}
	.ball-1 {
		animation: bounce 900ms infinite;
	}
	.ball-2 {
		animation: bounce 900ms 100ms infinite;
	}
	.ball-3 {
		animation: bounce 900ms 200ms infinite;
	}
</style>
