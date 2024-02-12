<script lang="ts">
	export let width = 0;
</script>

<div class="w-full bg-slate-300 rounded-full h-3 relative overflow-hidden">
	<div class="loader-gradient h-3 rounded-full"></div>
	<div
		class="absolute top-0 right-0 bottom-0 bg-slate-300 transition-all duration-300"
		style="width: {100 - width}%;"
	></div>
</div>

<style>
	.loader-gradient {
		background-image: linear-gradient(90deg, #2563eb 0%, #16a34a 50%, #b1ba04 75%, #d97706 100%);
	}
</style>
