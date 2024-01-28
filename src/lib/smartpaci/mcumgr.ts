import * as cborg from 'cborg';

// Opcodes
export enum OpCode {
    Read = 0,
    ReadResponse = 1,
    Write = 2,
    WriteResponse = 3,
}

// Groups
export enum GroupId {
    OS = 0,
    Image = 1,
    Stat = 2,
    Config = 3,
    Log = 4,
    Crash = 5,
    Split = 6,
    Run = 7,
    FileSystem = 8,
    Shell = 9,
}

// OS group
export enum GroupOSId {
    Echo = 0,
    ConsoleEchoControl = 1,
    TaskStat = 2,
    Mpstat = 3,
    Datetime = 4,
    Reset = 5,
}

// Image group
export enum GroupImageId {
    State = 0,
    Upload = 1,
    File = 2,
    CoreList = 3,
    CoreLoad = 4,
    Erase = 5,
}

type Logger = {
    info: (...data: any[]) => void;
    error: (...data: any[]) => void;
}

export interface McuMgrMessage {
    readonly op: number;
    readonly group: number;
    readonly id: number;
    readonly data: number;
    readonly length: number;
}

export type SemVersion = {
    major: number;
    minor: number;
    revision: number;
    build: number;
}

export type McuImageInfo = {
    imageSize: number;
    version: SemVersion;
    hash: Uint8Array;
    hashValid: boolean;
    tags: {[tag: number]: Uint8Array};
}

interface McuMgrEventMap {
    'connected': Event;
    'connecting': Event;
    'disconnected': Event;
    'message': CustomEvent<McuMgrMessage>;
    'imageUploadProgress': CustomEvent<{percentage: number}>;
    'imageUploadFinished': Event;
}

// Helper interface to superimpose our custom events (and Event types) to the EventTarget
// See: https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
interface McuMgrEventTarget extends EventTarget {
    addEventListener<K extends keyof McuMgrEventMap>(
        type: K,
        listener: (ev: McuMgrEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean
    ): void;
}

// Again, see: https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
const typedEventTarget = EventTarget as {new(): McuMgrEventTarget; prototype: McuMgrEventTarget};

export class McuManager extends typedEventTarget {
    static readonly SERVICE_UUID = '8d53dc1d-1db7-4cd3-868b-8a527460aa84';
    static readonly CHARACTERISTIC_UUID = 'da2e7828-fbce-4e01-ae9e-261174997c48';
    static readonly SMP_HEADER_SIZE = 8;

    private _mtu: number;
    private _device: BluetoothDevice | null;
    private _service: BluetoothRemoteGATTService | null;
    private _characteristic: BluetoothRemoteGATTCharacteristic | null;
    
    private _uploadIsInProgress: boolean;
    private _buffer: Uint8Array;
    private _logger: Logger ;
    private _uploadOffset: number;
    private _seq;
    private _userRequestedDisconnect;
    private _uploadImage: ArrayBuffer | null;
    private _uploadSlot: number;

    constructor(options?: {mtu?: number}) {
        super()

        this._mtu = options?.mtu ?? 140;
        this._device = null;
        this._service = null;
        this._characteristic = null;
        
        this._uploadIsInProgress = false;
        this._buffer = new Uint8Array();
        this._logger = { info: console.log, error: console.error };
        this._seq = 0;
        this._userRequestedDisconnect = false;
        this._uploadOffset = 0;
        this._uploadImage = null;
        this._uploadSlot = 0;
    }

    private async _requestDevice(filters?: BluetoothLEScanFilter[]) {
        let params : RequestDeviceOptions = filters == undefined
            ? {
                acceptAllDevices: true,
                optionalServices: [McuManager.SERVICE_UUID],
            }
            : { 
                optionalServices: [McuManager.SERVICE_UUID],
                filters: filters,
                acceptAllDevices: false,

            };

        return navigator.bluetooth.requestDevice(params);
    }

    async connect(filters?: BluetoothLEScanFilter[]): Promise<void> {
        try {
            this._device = await this._requestDevice(filters);
            this._logger.info(`Connecting to device ${this.name}...`);
            this._device.addEventListener('gattserverdisconnected', async event => {
                this._logger.info(event);
                if (!this._userRequestedDisconnect) {
                    this._logger.info('Trying to reconnect');
                    this._connect(1000);
                } else {
                    this._disconnected();
                }
            });
            this._connect(0);
        } catch (error) {
            this._logger.error(error);
            await this._disconnected();
            return;
        }
    }

    attach(device: BluetoothDevice) {
        this._device = device;
        this._connect(0);
    }

