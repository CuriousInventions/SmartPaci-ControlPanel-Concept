<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import paciStore from '$lib/stores/paciStore';

	let paciSvgRef: HTMLObjectElement;

	type TouchpadElements = (SVGElement | null)[];

	let touchpadElements: TouchpadElements = [];

	function getTouchPadElements(): void {
		const paciSvg: Document = paciSvgRef.contentDocument!;
		touchpadElements = [
			paciSvg.getElementById('touchpad-bottom-left') as SVGElement | null,
			paciSvg.getElementById('touchpad-top-left') as SVGElement | null,
			paciSvg.getElementById('touchpad-top-right') as SVGElement | null,
			paciSvg.getElementById('touchpad-bottom-right') as SVGElement | null
		];
	}

	const loadHandler = () => {
		paciStore.subscribe((state) => {
			touchpadElements.forEach((touchpadElement, index) => {
				let touchpadShape = touchpadElement?.querySelector('path');

				if (touchpadShape) {
					touchpadShape.style.transition = 'fill-opacity 100ms ease';
					touchpadShape.style.fillOpacity = state.sensors.touch.includes(index) ? '1' : '0';
				}
			});
		});
	};

	onMount(() => {
		getTouchPadElements();
		// Also fetch the elements if the svg itself gets reloaded...
		paciSvgRef.addEventListener('load', () => getTouchPadElements());
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
