import { writable } from 'svelte/store';

export interface ToastConfig {
	intent: 'info' | 'error';
	title?: string;
	message?: string;
	/** How long should the toast show for in ms */
	duration?: number;
}

export interface Toast extends ToastConfig {
	id: number;
	durationRemaining: number;
	duration: number;
}

interface ToastState {
	toasts: Toast[];
}

const initialState: ToastState = {
	toasts: []
};

// Constants
const CONFIG = {
	FLY_IN_DURATION: 300,
	FLY_OUT_DURATION: 300,
	DEFAULT_SHOWN_DURATION: 10000,
	TICK_INTERVAL: 50
};

const state = writable<ToastState>(initialState);
const { update, subscribe } = state;

/**
 * Decays a toast, removing it once the time is up.
 */
function startToastDecay(toast: Toast) {
	const interval = setInterval(() => {
		update((state) => {
			const toastIndex = state.toasts.findIndex((t) => t.id === toast.id);
			if (toastIndex !== -1) {
				// Create a copy of the toast and update durationRemaining
				const updatedToast = {
					...state.toasts[toastIndex],
					durationRemaining: state.toasts[toastIndex].durationRemaining - CONFIG.TICK_INTERVAL
				};

				// Replace the old toast with the updated one
				state.toasts[toastIndex] = updatedToast;

				if (updatedToast.durationRemaining <= 0) {
					clearInterval(interval);
					setTimeout(() => {
						actions.remove(updatedToast);
					}, CONFIG.FLY_OUT_DURATION);
				}
			}
			return state;
		});
	}, CONFIG.TICK_INTERVAL);
}

let nextId = 0; // For generating unique IDs for each toast.

const actions = {
	/**
	 * Posts a new toast
	 * @param toastConfig
	 */
	post: (toastConfig: ToastConfig) => {
		// Prevent duration from being less than 1ms
		if (!toastConfig.duration || toastConfig.duration < 1) {
			toastConfig.duration = CONFIG.DEFAULT_SHOWN_DURATION;
		}

		const toast: Toast = {
			...toastConfig,
			id: nextId++,
			duration: toastConfig.duration,
			durationRemaining: toastConfig.duration
		};

		update((state) => {
			state.toasts.push(toast);
			return state;
		});

		setTimeout(() => {
			startToastDecay(toast);
		}, CONFIG.FLY_IN_DURATION);
	},
	/**
	 * Deletes a toast
	 * @param toastToRemove
	 */
	remove: (toastToRemove: Toast) => {
		update((state) => {
			state.toasts = state.toasts.filter((toast) => toast.id !== toastToRemove.id);
			return state;
		});
	}
};

const toastStore = {
	subscribe,
	CONFIG,
	...actions
};
export default toastStore;