    private _connect (timeout: number = 1000) {
        setTimeout(async () => {
            try {
                if (!this._device?.gatt)
                    throw new Error("No GATT Service or Device selected");
                
                const server = this._device.gatt;
                if (!this._device.gatt.connected) {
                    this.dispatchEvent(new Event('connecting'));
                    await server.connect();
                    this._logger.info(`Server connected.`);
                }

                this._service = await server.getPrimaryService(McuManager.SERVICE_UUID);
                this._logger.info(`Service connected.`);

                this._characteristic = await this._service.getCharacteristic(McuManager.CHARACTERISTIC_UUID);
                this._characteristic.addEventListener('characteristicvaluechanged', this._notification.bind(this));
                await this._characteristic.startNotifications();
                await this._connected();
                if (this._uploadIsInProgress) {
                    this._uploadNext();
                }
            } catch (error) {
                this._logger.error(error);
                await this._disconnected();
            }
        }, timeout);
    }
    disconnect() {
        this._userRequestedDisconnect = true;
        return this._device?.gatt?.disconnect();
    }
    
    private _connected() {
        this.dispatchEvent(new Event('connteded'));
    }

    private _disconnected() {
        this._logger.info('Disconnected.');
        this.dispatchEvent(new Event('disconntected'));

        this._device = null;
        this._service = null;
        this._characteristic = null;
        this._uploadIsInProgress = false;
        this._userRequestedDisconnect = false;
    }

    get name() : string | null {
        return this._device?.name ?? null;
    }

    private async _sendMessage(op: number, group: number, id: number, data?: any) {
        const _flags = 0;
        let encodedData: number[] = [];
        if (data) {
            encodedData = [...cborg.encode(data)];
        }

        const length_lo = encodedData.length & 255;
        const length_hi = encodedData.length >> 8;
        const group_lo = group & 255;
        const group_hi = group >> 8;
        const message = [op, _flags, length_hi, length_lo, group_hi, group_lo, this._seq, id, ...encodedData];

        // this._logger.info('>'  + message.map(x => x.toString(16).padStart(2, '0')).join(' '));
        await this._characteristic!.writeValueWithoutResponse(Uint8Array.from(message));
        this._seq = (this._seq + 1) % 256;
    }
    
    private _notification(event: Event) {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const message = new Uint8Array(target.value!.buffer);
        this._buffer = new Uint8Array([...this._buffer, ...message]);
        const messageLength = this._buffer[2] * 256 + this._buffer[3];
        
        // this._logger.info('<'  + [...message].map(x => x.toString(16).padStart(2, '0')).join(' '));
        if (this._buffer.length < messageLength + McuManager.SMP_HEADER_SIZE) {
            this._logger.error("Ignoring message?!");
            return;
        }

        this._processMessage(this._buffer.slice(0, messageLength + McuManager.SMP_HEADER_SIZE));
        this._buffer = this._buffer.slice(messageLength + McuManager.SMP_HEADER_SIZE);
    }

    private _processMessage(message: Uint8Array) {
        const [op, _flags, length_hi, length_lo, group_hi, group_lo, _seq, id] = message;
        const data = cborg.decode(message.slice(8));
        const length = length_hi * 256 + length_lo;
        const group = group_hi * 256 + group_lo;
        // Note that "rc" may not be present if it is 0
        if (data.rc) {
            this._logger.error("Got a non-zero response code")
            this._logger.error(`Message: op: ${op}, group: ${group}, id: ${id}, length: ${length}`, data);
        } else if (group === GroupId.Image && id === GroupImageId.Upload && data.off) {
            this._uploadOffset = data.off;
            this._uploadNext();
            return;
        }

        this.dispatchEvent(new CustomEvent('message', {detail: { op, group, id, data, length }}));
    }

    cmdReset() {
        return this._sendMessage(OpCode.Write, GroupId.OS, GroupOSId.Reset);
    }
    
    smpEcho(message: string) {
        return this._sendMessage(OpCode.Write, GroupId.OS, GroupOSId.Echo, { d: message });
    }
    
    cmdImageState() {
        return this._sendMessage(OpCode.Read, GroupId.Image, GroupImageId.State);
    }
    
    cmdImageErase() {
        return this._sendMessage(OpCode.Write, GroupId.Image, GroupImageId.Erase, {});
    }
    
    cmdImageTest(hash: Uint8Array) {
        return this._sendMessage(OpCode.Write, GroupId.Image, GroupImageId.State, { hash, confirm: false });
    }
    
    cmdImageConfirm(hash: Uint8Array) {
        return this._sendMessage(OpCode.Write, GroupId.Image, GroupImageId.State, { hash, confirm: true });
    }

    private _hash(image: Uint8Array | ArrayBuffer): Promise<ArrayBuffer> {
        return crypto.subtle.digest('SHA-256', image);
    }

