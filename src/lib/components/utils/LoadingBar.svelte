<script lang="ts">
	export let width = 0;
</script>

<div class="w-full bg-slate-300 rounded-full h-3 relative overflow-hidden">
	<div class="bg-gradient-to-r from-blue-600 via-green-600 to-amber-600 h-3 rounded-full"></div>
	<div
		class="absolute top-0 right-0 bottom-0 bg-slate-300 transition-all duration-300"
		style="width: {100 - width}%;"
	></div>
</div>
