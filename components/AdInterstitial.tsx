import { AdMob, AdOptions, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { ADMOB_IDS } from '../constants';

interface AdInterstitialOptions {
  onDismissed?: () => void;
  onFailed?: (error: any) => void;
}

class AdInterstitial {
  private static lastShownDate: string | null = null;
  private static readonly MAX_SHOWS_PER_DAY = 1;
  private static isInitialized = false;

  static async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await AdMob.initialize({
        initializeForTesting: false,
      });
      this.isInitialized = true;
      console.log('AdMob: Interstitial SDK başlatıldı');
    } catch (e) {
      console.warn('AdMob: Interstitial SDK başlatma hatası:', e);
    }
  }

    static async showInterstitial(options?: AdInterstitialOptions, forceShow: boolean = false): Promise<boolean> {
      try {
        // Premium kontrolü
        const savedSettings = localStorage.getItem('ezan_app_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.isPremium) {
            console.log('AdMob: Premium kullanıcı, interstitial gösterilmiyor');
            return false;
          }
        }
  
        // Günlük limit kontrolü (forceShow true değilse)
        const today = new Date().toDateString();
        if (!forceShow && this.lastShownDate === today) {
          console.log('AdMob: Günlük interstitial limiti aşıldı');
          return false;
        }
  
        console.log('AdInterstitial: Başlatılıyor...');

      // SDK başlat
      await this.ensureInitialized();

      // ✅ FIX: AdOptions doğru kullanılıyor (interstitial için bu doğru tip)
      const adOptions: AdOptions = {
        adId: ADMOB_IDS.INTERSTITIAL,
        isTesting: false,
        npa: false, // Kişiselleştirilmiş reklamlar
      };

      // Reklamı hazırla
      console.log('AdMob: Interstitial hazırlanıyor - adId:', ADMOB_IDS.INTERSTITIAL);
      await AdMob.prepareInterstitial(adOptions);
      console.log('AdMob: Interstitial hazırlandı, gösteriliyor...');

      // Reklamı göster
      await AdMob.showInterstitial();

      // Başarılı gösterimi kaydet
      this.lastShownDate = new Date().toDateString();
      console.log('AdMob: Interstitial reklam başarıyla gösterildi');

      // Dismissed olayını dinle
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log('AdMob: Interstitial kapatıldı');
        options?.onDismissed?.();
        // Listener'i temizleme işlemi Capacitor AdMob'da genellikle plugin genelidir, 
        // şimdilik basit bir onDismissed callback'i ile idare ediyoruz.
      });

      return true;

    } catch (error: any) {
      console.error('AdMob: Interstitial gösterim hatası:', error);
      console.error('AdMob: Interstitial hata detayı:', JSON.stringify(error));
      options?.onFailed?.(error);
      return false;
    }
  }

  // ✅ YENİ: Alarm kapatıldığında reklam göstermek için ve promise dönmesi için yardımcı
  static async showForAlarmClosure(): Promise<boolean> {
      return new Promise((resolve) => {
          this.showInterstitial({
              onDismissed: () => resolve(true),
              onFailed: () => resolve(false)
          }, true).then(started => {
              if (!started) resolve(false);
          });
      });
  }

  // Vakit geçişinde çağrılacak fonksiyon
  static async showOnPrayerTransition(prayerName: string): Promise<void> {
    console.log(`AdInterstitial: ${prayerName} vakti için interstitial başlatılıyor...`);

    const success = await this.showInterstitial({
      onDismissed: () => {
        console.log(`AdMob: ${prayerName} vakti reklamı kapatıldı`);
      },
      onFailed: (error) => {
        console.log(`AdMob: ${prayerName} vakti reklamı gösterilemedi:`, error);
      }
    });

    if (success) {
      console.log(`AdMob: ${prayerName} vakti için interstitial başarıyla gösterildi`);
    }
  }

  // Günlük limiti sıfırla (test için)
  static resetDailyLimit(): void {
    this.lastShownDate = null;
  }
}

export default AdInterstitial;
