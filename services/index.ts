// ✅ Re-export from directAlarm.ts — tek kayıt noktası
// Eski dosya DirectAlarm'ı ikinci kez registerPlugin ile kaydediyordu (HATA)
export { default } from './directAlarm';
export type { DirectAlarmPlugin } from './directAlarm';
