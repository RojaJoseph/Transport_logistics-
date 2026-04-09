import mongoose, { Schema, Document } from 'mongoose';

// ── GpsPosition — every raw ping from a device ───────────────────
export interface IGpsPosition extends Document {
  deviceId:   string;
  shipmentId: string;
  vehicleId:  string;
  lat:        number;
  lng:        number;
  altitude:   number;
  speed:      number;      // km/h
  heading:    number;      // degrees 0-359
  accuracy:   number;      // metres
  satellites: number;
  timestamp:  Date;
  // IoT telemetry (optional, from sensor payload)
  temp?:      number;
  humidity?:  number;
  fuelPct?:   number;
  engineOn?:  boolean;
  shockG?:    number;
  odometer?:  number;      // km
  signalRssi?:number;
  rawPayload?:Record<string, unknown>;
}

const GpsPositionSchema = new Schema<IGpsPosition>({
  deviceId:   { type: String, required: true, index: true },
  shipmentId: { type: String, required: true, index: true },
  vehicleId:  { type: String, required: true, index: true },
  lat:        { type: Number, required: true },
  lng:        { type: Number, required: true },
  altitude:   { type: Number, default: 0 },
  speed:      { type: Number, default: 0 },
  heading:    { type: Number, default: 0 },
  accuracy:   { type: Number, default: 0 },
  satellites: { type: Number, default: 0 },
  timestamp:  { type: Date,   required: true, index: true },
  temp:       Number,
  humidity:   Number,
  fuelPct:    Number,
  engineOn:   Boolean,
  shockG:     Number,
  odometer:   Number,
  signalRssi: Number,
  rawPayload: Schema.Types.Mixed,
}, {
  timeseries: { timeField: 'timestamp', metaField: 'deviceId', granularity: 'seconds' },
  expireAfterSeconds: 60 * 60 * 24 * 90,  // 90-day TTL
});

// Geospatial index for "nearby vehicles" queries
GpsPositionSchema.index({ lat: 1, lng: 1 });
GpsPositionSchema.index({ shipmentId: 1, timestamp: -1 });

export const GpsPosition = mongoose.model<IGpsPosition>('GpsPosition', GpsPositionSchema);

// ── Device — registered GPS trackers ─────────────────────────────
export interface IDevice extends Document {
  deviceId:    string;
  imei:        string;
  type:        'obd' | 'hardwired' | 'mobile' | 'asset_tracker';
  vehicleId:   string;
  vehicleReg:  string;
  shipmentId?: string;
  active:      boolean;
  lastSeen?:   Date;
  firmware?:   string;
  simIccid?:   string;
  createdAt:   Date;
}

const DeviceSchema = new Schema<IDevice>({
  deviceId:   { type: String, required: true, unique: true },
  imei:       { type: String, required: true, unique: true },
  type:       { type: String, enum: ['obd','hardwired','mobile','asset_tracker'], default: 'hardwired' },
  vehicleId:  { type: String, required: true },
  vehicleReg: { type: String, required: true },
  shipmentId: String,
  active:     { type: Boolean, default: true },
  lastSeen:   Date,
  firmware:   String,
  simIccid:   String,
}, { timestamps: true });

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);

// ── Geofence ──────────────────────────────────────────────────────
export interface IGeofence extends Document {
  name:        string;
  type:        'circle' | 'polygon';
  center?:     { lat: number; lng: number };
  radiusMetres?: number;
  polygon?:    Array<{ lat: number; lng: number }>;
  alertOnEnter: boolean;
  alertOnExit:  boolean;
  assignedTo:  string[];  // shipmentIds or vehicleIds
  active:      boolean;
}

const GeofenceSchema = new Schema<IGeofence>({
  name:          { type: String, required: true },
  type:          { type: String, enum: ['circle','polygon'], required: true },
  center:        { lat: Number, lng: Number },
  radiusMetres:  Number,
  polygon:       [{ lat: Number, lng: Number }],
  alertOnEnter:  { type: Boolean, default: true },
  alertOnExit:   { type: Boolean, default: true },
  assignedTo:    [String],
  active:        { type: Boolean, default: true },
}, { timestamps: true });

export const Geofence = mongoose.model<IGeofence>('Geofence', GeofenceSchema);
