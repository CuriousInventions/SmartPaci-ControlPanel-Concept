import { get, writable } from 'svelte/store';
import { CalibrationType, InputType, Paci } from '@curious-inventions/smartpaci';

type OtaState =
	| { state: 'uploading'; uploadPercent: number }
	| { state: 'verifying' }
	| { state: 'restarting' }
	| { state: 'failed'; reason: string };

interface PaciState {
	connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
	deviceInfo: {
		name: string;
		firmware: {
			version: string;
			commit: string;
			hash: string;
			buildDate: string;
		};
	} | null;
	ota: null | OtaState;
	sensors: {
		bite: number;
		touch: number[];
	};
}

const initialState: PaciState = {
	connectionState: 'disconnected',
	deviceInfo: null,
	ota: null,
	sensors: {
		bite: 0,
		touch: [],
	},
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
	const hash = await paci.getFirmwareHash();
	const firmwareDate = await paci.getFirmwareDate();

	const buildDate =
		firmwareDate != null && !isNaN(firmwareDate.valueOf())
			? `${firmwareDate.toDateString()} ${firmwareDate.toLocaleTimeString()}`
			: '';

	update((state) => ({
		...state,
		connectionState: 'connected',
		ota: null,
		deviceInfo: {
			name,
			firmware: {
				version,
				commit,
				hash,
				buildDate,
				uploadedProgress: null,
			},
		},
	}));
});

paci.addEventListener('nameChanged', async (event) => {
	update((state) => {
		if (!state.deviceInfo) return state;
		return { ...state, deviceInfo: { ...state.deviceInfo, name: event.detail.name } };
	});
});
paci.addEventListener('reconnecting', async () => {
	update((state) => ({ ...state, connectionState: 'reconnecting' }));
});

paci.addEventListener('disconnected', async () => {
	update((state) => ({ ...state, connectionState: 'disconnected', deviceInfo: null }));
});

paci.addEventListener('touch', async (event) => {
	const values = event.detail.values;
	update((state) => ({
		...state,
		sensors: {
			...state.sensors,
			touch: values,
		},
	}));
});

// Firmware Management
paci.addEventListener('firmwareUploadProgress', (event) => {
	const progress = event.detail.progressPercent ?? 0;
	update((state) => ({
		...state,
		ota: { state: 'uploading', uploadPercent: progress },
	}));
});

paci.addEventListener('firmwareUploadComplete', async (event) => {
	try {
		update((state) => ({
			...state,
			ota: { state: 'restarting' },
		}));
		await paci.applyFirmwareUpdate();
	} catch (error) {
		console.error(error);
		const reason = error instanceof Error ? error.message : 'An unknown problem has happened';
		update((state) => ({
			...state,
			ota: { state: 'failed', reason },
		}));
	}
});

// SENSOR SYNCING
paci.addEventListener('bite', (event) => {
	const normalized = event.detail.value / 255;
	update((state) => ({
		...state,
		sensors: { ...state.sensors, bite: normalized * 100 },
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
	disconnect: async () => {
		await paci.disconnect();
	},
	calibrate: async (sensor: 'bite' | 'suck', state: 'min' | 'max') => {
		const sensorMap = {
			bite: InputType.Bite,
			suck: InputType.Suck,
		};
		await paci.calibrateInput(
			sensorMap[sensor],
			state == 'min' ? CalibrationType.Min : CalibrationType.Max,
		);
	},
	uploadFirmware: async (firmwareFile: File | ArrayBuffer) => {
		try {
			await paci.uploadFirmwareFile(firmwareFile);
		} catch (error) {
			console.error(error);
			const reason = error instanceof Error ? error.message : 'An unknown error occurred';

			update((state) => ({
				...state,
				ota: { state: 'failed', reason },
			}));
		}
	},
	clearFirmwareUpload: () => {
		update((state) => ({
			...state,
			ota: null,
		}));
	},
	setName: async (name: string) => {
		await paci.setName(name);
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
			},
		},
	},
};

const paciStore = {
	subscribe,
	...actions,
};
export default paciStore;
