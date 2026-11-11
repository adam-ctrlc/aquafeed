/**
 * Shapes of the Firebase Realtime Database nodes shared by the app and the ESP32.
 * All timestamps (`ts`, `*At`) are Unix epoch milliseconds.
 */

export type Role = 'owner' | 'admin';

/** Users/{uid} */
export interface UserProfile {
  email: string;
  /** Full name, kept in sync with the parts below */
  displayName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  /** Small base64 JPEG data URI (256 px) */
  photo?: string;
  role: Role;
  /** Set by an administrator: the person can no longer use the app */
  disabled?: boolean;
  /** Removed by an administrator: hidden from lists and blocked from the app */
  deleted?: boolean;
  aquariumId: string;
  createdAt: number;
  /** Expo push tokens, keyed by a sanitized copy of the token */
  pushTokens?: Record<string, string>;
}

export interface FishSpecies {
  variety: string;
  count: number;
  sizeCm: number;
}

/** Aquariums/{aquariumId} */
export interface Aquarium {
  ownerUid: string;
  name: string;
  widthCm?: number;
  heightCm?: number;
  target_fish_species: FishSpecies;
  deviceId?: string;
  createdAt: number;
}

export type HopperLevel = 'good' | 'low' | 'critical';
export type CommandStatus = 'pending' | 'running' | 'done' | 'failed';

export interface FeedCommand {
  grams: number;
  requestedAt: number;
  requestedBy: string;
  status: CommandStatus;
  /** Set by the device when finished */
  verifiedG?: number;
  error?: string;
}

export type CalibrationAction =
  | 'tare'
  | 'measure_free_fall_offset'
  | 'ph_point_4'
  | 'ph_point_686'
  | 'ph_point_918'
  | 'turbidity_baseline'
  | 'hopper_measure';

export interface CalibrationCommand {
  action: CalibrationAction;
  requestedAt: number;
  requestedBy: string;
  status: CommandStatus;
  result?: number;
  error?: string;
}

export interface Calibration {
  /** HX711 raw counts per gram */
  loadCellFactor?: number;
  /** Average overshoot (g) after the gate closes */
  freeFallOffsetG?: number;
  /** Probe voltages captured in each buffer */
  phVoltage4?: number;
  phVoltage686?: number;
  phVoltage918?: number;
  /** Raw turbidity ADC/voltage in clean water */
  turbidityBaseline?: number;
  /** Ultrasonic distance (cm) with a full / empty hopper */
  hopperFullCm?: number;
  hopperEmptyCm?: number;
  updatedAt?: number;
}

/** AquaFeed_Devices/{deviceId} */
export interface Device {
  aquariumId: string;
  firmware?: string;
  /** Heartbeat written by the device */
  lastSeen?: number;
  hopper?: { distanceCm: number; level: HopperLevel; ts: number };
  calibration?: Calibration;
  commands?: {
    feed?: FeedCommand;
    calibrate?: CalibrationCommand;
  };
}

/** Feeding_Schedules/{aquariumId}/{scheduleId} */
export interface FeedingSchedule {
  /** 24-hour "HH:mm", device local time */
  time: string;
  grams: number;
  enabled: boolean;
  updatedAt: number;
}

export interface FeedingFaults {
  emptyOrJammed?: boolean;
  dispenseIncomplete?: boolean;
}

/** Feeding_Logs/{aquariumId}/{logId} */
export interface FeedingLog {
  ts: number;
  source: 'schedule' | 'manual';
  /** For scheduled feeds: the time it was due (ms), for timing-deviation tests */
  scheduledFor?: number;
  scheduleId?: string;
  targetG: number;
  verifiedG: number;
  hopperLevel: HopperLevel;
  faults?: FeedingFaults;
  /** True if written while offline and uploaded later */
  queued?: boolean;
}

/** Water_Quality_Readings/{aquariumId}/{readingId} */
export interface WaterReading {
  ts: number;
  ph: number;
  tempC: number;
  /** % change from the calibrated clean-water baseline */
  turbidityPct: number;
  turbidityRaw?: number;
}

export interface RangeThreshold {
  /** Acceptable band */
  okMin: number;
  okMax: number;
  /** Outside [warnMin, warnMax] is critical; between the two bands is warning */
  warnMin: number;
  warnMax: number;
}

/** Alert_Thresholds/{aquariumId} */
export interface AlertThresholds {
  temperature: RangeThreshold;
  ph: RangeThreshold;
  turbidity: { warnPct: number; criticalPct: number };
  /** Ultrasonic distance from the sensor down to the feed surface */
  hopper: { lowCm: number; criticalCm: number };
  /** Minutes before the same alert can repeat */
  cooldownMin: number;
  updatedAt?: number;
  updatedBy?: string;
}

export type Severity = 'warning' | 'critical' | 'info';
export type AlertType =
  | 'temperature'
  | 'ph'
  | 'turbidity'
  | 'hopper'
  | 'empty_or_jammed'
  | 'dispense_incomplete'
  | 'device_offline';

/** System_Alerts/{aquariumId}/{alertId} */
export interface SystemAlert {
  ts: number;
  type: AlertType;
  severity: Severity;
  message: string;
  value?: number;
  acknowledged: boolean;
  ackBy?: string;
  ackAt?: number;
  /** Phone clock when the app first received it — used for the responsiveness test */
  appReceivedAt?: number;
}

export type WithId<T> = T & { id: string };
