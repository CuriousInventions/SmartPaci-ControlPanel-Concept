import {
	CalibrateSensor_Sensor,
	ControlRequest,
	CalibrateSensor,
	ControlResponse,
	SensorReadings,
	Setting,
	Version,
	VersionRequest,
} from './generated/bluetooth_pb';

import {
	GroupId,
	GroupImageId,
	type McuImageStat,
	McuManager,
	type McuMgrMessage,
	type SemVersion,
} from './mcumgr';

import { toHex } from '@smithy/util-hex-encoding';

export enum InputType {
	Bite,
	Suck,
}

export enum CalibrationType {
	Min,
	Max,
}

/**
 * Convert a semantic version (usually returned from McuBoot images) into version objects for the
 * Smart Pacifier.
 *
 * The descript is encoded into the 32bit-build component of the SemVersion.
 * @param version
 * @returns
 */
export class PaciVersion {
	private _version: SemVersion;
	commit: string;
	datetime: Date;
	variant: string;
	hash: string;

	constructor(
		version: SemVersion | string,
		commit: string = '',
		datetime?: Date,
		hash: string = '',
	) {
		if (typeof version == 'string') {
			const parts = version.split('.').map((p) => Number(p));
			version = {
				major: parts[0],
				minor: parts[1],
				revision: parts[2],
				build: parts.length == 3 ? 0 : parts[3],
			};
		}
		this._version = version;
		this.commit = commit;
		this.hash = hash;
		this.datetime = datetime ?? new Date(NaN);

		const release = ['dirty', 'alpha', 'beta', 'rc', 'preview'];
		const releaseType = (this._version.build & 0xf0000000) >> 28;
		this.variant = releaseType in release ? release[releaseType] : '';
	}

	toString(): string {
		const releaseType = (this._version.build & 0xf0000000) >> 28;
		let descript = this.variant.length > 0 ? `-${this.variant}` : '';

		if ((this._version.build & 0xff) > 0) {
			// Dirty builds count the number of commits ahead of a release tag
			if (releaseType == 0) descript += `+${this._version.build & 0xff}`;
			else if (releaseType != 0xf) descript += `${this._version.build & 0xff}`;
		}

		return `${this._version.major}.${this._version.minor}.${this._version.revision}${descript}`;
	}
}

export type FirmwareInfo = {
	version: PaciVersion;
	hash: string;
	hashValid: boolean;
	size: number;
	fileSize: number;
};

export interface PaciEventMap {
	battery: CustomEvent<{ value: number }>;
	bite: CustomEvent<{ value: number }>;
	suck: CustomEvent<{ values: number[] }>;
	touch: CustomEvent<{ values: number[] }>;
	connected: Event;
	disconnected: Event;
	reconnecting: Event;
	nameChanged: CustomEvent<{ name: string }>;
	firmwareVersion: CustomEvent<{ version: PaciVersion }>;
	featuresUpdated: CustomEvent<{ features: number }>;
	firmwareUploadProgress: CustomEvent<{ progressPercent: number }>;
	firmwareUploadComplete: Event;
}

// A bitmap of supported features a device may have.
// Each variant must be a bit shifted value.
export enum PaciFeature {
	McuMgr = 1 << 0,
	Bite = 1 << 1,
	Suck = 1 << 2,
	Touch = 1 << 3,
}

// Helper interface to superimpose our custom events (and Event types) to the EventTarget
// See: https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
interface PaciEventTarget extends EventTarget {
	addEventListener<K extends keyof PaciEventMap>(
		type: K,
		listener: (ev: PaciEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean,
	): void;
}

// Again, see: https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
const typedEventTarget = EventTarget as { new (): PaciEventTarget; prototype: PaciEventTarget };

export class Paci extends typedEventTarget {
	readonly SERVICE_UUID = 'abbd1ef0-62e8-493b-8549-8cb891483e20';
	readonly CHARACTERISTIC_CONTROL_UUID = 'abbd1ef1-62e8-493b-8549-8cb891483e20';
	readonly CHARACTERISTIC_FORCE_UUID = 'abbd1ef2-62e8-493b-8549-8cb891483e20';
	readonly CHARACTERISTIC_BITE_UUID = 'abbd1ef3-62e8-493b-8549-8cb891483e20';
	readonly CHARACTERISTIC_TOUCH_UUID = 'abbd1ef4-62e8-493b-8549-8cb891483e20';

