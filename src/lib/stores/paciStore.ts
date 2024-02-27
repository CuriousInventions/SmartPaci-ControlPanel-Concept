import { get, writable } from 'svelte/store';
import { Paci } from '$lib/smartpaci/paci';

interface PaciState {
	connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
	deviceInfo: {
		name: string;
		firmware: {
			version: string;
			commit: string;
			buildDate: string;
		};
	} | null;
	sensors: {
		bite: number;
	};
	// firmwareInfo: McuImageInfo | null;
	// firmwareFile: File | null;
	// version: string;
	// commit: string;
	// buildDate: string;
	// name: string;
	// Other states like progress, status, etc.
}

const initialState: PaciState = {
	connectionState: 'disconnected',
	deviceInfo: null,
	sensors: {
		bite: 0
	}
	// firmwareFile: null,
	// version: '',
	// commit: '',
	// buildDate: '',
};

const state = writable<PaciState>(initialState);
const { update, subscribe } = state;

const paci = new Paci();

// HOOKS
const biteHooks: Array<(value: number) => void> = [];

// CONNECTION STATE SYNCING
paci.addEventListener('connected', async () => {
	const name = await paci.getName();
	const version = await paci.getFirmwareVersion();
	const commit = await paci.getFirmwareCommit();
	const firmwareDate = await paci.getFirmwareDate();

	const buildDate =
		firmwareDate != null && !isNaN(firmwareDate.valueOf())
			? `${firmwareDate.toDateString()} ${firmwareDate.toLocaleTimeString()}`
			: '';

	update((state) => ({
		...state,
		connectionState: 'connected',
		deviceInfo: {
			name,
			firmware: {
				version,
				commit,
				buildDate
			}
		}
	}));
});

paci.addEventListener('reconnecting', async () => {
	update((state) => ({ ...state, connectionState: 'reconnecting' }));
});

paci.addEventListener('disconnected', async () => {
	update((state) => ({ ...state, connectionState: 'disconnected', deviceInfo: null }));
});

// SENSOR SYNCING
paci.addEventListener('bite', (event) => {
	const normalized = event.detail.value / 255;
	update((state) => ({
		...state,
		sensors: { ...state.sensors, bite: normalized * 100 }
	}));

	biteHooks.forEach((hook) => hook(normalized));
});

// ACTIONS
const actions = {
	connect: async () => {
		try {
			if (get(state).connectionState !== 'disconnected') return;

			update((state) => ({ ...state, connectionState: 'connecting' }));
			await paci.connect();
		} catch (err) {
			update((state) => ({ ...state, connectionState: 'disconnected' }));
			throw err;
		}
	},
	disconnect: () => {
		paci.disconnect();
	},
	hook: {
		/** Triggered each time the Paci sends updated bite values */
		onBite: {
			/**
			 * Registers an onBite hook.
			 * @param callback The callback's value parameter will recieve a normalized value between 0 and 1, depending on the bite strength.
			 */
			register: (callback: (value: number) => void) => {
				biteHooks.push(callback);
			},
			/**
			 * Removes an onBite hook.
			 * @param callback
			 */
			deregister: (callback: (value: number) => void) => {
				const index = biteHooks.findIndex((hook) => hook === callback);
				if (index !== -1) {
					biteHooks.splice(index, 1);
				}
			}
		}
	}
};

const paciStore = {
	subscribe,
	...actions
};
export default paciStore;
