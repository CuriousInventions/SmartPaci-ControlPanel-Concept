<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import paciStore from '$lib/stores/paciStore';

	let paciSvgRef: HTMLObjectElement;

	type TouchpadElements = (SVGElement | null)[];

	let touchpadElements: TouchpadElements = [];

	const loadHandler = () => {
		paciStore.subscribe((state) => {
			console.debug(`Touch sensors are now [${state.sensors.touch}]`);
			touchpadElements.forEach((touchpadElement, index) => {
				let touchpadShape = touchpadElement?.querySelector('path');

				if(touchpadShape)
					touchpadShape.style.fillOpacity = state.sensors.touch.includes(index) ? '1' : '0';
			});
		});

		paciSvgRef.addEventListener('load', () => {
			const paciSvg: Document = paciSvgRef.contentDocument!;
			touchpadElements = [
				paciSvg.getElementById('touchpad-bottom-left') as SVGElement | null,
				paciSvg.getElementById('touchpad-top-left') as SVGElement | null,
				paciSvg.getElementById('touchpad-top-right') as SVGElement | null,
				paciSvg.getElementById('touchpad-bottom-right') as SVGElement | null
			];

			console.debug(touchpadElements);
			touchpadElements.forEach((e) => {
				if (e)
					e.style.transition = 'fill-opacity 500ms ease';
			});
		});
	};

	onMount(() => {
		loadHandler();
	});
</script>

<div class="h-56">
	<object
		bind:this={paciSvgRef}
		title="paci front"
		class="drop-shadow-lg h-full"
		type="image/svg+xml"
		data="/img/paci-front.svg"
	/>
</div>