	readonly SERVICE_BATTERY = 'battery_service';
	readonly CHARACTERISTIC_BATTERY_LEVEL = 'battery_level';

	private _device: BluetoothDevice | null;
	private _service: BluetoothRemoteGATTService | undefined;
	private _controlCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
	private _biteCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
	private _suckCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
	private _touchCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

	private _batteryService: BluetoothRemoteGATTService | undefined;
	private _batteryCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

	private _disconnectSignal: AbortController;

	private _firmwareVersion: Promise<PaciVersion> | null;
	private _name: string | null = null;
	private _features: number = 0;
	private _reconnect = false;
	private _firmwareFileInfo: FirmwareInfo | null = null;

	private _mcuManager = new McuManager({ mtu: 372 });

	constructor() {
		super();

		this._device = null;
		this._firmwareVersion = null;

		this._disconnectSignal = new AbortController();
		this._mcuManager.addEventListener('connected', this.onMcuManagerConnected.bind(this));
		this._mcuManager.addEventListener('message', this.onMcuManagerMessage.bind(this));

		// Firmware Management
		this._mcuManager.addEventListener('imageUploadProgress', (event) => {
			this.dispatchEvent(
				new CustomEvent('firmwareUploadProgress', {
					detail: {
						progressPercent: event.detail!.percentage,
					},
				}),
			);
		});

		this._mcuManager.addEventListener('imageUploadFinished', async (event) => {
			this.dispatchEvent(new Event('firmwareUploadComplete'));
		});
	}

	private async onMcuManagerConnected(_: Event): Promise<void> {
		await this._mcuManager.cmdImageState();
	}
	private async onMcuManagerMessage(event: CustomEvent<McuMgrMessage>): Promise<void> {
		switch (event.detail.group) {
			case GroupId.Image:
				switch (event.detail.id) {
					case GroupImageId.State:
						// This is where we can store information about other firmware images on the device.
						const images = event.detail.data.images as McuImageStat[];

						// If the firmware that's running was just updated. We can use the assumption
						// a successful bluetooth connection is good enough to mark it as successful.
						if (images[0].active && !images[0].confirmed) {
							const version = new PaciVersion(images[0].version);
							console.info(
								`Confirming the active firmware ${version} (${toHex(images[0].hash)}) as a success.`,
							);
							await this._mcuManager.cmdImageConfirm(images[0].hash);
						}
						break;
					default:
						break;
				}
				break;
			default:
				break;
		}
	}

	hasFeature(feature: PaciFeature): boolean {
		return (this._features & feature) != 0;
	}

	get connected(): boolean {
		return this._device?.gatt?.connected ?? false;
	}

	async disconnect(): Promise<void> {
		this._reconnect = false;
		this._features = 0;
		this._mcuManager.disconnect();
		await this._device?.gatt?.disconnect();
		this._disconnectSignal.abort();
	}

	get mcuManager(): McuManager {
		// if(!this.hasFeature(PaciFeature.McuMgr))
		//     throw new Error("MCUManger feature is unavailable.");

		return this._mcuManager;
	}

	async connect(): Promise<void> {
		let params: RequestDeviceOptions = {
			filters: [
				{
					services: [this.SERVICE_UUID],
				},
			],
			optionalServices: [McuManager.SERVICE_UUID, this.SERVICE_BATTERY],
		};

		this._device = await navigator.bluetooth.requestDevice(params);
		await this._connect();
	}

