import { AppLanguage } from './translations';

export interface PrayerTimes {
  imsak: string;
  gunes: string;
  ogle: string;
  ikindi: string;
  aksam: string;
  yatsi: string;
  [key: string]: string;
}

export interface PrayerData {
  date: string;
  times: PrayerTimes;
  city: string;
  country?: string;
  isOffline?: boolean;
  lastUpdated?: string;
  source?: string;
  methodUsed?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ManualLocation {
  city: string;
  country: string;
  countryEn?: string;
  coords: Coordinates;
  ulkeId?: string;
  sehirId?: string;
  ilceId?: string;
}

export interface AppSettings {
  soundType: 'ezan' | 'beep' | 'custom'; // Changed from boolean useEzanSound
  customSoundSource?: string; // Base64 data URI of custom file
  customSoundName?: string; // Name of file for display
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
  prayerReminders: Record<string, number>; // key: prayerKey, value: minutes (0 or 10)
  volume: number;
  locationMode: 'auto' | 'manual';
  manualLocation?: ManualLocation;
  isPremium?: boolean;
  timeFormat?: '12h' | '24h';
  calculationMethod?: number; // AlAdhan method ID
  asrMethod?: number; // 0 for Standard, 1 for Hanafi
  manualCalculationMethod?: boolean; // When true, use manual calculation method instead of auto-detect
  language?: AppLanguage;
  preventBackgroundOptimization?: boolean; // Prevent Android from killing background processes
}

export enum PrayerName {
  Imsak = 'İmsak',
  Gunes = 'Güneş',
  Ogle = 'Öğle',
  Ikindi = 'İkindi',
  Aksam = 'Akşam',
  Yatsi = 'Yatsı'
}

export const PrayerKeys = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];

export interface NextPrayerInfo {
  name: PrayerName;
  key: string;
  time: string;
  minutesRemaining: number;
  isTomorrow: boolean;
}
