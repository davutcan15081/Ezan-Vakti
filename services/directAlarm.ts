import { registerPlugin, WebPlugin, Capacitor } from '@capacitor/core';

export interface DirectAlarmPlugin {
  /**
   * Schedule a direct alarm that will launch the app
   */
  scheduleAlarm(options: {
    prayer: string;
    timestamp: number;
    autoTrigger?: boolean;
    directLaunch?: boolean;
    testMode?: boolean;
    soundType?: string;
    customSoundSource?: string;
    volume?: number;
    vibrationEnabled?: boolean;
    notificationsEnabled?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Cancel a specific alarm
   */
  cancelAlarm(options: {
    prayer: string;
  }): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Cancel all alarms
   */
  cancelAllAlarms(): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Open app permissions settings for different manufacturers
   */
  openAppPermissions(): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Test alarm functionality
   */
  triggerTestAlarm(options: {
    prayer: string;
    soundType?: string;
    volume?: number;
    vibrationEnabled?: string;
    testMode?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Uygulamayı tamamen öldür (arka plana almaz)
   */
  killApp(): Promise<{ success: boolean }>;

  /**
   * Uygulama açıldığında gösterilecek alarm kaydını oku (SharedPreferences)
   * Alarm çaldıktan sonra uygulama tamamen kapatılsa bile bu kayıt kalır
   */
  getAlarmShowOnOpen(): Promise<{
    prayer?: string;
    testMode?: string;
    ageMs?: number;
  }>;

  /**
   * Alarm gösterildikten sonra "show on open" kaydını temizle
   */
  clearAlarmShowOnOpen(): Promise<{ success: boolean }>;

  /**
   * Uygulamayı arka plana at (kapatmaz, minimize eder)
   * MIUI cihazlarda startActivity() engelleniyor, bu yüzden uygulamayı kapatmak yerine
   * arka plana atıyoruz. Alarm tetiklendiğinde moveTaskToFront() ile öne getiriyoruz.
   */
  moveTaskToBack(): Promise<{ success: boolean }>;

  /**
   * Native alarm servisini durdur (ses + titreşim)
   * WebView AlarmOverlay'den "Durdur" butonuna basıldığında çağrılır
   */
  stopAlarmService(): Promise<{ success: boolean }>;

  /**
   * İlk kurulum kontrolü - SharedPreferences üzerinden kontrol yapar
   * Uygulama verileri temizlendiğinde bu kayıt silinir
   */
  isFirstInstall(): Promise<{ isFirst: boolean }>;

  /**
   * İlk kurulum işaretini ayarla
   */
  setFirstInstallComplete(): Promise<{ success: boolean }>;
}

class DirectAlarmWeb extends WebPlugin implements DirectAlarmPlugin {
  private testTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  async scheduleAlarm(options: {
    prayer: string;
    timestamp: number;
    autoTrigger?: boolean;
    directLaunch?: boolean;
    testMode?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const delayMs = options.timestamp - Date.now();

    console.log(
      `[DirectAlarm] Web: "${options.prayer}" için alarm kuruldu. ${Math.round(delayMs / 1000)}sn sonra tetiklenecek.`,
    );


    if (delayMs <= 0) {
      // Zaten geçmiş — hemen tetikle
      this._triggerAlarmScreen(options.prayer);
    } else {
      const timer = setTimeout(() => {
        this._triggerAlarmScreen(options.prayer);
        this.testTimers.delete(options.prayer);
      }, delayMs);

      this.testTimers.set(options.prayer, timer);
    }

    return {
      success: true,
      message: `Web: "${options.prayer}" alarmı ${Math.round(delayMs / 1000)}sn içinde otomatik açılacak.`,
    };
  }

  /** Alarm ekranını otomatik açar — bildirime tıklama gerekmez */
  private _triggerAlarmScreen(prayer: string) {
    console.log(`[DirectAlarm] ⏰ Alarm tetikleniyor: "${prayer}"`);
    const event = new CustomEvent('showAlarm', { detail: { prayer } });
    window.dispatchEvent(event);
  }

  async triggerTestAlarm(options: {
    prayer: string;
    soundType?: string;
    volume?: number;
    vibrationEnabled?: string;
    testMode?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log(`[DirectAlarm] Web: Test alarm tetikleniyor - "${options.prayer}"`);
    
    // Test alarmi hemen tetikle
    this._triggerAlarmScreen(options.prayer);
    
    return {
      success: true,
      message: `Web: "${options.prayer}" test alarmı tetiklendi.`,
    };
  }

  async cancelAlarm(options: { prayer: string }): Promise<{ success: boolean; message: string }> {
    if (this.testTimers.has(options.prayer)) {
      clearTimeout(this.testTimers.get(options.prayer));
      this.testTimers.delete(options.prayer);
    }
    console.log(`[DirectAlarm] Web: "${options.prayer}" alarmı iptal edildi.`);
    return { success: true, message: `Web: "${options.prayer}" alarmı iptal edildi.` };
  }

  async cancelAllAlarms(): Promise<{ success: boolean; message: string }> {
    this.testTimers.forEach((timer) => clearTimeout(timer));
    this.testTimers.clear();
    console.log('[DirectAlarm] Web: Tüm alarmlar iptal edildi.');
    return { success: true, message: 'Web: Tüm alarmlar iptal edildi.' };
  }

  async openAppPermissions(): Promise<{ success: boolean; message: string }> {
    // Web platformunda ayarlar aç
    window.open('app-settings:', '_blank');
    return { success: true, message: 'Ayarlar açıldı' };
  }

  // Web ortamında sadece konsola yaz
  async killApp(): Promise<{ success: boolean }> {
    console.log('[DirectAlarm] Web: killApp() çağrıldı (web ortamında etkisiz)');
    return { success: true };
  }

  async getAlarmShowOnOpen(): Promise<{ prayer?: string; testMode?: string; ageMs?: number }> {
    console.log('[DirectAlarm] Web: getAlarmShowOnOpen() — web ortamında boş döner');
    return {};
  }

  async clearAlarmShowOnOpen(): Promise<{ success: boolean }> {
    console.log('[DirectAlarm] Web: clearAlarmShowOnOpen()');
    return { success: true };
  }

  async moveTaskToBack(): Promise<{ success: boolean }> {
    console.log('[DirectAlarm] Web: moveTaskToBack() — web ortamında etkisiz');
    return { success: true };
  }

  async stopAlarmService(): Promise<{ success: boolean }> {
    console.log('[DirectAlarm] Web: stopAlarmService() — web ortamında etkisiz');
    return { success: true };
  }

  async isFirstInstall(): Promise<{ isFirst: boolean }> {
    console.log('[DirectAlarm] Web: isFirstInstall() — web ortamında false döner');
    return { isFirst: false };
  }

  async setFirstInstallComplete(): Promise<{ success: boolean }> {
    console.log('[DirectAlarm] Web: setFirstInstallComplete() — web ortamında etkisiz');
    return { success: true };
  }
}

// Plugin'i platforma göre kaydet
// Android'de Capacitor otomatik olarak DirectAlarmPlugin.java'yı çağırır
const DirectAlarm = registerPlugin<DirectAlarmPlugin>('DirectAlarm', {
  web: () => Promise.resolve(new DirectAlarmWeb()),
});

export { DirectAlarmWeb };
export default DirectAlarm;