    private async _uploadNext() {
        if (!this._uploadImage) {
            this._logger.info("No firmware uplaod to do...");
            return;
        }

        if (this._uploadOffset >= this._uploadImage.byteLength) {
            this._uploadIsInProgress = false;
            this.dispatchEvent(new Event('imageUploadFinished'));
            this._logger.info("Upload finished.");
            return;
        }

        const nmpOverhead = 8;
        type MCUPayload = {
            data: Uint8Array;
            off: number;
            len?: number;
            sha?: Uint8Array;
        }
        const message: MCUPayload = { data: new Uint8Array(), off: this._uploadOffset };
        if (this._uploadOffset === 0) {
            message.len = this._uploadImage.byteLength;
            message.sha = new Uint8Array(await this._hash(this._uploadImage));
        }

        this.dispatchEvent(new CustomEvent('imageUploadProgress', {
            detail: {
                percentage: Math.floor(this._uploadOffset / this._uploadImage.byteLength * 100),
            },
        }));

        const length = this._mtu - cborg.encode(message).byteLength - nmpOverhead;

        message.data = new Uint8Array(this._uploadImage.slice(this._uploadOffset, this._uploadOffset + length));

        this._uploadOffset += length;

        await this._sendMessage(OpCode.Write, GroupId.Image, GroupImageId.Upload, message);
    }
    
    async cmdUpload(image: ArrayBuffer, slot = 0) {
        if (this._uploadIsInProgress) {
            this._logger.error('Upload is already in progress.');
            return;
        }
        this._uploadIsInProgress = true;

        this._uploadOffset = 0;
        this._uploadImage = image;
        this._uploadSlot = slot;

        await this._uploadNext();
    }

    private * _extractTlvs(data: ArrayBuffer): Generator<{tag: number, value: Uint8Array}> {
        const view = new DataView(data);
        let offset = 0;
        while (offset < view.byteLength) {
            const tag = view.getUint16(offset, true);
            const len = view.getUint16(offset + 2, true);
            offset += 4;
            const data = view.buffer.slice(offset, offset + len);
            offset += len;
            
            yield {tag, value: new Uint8Array(data)};
        }
    }

    async imageInfo(image: ArrayBuffer): Promise<McuImageInfo> {
        // https://interrupt.memfault.com/blog/mcuboot-overview#mcuboot-image-binaries

        const littleEndian = true;

        // const view = new Uint8Array(image);
        const view = new DataView(image);

        // check header length
        if (view.byteLength < 32) {
            throw new Error('Invalid image (too short file)');
        }

        // check MAGIC bytes 0x96f3b83d
        if (view.getUint32(0, littleEndian) !== 0x96f3b83d)
            throw new Error('Invalid image (wrong magic bytes)');

        // check load address is 0x00000000
        if (view.getUint32(4, littleEndian) != 0)
            throw new Error('Invalid image (wrong load address)');

        const headerSize = view.getUint16(8, true);

        // Protected TLV area is included in the hash
        const protected_tlv_lenth = view.getUint16(10, littleEndian);

        const imageSize = view.getUint32(12, littleEndian);

        // check image size is correct
        if (view.byteLength < imageSize + headerSize)
            throw new Error('Invalid image (wrong image size)');

        // check flags is 0x00000000
        if (view.getUint32(16, littleEndian) !== 0)
            throw new Error('Invalid image (wrong flags)');

        const version: SemVersion = {
            major: view.getUint8(20),
            minor: view.getUint8(21),
            revision: view.getUint16(22, littleEndian),
            build: view.getUint32(24, littleEndian),
        };
        
        const hash = new Uint8Array(await this._hash(image.slice(0, headerSize + imageSize + protected_tlv_lenth)));
        const info = {version, hash, hashValid:false, imageSize, tags: []} as McuImageInfo;

        let offset = headerSize + imageSize;
        let tlv_end = offset;
        if (protected_tlv_lenth > 0) {
            if (view.getUint16(offset, littleEndian) !== 0x6908)
                throw new Error(`Expected protected TLV magic number. (0x${offset.toString(16)}: 0x${view.getUint16(offset, littleEndian).toString(16)})`);

            tlv_end = view.getUint16(offset + 2, littleEndian) + offset;
            for (let tlv of this._extractTlvs(view.buffer.slice(offset + 4, tlv_end))) {
                info.tags[tlv.tag] = tlv.value;
            }
            offset = tlv_end;
        }
        
        if (view.getUint16(offset, littleEndian) !== 0x6907)
            throw new Error(`Expected TLV magic number. (0x${offset.toString(16)}: 0x${view.getUint16(offset, littleEndian).toString(16)})`);

        tlv_end = view.getUint16(offset + 2, littleEndian) + offset;
        for (let tlv of this._extractTlvs(view.buffer.slice(offset + 4, tlv_end))) {
            info.tags[tlv.tag] = tlv.value;
        }

        if (16 in info.tags && info.tags[16].length == hash.length) {
            info.hashValid = info.tags[16].every((b, i) => b === hash[i]);
        }

        return info;
    }
}