	private async _connect(): Promise<void> {
		if (this._device == null) throw new Error('No device selected.');

		this._firmwareVersion = null;

		// Assign a new abort controller for each new device connection.
		// Abort signal used to clean up event listeners.
		this._disconnectSignal?.abort();
		this._disconnectSignal = new AbortController();

		this._name = this._device?.name ?? null;
		this.dispatchEvent(new CustomEvent('nameChanged', { detail: { name: this._name } }));

		this._device.addEventListener(
			'gattserverdisconnected',
			async (_) => {
				if (this._reconnect) {
					// TODO: Implement a back-off-timer when reconnecting.
					this.dispatchEvent(new Event('reconnecting'));
					this._disconnectSignal.abort();
					await this._connect();
				} else {
					this.dispatchEvent(new Event('disconnected'));
				}
			},
			{ signal: this._disconnectSignal.signal } as any,
		);

		const server = await this._device.gatt?.connect();
		if (server === undefined) return;

		this._reconnect = true;

		this._service = await server.getPrimaryService(this.SERVICE_UUID);

		// Check to see if the McuMgr service is present.
		try {
			await server!.getPrimaryService(McuManager.SERVICE_UUID);
			this._mcuManager.attach(this._device!);
			this._features |= PaciFeature.McuMgr;
		} catch {}

		// Check to see if the battery service is present.
		try {
			this._batteryService = await server!.getPrimaryService(this.SERVICE_BATTERY);
			this._batteryCharacteristic = await this._batteryService.getCharacteristic(
				this.CHARACTERISTIC_BATTERY_LEVEL,
			);
			this._batteryCharacteristic.addEventListener(
				'characteristicvaluechanged',
				(event) => {
					const battery = event.target as BluetoothRemoteGATTCharacteristic;
					this.dispatchEvent(
						new CustomEvent('battery', { detail: { value: battery.value!.getUint8(0) } }),
					);
				},
				{ signal: this._disconnectSignal.signal } as any,
			);

			await this._batteryCharacteristic.startNotifications();
			await this._batteryCharacteristic?.readValue();
		} catch {
			// Assume no battery is present.
			this.dispatchEvent(new CustomEvent('battery', { detail: { value: 0 } }));
		}

		// Setup our sensor listeners on the various characteristics.
		try {
			this._biteCharacteristic = await this._service.getCharacteristic(
				this.CHARACTERISTIC_BITE_UUID,
			);
			this._biteCharacteristic.addEventListener(
				'characteristicvaluechanged',
				(event) => {
					const char = event.target as BluetoothRemoteGATTCharacteristic;
					const value = char.value?.getUint8(0) ?? 0;
					this.dispatchEvent(new CustomEvent('bite', { detail: { value } }));
				},
				{ signal: this._disconnectSignal.signal } as any,
			);
			await this._biteCharacteristic.startNotifications();
			this._features |= PaciFeature.Bite;
		} catch {
			console.warn('No bite sensor available.');
		}

		try {
			this._suckCharacteristic = await this._service.getCharacteristic(
				this.CHARACTERISTIC_FORCE_UUID,
			);
			this._suckCharacteristic.addEventListener(
				'characteristicvaluechanged',
				(event) => {
					const char = event.target as BluetoothRemoteGATTCharacteristic;
					const forces: number[] = [];
					for (let i = 0; i < char.value!.byteLength; i++) {
						forces[i] = char.value?.getUint8(i) ?? 0;
					}

					this.dispatchEvent(new CustomEvent('suck', { detail: { values: forces } }));
				},
				{ signal: this._disconnectSignal.signal } as any,
			);
			await this._suckCharacteristic.startNotifications();
			this._features |= PaciFeature.Suck;
		} catch {
			console.warn('No suck sensor available');
		}

		try {
			this._touchCharacteristic = await this._service.getCharacteristic(
				this.CHARACTERISTIC_TOUCH_UUID,
			);
			this._touchCharacteristic.addEventListener(
				'characteristicvaluechanged',
				(event) => {
					const char = event.target as BluetoothRemoteGATTCharacteristic;
					const touch_bitmap: number = char.value?.getUint8(0) ?? 0;
					const touches: number[] = [];
					for (let i = 0; i < 8; i++) {
						if ((touch_bitmap & (1 << i)) != 0) {
							touches.push(i);
						}
					}

					this.dispatchEvent(new CustomEvent('touch', { detail: { values: touches } }));
				},
				{ signal: this._disconnectSignal.signal } as any,
			);
			await this._touchCharacteristic.startNotifications();
			this._features |= PaciFeature.Touch;
		} catch {
			console.warn('No touch sensor available.');
		}

		this._controlCharacteristic = await this._service.getCharacteristic(
			this.CHARACTERISTIC_CONTROL_UUID,
		);
		this._controlCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
			const char = event.target as BluetoothRemoteGATTCharacteristic;
			if (char.value === undefined) {
				return;
			}

			const response = ControlResponse.fromBinary(new Uint8Array(char.value.buffer));
			switch (response.response.case) {
				case 'firmwareVersion':
					const version = response.response.value as Version;
					this.dispatchEvent(
						new CustomEvent('firmwareVersion', {
							detail: {
								version: new PaciVersion(
									{
										major: version.major,
										minor: version.minor,
										revision: version.revision,
										build: version.build,
									},
									toHex(version.commit),
									new Date(version.timestamp == BigInt(0) ? NaN : Number(version.timestamp) * 1000),
									toHex(version.hash),
								),
							},
						}),
					);

					break;
				case 'sensorReadings':
					break;
				default:
					console.log(`Unsupported response (${response.response.case})`, response);
					return;
			}
		});

