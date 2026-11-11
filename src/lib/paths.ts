/** Root node names in the Realtime Database (must match the firmware). */
export const paths = {
  users: 'Users',
  user: (uid: string) => `Users/${uid}`,
  aquariums: 'Aquariums',
  aquarium: (aid: string) => `Aquariums/${aid}`,
  device: (deviceId: string) => `AquaFeed_Devices/${deviceId}`,
  schedules: (aid: string) => `Feeding_Schedules/${aid}`,
  logs: (aid: string) => `Feeding_Logs/${aid}`,
  readings: (aid: string) => `Water_Quality_Readings/${aid}`,
  thresholds: (aid: string) => `Alert_Thresholds/${aid}`,
  alerts: (aid: string) => `System_Alerts/${aid}`,
} as const;
