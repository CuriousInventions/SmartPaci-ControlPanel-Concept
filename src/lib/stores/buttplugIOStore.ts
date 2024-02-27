import {
	ButtplugBrowserWebsocketClientConnector,
	ButtplugClient,
	ButtplugClientDevice,
	ButtplugDeviceError
} from 'buttplug';
import { writable } from 'svelte/store';
import paciStore from './paciStore';

interface ButtplugState {
	connected: boolean;
	devices: ButtplugClientDevice[];
}

const initialState: ButtplugState = {
	connected: false,
	devices: []
};

const state = writable<ButtplugState>(initialState);
const { update, subscribe } = state;

const buttplugClient = new ButtplugClient();
buttplugClient.addListener('deviceadded', (device) => {
	update((state) => ({ ...state, devices: buttplugClient.devices }));
});

buttplugClient.addListener('deviceremoved', (device) => {
	update((state) => ({ ...state, devices: buttplugClient.devices }));
});

buttplugClient.addListener('connect', () => {
	// update((currentState) => ({ ...currentState, connected: true }));
	console.log('CONNECTEDDDD');
});

buttplugClient.addListener('disconnect', () => {
	console.log('dissssCONNECTEDDDD');
	// update((currentState) => ({ ...currentState, connected: false }));
});

// CALLBACKS
/**
 * Set the vibration of all connected devices.
 * @param value Vibration strength between 0 and 1
 */
const setVibration = (strength: number) => {
	if (strength < 0.05) strength = 0; // Deadzone

	buttplugClient.devices.forEach(async (device) => {
		console.log(device.name);

		if (device.vibrateAttributes.length == 0) {
			return;
		}

		try {
			await device.vibrate(strength);
		} catch (e) {
			console.log(e);
			if (e instanceof ButtplugDeviceError) {
				console.log('device error!');
			}
		}
	});
};
// paciStore.hook.onBite.register(setVibration);

// ACTIONS
const actions = {
	connectClient: async () => {
		const address = 'ws://localhost:12345';
		const connector = new ButtplugBrowserWebsocketClientConnector(address);

		try {
			await buttplugClient.connect(connector);
			// update((state) => ({ ...state, connected: true }));
			paciStore.hook.onBite.register(setVibration);
		} catch (ex) {
			console.log(ex);
			// update((state) => ({ ...state, connected: false }));
		}
	},
	disconnectClient: async () => {
		await buttplugClient.disconnect();
		// update((state) => ({ ...state, connected: false }));
	}
};

const buttplugIOStore = {
	subscribe,
	...actions
};
export default buttplugIOStore;