		await this._controlCharacteristic.startNotifications();

		this.dispatchEvent(
			new CustomEvent('featuresUpdated', { detail: { features: this._features } }),
		);
		this.dispatchEvent(new Event('connected'));
	}

	async setName(name: string): Promise<void> {
		const settingMsg = new Setting();
		settingMsg.name = name;

		const request = new ControlRequest();
		request.request = { case: 'setting', value: settingMsg };

		return await this._sendRequest(request);
	}

	async getName(): Promise<string> {
		if (this._name) return this._name;

		return await new Promise((resolve) => {
			this.addEventListener(
				'nameChanged',
				(event) => {
					resolve(event.detail.name);
				},
				{ once: true },
			);
		});
	}

	async getFirmwareVersion(): Promise<string> {
		if (this._firmwareVersion === null) {
			this._firmwareVersion = this._getFirmwareVersion();
		}

		return await this._firmwareVersion.then((version) => version.toString());
	}

	async getFirmwareDate(): Promise<Date | null> {
		if (this._firmwareVersion === null) {
			this._firmwareVersion = this._getFirmwareVersion();
		}

		return await this._firmwareVersion.then((version) => version.datetime);
	}

	async getFirmwareCommit(): Promise<string> {
		if (this._firmwareVersion === null) {
			this._firmwareVersion = this._getFirmwareVersion();
		}

		return await this._firmwareVersion.then((version) => version.commit ?? '');
	}

	async getFirmwareHash(): Promise<string> {
		if (this._firmwareVersion === null) {
			this._firmwareVersion = this._getFirmwareVersion();
		}

		return await this._firmwareVersion.then((version) => version.hash ?? '');
	}

	private async _getFirmwareVersion(): Promise<PaciVersion> {
		const request = new ControlRequest();

		const p = new Promise<PaciVersion>((resolve) => {
			this.addEventListener('firmwareVersion', (event) => resolve(event.detail.version), {
				once: true,
			} as any);
		});

		request.request = { case: 'firmwareVersion', value: new VersionRequest() };
		await this._controlCharacteristic!.writeValueWithResponse(request.toBinary());

		return await p;
	}

	private async _waitMcuMgrResponse(groupId: number, messageId: number): Promise<McuMgrMessage> {
		return new Promise((resolve, reject) => {
			this._mcuManager.addEventListener(
				'message',
				(event) => {
					const message = event.detail as McuMgrMessage;
					if (message.group != groupId || message.id != messageId) {
						console.error('Unexpected response', message);
						reject(new Error('Unexpected response'));
						return;
					}
					if (message.data.rc) {
						// Got a non-zero response code
						reject(new Error(`Error with State request (rc: ${message.data.rc}})`));
					} else {
						resolve(message);
					}
				},
				{ once: true },
			);
		});
	}

	async uploadFirmwareFile(firmware: File): Promise<void> {
		this._firmwareFileInfo = await Paci.getFirmwareInfo(firmware);
		const statResponse = this._waitMcuMgrResponse(GroupId.Image, GroupImageId.State).then(
			(message) => {
				const images = message.data.images as McuImageStat[];
				if (toHex(images[0].hash) == this._firmwareFileInfo!.hash)
					throw new Error('Cannot upload the same firmware that is already on the device.');
			},
		);
		await this.mcuManager.cmdImageState();
		await statResponse;
		await this.mcuManager.cmdUpload(await firmware.arrayBuffer());
	}

	// Select the firmware that's in the uploaded slot and attempt to reboot into it.
	async applyFirmwareUpdate(): Promise<void> {
		// Fetch the hash of the image in slot 1, issue the cmdImageTest(hash) and then reset.

		// Set up response handler before sending the request.
		const slot1ImageResponse = this._waitMcuMgrResponse(GroupId.Image, GroupImageId.State).then(
			(message) => {
				const images = message.data.images as McuImageStat[];
				console.debug(images);
				if (
					images[0].hash.length == images[1].hash.length &&
					images[0].hash.every((value, index) => images[1].hash[index] == value)
				)
					throw new Error('Uploaded firmware is identical to already running firmware');

				return images[1];
			},
		);

		// Send a request for current image slot states.
		await this._mcuManager.cmdImageState();
		// Await the response.
		const slot1Image = await slot1ImageResponse;
		const slot1Version = new PaciVersion(slot1Image.version);
		console.debug(`Detected uploaded firmware ${slot1Version} is ready to apply.`);

		const testResponse = this._waitMcuMgrResponse(GroupId.Image, GroupImageId.State);
		await this._mcuManager.cmdImageTest(slot1Image.hash);
		await testResponse.then((message) => {
			const images = message.data.images as McuImageStat[];
			const slot1Version = new PaciVersion(images[1].version);
			console.debug(
				`Slot 1 firmware ${slot1Version} is ${images[1].pending ? 'now' : 'not'} pending`,
			);
		});

		await this._mcuManager.cmdReset();
	}

	private async _sendRequest(request: ControlRequest): Promise<void> {
		await this._controlCharacteristic!.writeValueWithResponse(request.toBinary());
	}

	async calibrateInput(input: InputType, calibrate: CalibrationType): Promise<void> {
		const calibrateMsg = new CalibrateSensor();
		switch (input) {
			case InputType.Bite:
				if (calibrate == CalibrationType.Min) {
					calibrateMsg.sensor = CalibrateSensor_Sensor.BITE_MIN;
				} else if (calibrate == CalibrationType.Max) {
					calibrateMsg.sensor = CalibrateSensor_Sensor.BITE_MAX;
				}
				break;
			case InputType.Suck:
				if (calibrate == CalibrationType.Min) {
					calibrateMsg.sensor = CalibrateSensor_Sensor.SUCK_MIN;
				} else if (calibrate == CalibrationType.Max) {
					calibrateMsg.sensor = CalibrateSensor_Sensor.SUCK_MAX;
				}
				break;
		}

		const request = new ControlRequest();
		request.request = { case: 'calibrateSensor', value: calibrateMsg };

		return await this._sendRequest(request);
	}

	static async getFirmwareInfo(file: File): Promise<FirmwareInfo> {
		if (file.size > 10_000_000) throw new Error('File is too large.');

		const fileData = await file.arrayBuffer();
		const firmwareInfo = await new McuManager().imageInfo(fileData);

		if (!firmwareInfo.hashValid) throw new Error(`Invalid hash: ${toHex(firmwareInfo.hash)}`);

		let padded_timestamp = Uint8Array.from([
			...Array(8 - (firmwareInfo.tags[0xa1]?.length ?? 0)).fill(0),
			...(firmwareInfo.tags[0xa1] ?? []),
		]);

		const timestamp = new DataView(padded_timestamp.buffer).getBigUint64(0);
		const date = new Date(Number(timestamp) * 1000);
		const commit = 0xa0 in firmwareInfo.tags ? toHex(firmwareInfo.tags[0xa0]) : '';

		return {
			version: new PaciVersion(firmwareInfo.version, commit, date),
			hash: toHex(firmwareInfo.hash),
			hashValid: firmwareInfo.hashValid,
			size: firmwareInfo.imageSize,
			fileSize: fileData.byteLength,
		};
	}
}
