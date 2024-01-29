import { get, writable } from 'svelte/store';
import { Paci } from '$lib/smartpaci/paci';
import { type McuImageInfo } from '$lib/smartpaci/mcumgr';

interface DeviceInfo {
	name: string;
	firmware: {
		version: string;
		commit: string;
		buildDate: string;
	};
}

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
	update((state) => ({
		...state,
		sensors: { ...state.sensors, bite: (event.detail.value / 255) * 100 }
	}));
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
	}
};

const paciStore = {
	subscribe,
	...actions
};
export default paciStore;
