// @generated by protoc-gen-es v1.7.0 with parameter "target=ts"
// @generated from file bluetooth.proto (package bluetooth, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import type { BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage } from "@bufbuild/protobuf";
import { Message, proto3, protoInt64 } from "@bufbuild/protobuf";

/**
 * @generated from message bluetooth.Version
 */
export class Version extends Message<Version> {
  /**
   * @generated from field: uint32 major = 1;
   */
  major = 0;

  /**
   * @generated from field: uint32 minor = 2;
   */
  minor = 0;

  /**
   * @generated from field: uint32 revision = 3;
   */
  revision = 0;

  /**
   * @generated from field: uint32 build = 4;
   */
  build = 0;

  /**
   * @generated from field: bytes commit = 5;
   */
  commit = new Uint8Array(0);

  /**
   * @generated from field: int64 timestamp = 6;
   */
  timestamp = protoInt64.zero;

  constructor(data?: PartialMessage<Version>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "bluetooth.Version";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "major", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 2, name: "minor", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 3, name: "revision", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 4, name: "build", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 5, name: "commit", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 6, name: "timestamp", kind: "scalar", T: 3 /* ScalarType.INT64 */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Version {
    return new Version().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Version {
    return new Version().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Version {
    return new Version().fromJsonString(jsonString, options);
  }

  static equals(a: Version | PlainMessage<Version> | undefined, b: Version | PlainMessage<Version> | undefined): boolean {
    return proto3.util.equals(Version, a, b);
  }
}

/**
 * @generated from message bluetooth.CalibrateSensor
 */
export class CalibrateSensor extends Message<CalibrateSensor> {
  /**
   * @generated from field: bluetooth.CalibrateSensor.Sensor sensor = 1;
   */
  sensor = CalibrateSensor_Sensor.INVALID;

  constructor(data?: PartialMessage<CalibrateSensor>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "bluetooth.CalibrateSensor";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "sensor", kind: "enum", T: proto3.getEnumType(CalibrateSensor_Sensor) },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CalibrateSensor {
    return new CalibrateSensor().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CalibrateSensor {
    return new CalibrateSensor().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CalibrateSensor {
    return new CalibrateSensor().fromJsonString(jsonString, options);
  }

  static equals(a: CalibrateSensor | PlainMessage<CalibrateSensor> | undefined, b: CalibrateSensor | PlainMessage<CalibrateSensor> | undefined): boolean {
    return proto3.util.equals(CalibrateSensor, a, b);
  }
}

/**
 * @generated from enum bluetooth.CalibrateSensor.Sensor
 */
export enum CalibrateSensor_Sensor {
  /**
   * @generated from enum value: INVALID = 0;
   */
  INVALID = 0,

  /**
   * @generated from enum value: BITE_MIN = 1;
   */
  BITE_MIN = 1,

  /**
   * @generated from enum value: BITE_MAX = 2;
   */
  BITE_MAX = 2,

  /**
   * @generated from enum value: SUCK_MIN = 3;
   */
  SUCK_MIN = 3,

  /**
   * @generated from enum value: SUCK_MAX = 4;
   */
  SUCK_MAX = 4,
}
// Retrieve enum metadata with: proto3.getEnumType(CalibrateSensor_Sensor)
proto3.util.setEnumType(CalibrateSensor_Sensor, "bluetooth.CalibrateSensor.Sensor", [
  { no: 0, name: "INVALID" },
  { no: 1, name: "BITE_MIN" },
  { no: 2, name: "BITE_MAX" },
  { no: 3, name: "SUCK_MIN" },
  { no: 4, name: "SUCK_MAX" },
]);

/**
 * @generated from message bluetooth.VersionRequest
 */
export class VersionRequest extends Message<VersionRequest> {
  constructor(data?: PartialMessage<VersionRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "bluetooth.VersionRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): VersionRequest {
    return new VersionRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): VersionRequest {
    return new VersionRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): VersionRequest {
    return new VersionRequest().fromJsonString(jsonString, options);
  }

  static equals(a: VersionRequest | PlainMessage<VersionRequest> | undefined, b: VersionRequest | PlainMessage<VersionRequest> | undefined): boolean {
    return proto3.util.equals(VersionRequest, a, b);
  }
}

/**
 * Requests sent to the control enpoint.
 *
 * @generated from message bluetooth.ControlRequest
 */
export class ControlRequest extends Message<ControlRequest> {
  /**
   * @generated from oneof bluetooth.ControlRequest.request
   */
  request: {
    /**
     * @generated from field: bluetooth.CalibrateSensor calibrate_sensor = 1;
     */
    value: CalibrateSensor;
    case: "calibrateSensor";
  } | {
    /**
     * @generated from field: bluetooth.VersionRequest firmware_version = 2;
     */
    value: VersionRequest;
    case: "firmwareVersion";
  } | {
    /**
     * @generated from field: bluetooth.VersionRequest hardware_version = 3;
     */
    value: VersionRequest;
    case: "hardwareVersion";
  } | { case: undefined; value?: undefined } = { case: undefined };

  constructor(data?: PartialMessage<ControlRequest>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "bluetooth.ControlRequest";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "calibrate_sensor", kind: "message", T: CalibrateSensor, oneof: "request" },
    { no: 2, name: "firmware_version", kind: "message", T: VersionRequest, oneof: "request" },
    { no: 3, name: "hardware_version", kind: "message", T: VersionRequest, oneof: "request" },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): ControlRequest {
    return new ControlRequest().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): ControlRequest {
    return new ControlRequest().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): ControlRequest {
    return new ControlRequest().fromJsonString(jsonString, options);
  }

  static equals(a: ControlRequest | PlainMessage<ControlRequest> | undefined, b: ControlRequest | PlainMessage<ControlRequest> | undefined): boolean {
    return proto3.util.equals(ControlRequest, a, b);
  }
}

/**
 * @generated from message bluetooth.ControlResponse
 */
export class ControlResponse extends Message<ControlResponse> {
  /**
   * @generated from oneof bluetooth.ControlResponse.response
   */
  response: {
    /**
     * @generated from field: bluetooth.Version firmware_version = 1;
     */
    value: Version;
    case: "firmwareVersion";
  } | {
    /**
     * @generated from field: bluetooth.Version hardware_version = 2;
     */
    value: Version;
    case: "hardwareVersion";
  } | { case: undefined; value?: undefined } = { case: undefined };

  constructor(data?: PartialMessage<ControlResponse>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "bluetooth.ControlResponse";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "firmware_version", kind: "message", T: Version, oneof: "response" },
    { no: 2, name: "hardware_version", kind: "message", T: Version, oneof: "response" },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): ControlResponse {
    return new ControlResponse().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): ControlResponse {
    return new ControlResponse().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): ControlResponse {
    return new ControlResponse().fromJsonString(jsonString, options);
  }

  static equals(a: ControlResponse | PlainMessage<ControlResponse> | undefined, b: ControlResponse | PlainMessage<ControlResponse> | undefined): boolean {
    return proto3.util.equals(ControlResponse, a, b);
  }
}

