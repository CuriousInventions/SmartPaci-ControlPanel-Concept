<script>
	import '../app.css';

	import NavBar from '$lib/components/layout/NavBar.svelte';
</script>

<div class="bg-slate-200 min-h-full">
	<NavBar />
	<div class="pt-[4.5rem]">
		<slot />
	</div>
</div>
