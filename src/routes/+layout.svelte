<script>
	import '../app.css';

	import NavBar from '$lib/components/layout/NavBar.svelte';
	import Toasts from '$lib/components/utils/Toasts.svelte';
</script>

<div class="bg-slate-200 min-h-full">
	<NavBar />
	<Toasts />
	<div class="pt-[4.5rem]">
		<slot />
	</div>
</div>
