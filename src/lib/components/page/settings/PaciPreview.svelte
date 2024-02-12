<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	let paciSvgRef: HTMLObjectElement;

	type TouchpadElements = {
		pad0: SVGElement | null;
		pad1: SVGElement | null;
		pad2: SVGElement | null;
		pad3: SVGElement | null;
	};

	let touchpadElements: TouchpadElements;

	function getTouchPadElements(): void {
		const paciSvg: Document = paciSvgRef.contentDocument!;
		touchpadElements = {
			pad0: paciSvg.getElementById('touchpad-top-left') as SVGElement | null,
			pad1: paciSvg.getElementById('touchpad-top-right') as SVGElement | null,
			pad2: paciSvg.getElementById('touchpad-bottom-left') as SVGElement | null,
			pad3: paciSvg.getElementById('touchpad-bottom-right') as SVGElement | null
		};
	}

	function updateTouchpadStates(): void {
		const padToFlash = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;

		let touchpadElement: SVGElement | null = touchpadElements[
			`pad${padToFlash}`
		] as SVGElement | null;

		let touchpadShape = touchpadElement?.querySelector('path');

		if (touchpadShape) {
			touchpadShape.style.transition = 'fill-opacity 500ms ease';
			touchpadShape.style.fillOpacity = '1';

			setTimeout(() => {
				if (touchpadShape) {
					// touchpadShape.style.fill = originalColor;
					touchpadShape.style.fillOpacity = '0';
				}
			}, 1000);
		}
	}

	const loadHandler = () => {
		getTouchPadElements();
		setInterval(() => {
			updateTouchpadStates();
		}, 3000);
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
