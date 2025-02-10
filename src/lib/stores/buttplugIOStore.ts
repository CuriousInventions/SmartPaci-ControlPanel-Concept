import {
	ButtplugBrowserWebsocketClientConnector,
	ButtplugClient,
	type ButtplugClientDevice,
	ButtplugDeviceError,
} from 'buttplug';
import { writable } from 'svelte/store';
import paciStore from './paciStore';

interface ButtplugState {
	connection: 'disconnected' | 'connecting' | 'connected';
	devices: ButtplugClientDevice[];
}

const initialState: ButtplugState = {
	connection: 'disconnected',
	devices: [],
};

const state = writable<ButtplugState>(initialState);
const { update, subscribe } = state;

const buttplugClient = new ButtplugClient('Smart Paci');

buttplugClient.addListener('deviceadded', (device) => {
	update((state) => ({ ...state, devices: buttplugClient.devices }));
});

buttplugClient.addListener('deviceremoved', (device) => {
	update((state) => ({ ...state, devices: buttplugClient.devices }));
});

buttplugClient.addListener('disconnect', () => {
	update((currentState) => ({ ...currentState, connection: 'disconnected' }));
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
			update((currentState) => ({ ...currentState, connection: 'connecting' }));
			await buttplugClient.connect(connector);
			update((currentState) => ({ ...currentState, connection: 'connected' }));
			paciStore.hook.onBite.register(setVibration);
		} catch (ex) {
			console.log(ex);
			update((state) => ({ ...state, connection: 'disconnected' }));
		}
	},
	disconnectClient: async () => {
		await buttplugClient.disconnect();
		// update((state) => ({ ...state, connected: false }));
	},
};

const buttplugIOStore = {
	subscribe,
	...actions,
};
export default buttplugIOStore;
