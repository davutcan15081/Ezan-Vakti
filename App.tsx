import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import DirectAlarm from './services/directAlarm';
import AdBanner from './components/AdBanner';
import AdInterstitial from './components/AdInterstitial';
import { DEFAULT_SETTINGS, DEFAULT_COORDS, ADMOB_IDS, PRAYER_METHOD_BY_COUNTRY, COUNTRY_NAME_EN_TO_CODE } from './constants';
import { AppSettings, PrayerData, PrayerName, NextPrayerInfo, PrayerKeys, ManualLocation } from './types';
import { fetchPrayerTimes, calculateNextPrayer, getTimeDifferenceMinutes } from './services/prayerService.ts';
import AlarmScreen from './components/AlarmScreen';
import SettingsModal from './components/SettingsModal';
import LocationModal from './components/LocationModal';
import WelcomeWarning from './components/WelcomeWarning';
import QiblaCompass from './components/QiblaCompass';
import PurchaseService from './services/purchaseService';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import appLogo from './assets/icon.png';
import { translations } from './translations';

// ✅ AdMob SDK + UMP Consent akışı
// Google 2024'ten beri consent olmadan gerçek reklam göstermiyor
const initializeAdMobWithConsent = async () => {
  try {
    // 1. AdMob SDK'yı başlat
    await AdMob.initialize({
      initializeForTesting: false,
    });
    console.log('[AdMob] ✅ SDK başlatıldı');

    // 2. Consent bilgisi iste (UMP)
    try {
      const consentInfo = await AdMob.requestConsentInfo();
      console.log('[AdMob] Consent durumu:', JSON.stringify(consentInfo));

      // 3. Consent formu gerekiyorsa ve müsaitse göster
      if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
        console.log('[AdMob] Consent formu gösteriliyor...');
        const result = await AdMob.showConsentForm();
        console.log('[AdMob] Consent formu sonucu:', JSON.stringify(result));
      } else {
        console.log('[AdMob] Consent formu gerekmiyor veya zaten verilmiş. Status:', consentInfo.status);
      }
    } catch (consentError) {
      // Consent hatası olsa bile reklamları göstermeye çalış
      console.warn('[AdMob] ⚠️ Consent akışı hatası (reklamlar yine de denenecek):', consentError);
    }

    console.log('[AdMob] ✅ Başlatma tamamlandı, reklamlar yüklenebilir');
  } catch (error) {
    console.error('[AdMob] ❌ SDK başlatma hatası:', error);
  }
};

// ✅ Uygulamayı tamamen öldür (arka plana almaz)
// DirectAlarm.killApp() → Java: finishAffinity + killProcess(myPid)
const forceKillApp = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await DirectAlarm.killApp();
    } else {
      CapacitorApp.exitApp();
    }
  } catch (e) {
    CapacitorApp.exitApp();
  }
};

const FALLBACK_PRAYER_NAME_MAP: Record<string, string> = {
  imsak: 'İmsak', gunes: 'Güneş', ogle: 'Öğle', ikindi: 'İkindi', aksam: 'Akşam', yatsi: 'Yatsı',
  // Normalized names (from Java normalizePrayerName) — pass through as-is
  'İmsak': 'İmsak', 'Güneş': 'Güneş', 'Öğle': 'Öğle', 'İkindi': 'İkindi', 'Akşam': 'Akşam', 'Yatsı': 'Yatsı'
};

const checkForPendingAlarm = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const prayer = urlParams.get('prayer');
    if (prayer) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const prayerName = FALLBACK_PRAYER_NAME_MAP[prayer] || prayer;
      window.dispatchEvent(new CustomEvent('showAlarm', { detail: { prayer: prayerName } }));
      return;
    }

    // Native SharedPreferences'tan "show on open" kaydını kontrol et
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await DirectAlarm.getAlarmShowOnOpen();
        if (result.prayer) {
          console.log('[App] ✅ Native ShowOnOpen alarm bulundu:', result.prayer, '(yaş:', result.ageMs, 'ms)');
          await DirectAlarm.clearAlarmShowOnOpen();
          const prayerName = FALLBACK_PRAYER_NAME_MAP[result.prayer] || result.prayer;
          window.dispatchEvent(new CustomEvent('showAlarm', {
            detail: { prayer: prayerName }
          }));
          return;
        }
      } catch (e) {
        console.warn('[App] Native ShowOnOpen kontrolü başarısız:', e);
      }
    }
  } catch (e) {
    console.warn("[App] Başlangıç alarm kontrolü başarısız:", e);
  }
};

const getPrayerKey = (value: string): string => {
  const map: Record<string, string> = {
    'İmsak': 'imsak', 'Güneş': 'gunes', 'Öğle': 'ogle', 'İkindi': 'ikindi', 'Akşam': 'aksam', 'Yatsı': 'yatsi',
    'Fajr': 'imsak', 'Sunrise': 'gunes', 'Dhuhr': 'ogle', 'Asr': 'ikindi', 'Maghrib': 'aksam', 'Isha': 'yatsi',
    'imsak': 'imsak', 'gunes': 'gunes', 'ogle': 'ogle', 'ikindi': 'ikindi', 'aksam': 'aksam', 'yatsi': 'yatsi'
  };
  return map[value] || value.toLowerCase();
};

// Vakitleri "işlendi" olarak işaretle (re-trigger önlemek için)
const markPrayerAsHandled = (prayer: string) => {
  const key = getPrayerKey(prayer);
  const handledKey = `${new Date().toDateString()}-${key}-handled`;
  localStorage.setItem('ezan_last_alarm_key', handledKey);
  return handledKey;
};

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [activeAlarmPrayer, setActiveAlarmPrayer] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isQiblaCompassOpen, setIsQiblaCompassOpen] = useState<boolean>(false);
  const [showWelcomeWarning, setShowWelcomeWarning] = useState<boolean>(() => {
    // Çok daha agresif kontrol - her türlü ilk kurulumu yakala
    const hasSeenWarning = localStorage.getItem('ezan_welcome_warning_seen');
    const hasSettings = localStorage.getItem('ezan_app_settings');
    const isFirstInstall = !hasSettings && !hasSeenWarning;

    // Eğer hiçbir veri yoksa kesinlikle göster
    if (isFirstInstall) {
      console.log('[App] İlk kurulum tespit edildi - Welcome gösterilecek');
      localStorage.removeItem('ezan_welcome_warning_seen');
      return true;
    }

    // Eğer ayarlar varsa ama warning kaydı yoksa göster
    if (hasSettings && !hasSeenWarning) {
      console.log('[App] Ayarlar var ama warning kaydı yok - Welcome gösterilecek');
      return true;
    }

    console.log('[App] Welcome gösterilmeyecek - hasSeenWarning:', hasSeenWarning);
    return false;
  });
  const [lastAlarmTime, setLastAlarmTime] = useState<string | null>(() => {
    return localStorage.getItem('ezan_last_alarm_key');
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ezan_app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.useEzanSound !== undefined) {
          parsed.soundType = parsed.useEzanSound ? 'ezan' : 'beep';
          delete parsed.useEzanSound;
        }
        const base = { ...DEFAULT_SETTINGS, ...parsed };
        base.prayerReminders = {
          ...DEFAULT_SETTINGS.prayerReminders,
          ...(parsed.prayerReminders || {}),
        };
        if (!parsed._version) {
          base.prayerReminders.gunes = 0;
          base._version = 2;
        }
        if (!base.locationMode) base.locationMode = 'auto';
        if (!base.soundType) base.soundType = 'ezan';
        return base;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Background optimization check
  useEffect(() => {
    if (Capacitor.isNativePlatform() && settings.preventBackgroundOptimization) {
      console.log('[App] Arka plan optimizasyonu engelleniyor - bildirimler ve alarmlar aktif tutuluyor');
      // Android'in battery optimization'ını engellemek için ek ayarlar burada yapılabilir
      // Şimdilik sadece log tutuyoruz, ileride native plugin eklenebilir
    }
  }, [settings.preventBackgroundOptimization]);

  const t = useCallback((key: string) => {
    const lang = settings.language || 'tr';
    return translations[lang]?.[key] || translations['tr']?.[key] || key;
  }, [settings.language]);

  const PRAYER_NAME_MAP = useMemo(() => ({
    imsak: t('imsak'),
    gunes: t('gunes'),
    ogle: t('ogle'),
    ikindi: t('ikindi'),
    aksam: t('aksam'),
    yatsi: t('yatsi'),
  }), [t]);

  // ============================================================
  // ALARM EKRANINI AÇ
  // ============================================================
  const showAlarmScreen = useCallback((prayerKeyOrName: string, noOverlay?: boolean) => {
    console.log('[App] showAlarmScreen:', prayerKeyOrName);

    // Anında işaretle ki timer döngüsüne girmesin
    const handledKey = markPrayerAsHandled(prayerKeyOrName);
    setLastAlarmTime(handledKey);

    setActiveAlarmPrayer(prayerKeyOrName);
    setIsAlarmActive(true);
  }, []);

  // ============================================================
  // UYGULAMA BAŞLANGIÇ
  // ============================================================
  useEffect(() => {
    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      checkForPendingAlarm();
    });

    // Native SharedPreferences ile ilk kurulum kontrolü
    const checkFirstInstall = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await DirectAlarm.isFirstInstall();
          console.log('[App] Native ilk kurulum kontrolü:', result.isFirst);

          if (result.isFirst) {
            console.log('[App] Native - İlk kurulum tespit edildi, Welcome gösterilecek');
            setShowWelcomeWarning(true);
            // İlk kurulum tamamlandı olarak işaretle
            await DirectAlarm.setFirstInstallComplete();
          }
        } catch (error) {
          console.warn('[App] Native ilk kurulum kontrolü başarısız:', error);
          // Fallback: localStorage kontrolü
          const hasSettings = localStorage.getItem('ezan_app_settings');
          const hasSeenWarning = localStorage.getItem('ezan_welcome_warning_seen');

          console.log('[App] Başlangıç kontrolü - hasSettings:', !!hasSettings, 'hasSeenWarning:', !!hasSeenWarning);

          if (hasSettings && !hasSeenWarning) {
            console.log('[App] useEffect içinde - Welcome gösterilecek');
            setShowWelcomeWarning(true);
          }
        }
      } else {
        // Web platformu - localStorage kontrolü
        const hasSettings = localStorage.getItem('ezan_app_settings');
        const hasSeenWarning = localStorage.getItem('ezan_welcome_warning_seen');

        if (hasSettings && !hasSeenWarning) {
          setShowWelcomeWarning(true);
        }
      }
    };

    checkFirstInstall();

    // Gecikmeli kontrol - Android'de localStorage gecikebilir
    setTimeout(() => {
      const delayedHasSettings = localStorage.getItem('ezan_app_settings');
      const delayedHasSeenWarning = localStorage.getItem('ezan_welcome_warning_seen');
      console.log('[App] Gecikmeli kontrol - delayedHasSettings:', !!delayedHasSettings, 'delayedHasSeenWarning:', !!delayedHasSeenWarning);

      if (!delayedHasSettings && !delayedHasSeenWarning) {
        console.log('[App] Gecikmeli - İlk kurulum tespit edildi');
        setShowWelcomeWarning(true);
      }
    }, 1000);

    PurchaseService.initialize().then(() => {
      PurchaseService.checkPremiumStatus().then(isPremium => {
        if (isPremium) {
          setSettings(prev => ({ ...prev, isPremium: true }));
        }
      });
    });

    if (Capacitor.isNativePlatform()) {
      initializeAdMobWithConsent();
    }

    checkForPendingAlarm();

    return () => {
      stateListener.then(h => h.remove());
    };
  }, []);

  // ============================================================
  // showAlarm GLOBAL EVENT LİSTENER
  // ============================================================
  useEffect(() => {
    const handleShowAlarm = (event: Event) => {
      const detail = (event as CustomEvent<{ prayer: string; noOverlay?: boolean }>).detail;
      console.log('[App] showAlarm eventi:', detail.prayer);
      showAlarmScreen(detail.prayer, detail.noOverlay);
    };

    window.addEventListener('showAlarm', handleShowAlarm);
    
    return () => {
      window.removeEventListener('showAlarm', handleShowAlarm);
    };
  }, [showAlarmScreen]);

  // ============================================================
  // VERİ YÜKLEME
  // ============================================================
  useEffect(() => {
    initData();
  }, []);

  const initData = async (overrideSettings?: AppSettings) => {
    try {
      setLoading(true);
      setError(null);
      // ✅ Yapay 1.5s gecikme kaldırıldı — loading ekranı veri gelene kadar gösterilir

      const currentSettings = overrideSettings || settings;
      let lat = DEFAULT_COORDS.latitude;
      let lng = DEFAULT_COORDS.longitude;
      let cityOverride: string | undefined;
      let countryOverride: string | undefined;
      let ulkeId: string | undefined;
      let sehirId: string | undefined;
      let ilceId: string | undefined;

      if (currentSettings.locationMode === 'auto') {
        try {
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true, timeout: 10000, maximumAge: 300000
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (e) {
          console.warn("Konum alinamadi, Istanbul kullaniliyor.", e);
        }
      } else if (currentSettings.locationMode === 'manual' && currentSettings.manualLocation) {
        lat = currentSettings.manualLocation.coords.latitude;
        lng = currentSettings.manualLocation.coords.longitude;
        cityOverride = currentSettings.manualLocation.city;
        countryOverride = currentSettings.manualLocation.country;
        ulkeId = currentSettings.manualLocation.ulkeId;
        sehirId = currentSettings.manualLocation.sehirId;
        ilceId = currentSettings.manualLocation.ilceId;
      }

      const data = await fetchPrayerTimes(
        lat, lng, cityOverride, countryOverride,
        ulkeId, sehirId, ilceId,
        currentSettings.calculationMethod,
        currentSettings.asrMethod,
        currentSettings.manualLocation?.countryEn,
        currentSettings.manualCalculationMethod
      );
      setPrayerData(data);
      updateNextPrayer(data.times, currentSettings);
      scheduleAllFutureAlarms(data.times, currentSettings);

      if (data.methodUsed !== undefined && data.methodUsed !== currentSettings.calculationMethod && !currentSettings.manualCalculationMethod) {
        if (!localStorage.getItem('ezan_manual_method_selected')) {
          setSettings(prev => {
            const updated = { ...prev, calculationMethod: data.methodUsed };
            localStorage.setItem('ezan_app_settings', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Data fetch error:", err);
      if (err instanceof Error && err.message.includes("internet bağlantınızı kontrol edin")) {
        setError(null);
        try {
          const cached = localStorage.getItem('ezan_diyanet_v60');
          if (cached) {
            const fullData = JSON.parse(cached);
            const now = new Date();
            const todayKey = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
            if (fullData.days && fullData.days[todayKey]) {
              setPrayerData({
                date: todayKey, times: fullData.days[todayKey],
                city: fullData.city || 'Bilinmeyen Konum', country: 'Türkiye',
                isOffline: true,
                source: `${fullData.source || "Önbellek"} (Offline Mod)`,
                methodUsed: 13
              });
              updateNextPrayer(fullData.days[todayKey], settings);
              scheduleAllFutureAlarms(fullData.days[todayKey], settings);
              return;
            }
          }
        } catch (cacheErr) {
          console.warn("Cache fallback failed:", cacheErr);
        }
      } else {
        setError(t('error_data'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    const methodChanged = newSettings.calculationMethod !== settings.calculationMethod;
    const schoolChanged = newSettings.asrMethod !== settings.asrMethod;
    const manualMethodChanged = newSettings.manualCalculationMethod !== settings.manualCalculationMethod;
    setSettings(newSettings);
    if (methodChanged || schoolChanged || manualMethodChanged) {
      initData(newSettings);
    } else if (prayerData) {
      scheduleAllFutureAlarms(prayerData.times, newSettings);
    }
    try {
      localStorage.setItem('ezan_app_settings', JSON.stringify({ ...newSettings, _version: 2 }));
    } catch (e) {
      console.error("Ayarlar kaydedilemedi:", e);
      if (newSettings.soundType === 'custom') alert("Uyarı: Ses dosyası hafızaya kaydedilemedi (çok büyük).");
    }
  };

  const handleLocationSelect = (mode: 'auto' | 'manual', manualData?: ManualLocation) => {
    localStorage.removeItem('ezan_diyanet_v60');
    localStorage.removeItem('ezan_manual_method_selected');
    let initialMethod = settings.calculationMethod;
    if (mode === 'manual' && manualData?.countryEn) {
      const enName = manualData.countryEn.toUpperCase();
      const code = COUNTRY_NAME_EN_TO_CODE[enName];
      if (code && PRAYER_METHOD_BY_COUNTRY[code]) {
        initialMethod = PRAYER_METHOD_BY_COUNTRY[code];
      } else if (!enName.includes('TURKEY') && !enName.includes('TÜRKİYE')) {
        initialMethod = 3;
      }
    } else if (mode === 'manual' && !manualData?.ulkeId) {
      initialMethod = 3;
    }
    const newSettings = { ...settings, locationMode: mode, manualLocation: manualData, calculationMethod: initialMethod, manualCalculationMethod: false };
    handleUpdateSettings(newSettings);
    setTimeout(() => initData(newSettings), 100);
  };

  const handleLanguageSelect = useCallback((language: string) => {
    setSettings(prev => {
      const updated = { ...prev, language };
      localStorage.setItem('ezan_app_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // WelcomeWarning için geçici dil değişikliği - ana uygulamayı etkilemez
  const handleTemporaryLanguageSelect = useCallback((language: string) => {
    // Bu fonksiyon sadece WelcomeWarning kartı içindir, ana uygulamayı etkilemez
    console.log('[App] Geçici dil seçimi:', language);
  }, []);

  const handleDismissWelcomeWarning = useCallback(async () => {
    setShowWelcomeWarning(false);
    localStorage.setItem('ezan_welcome_warning_seen', 'true');

    // Native tarafında da işaretle
    if (Capacitor.isNativePlatform()) {
      try {
        await DirectAlarm.setFirstInstallComplete();
        console.log('[App] Native firstInstallComplete işaretlendi');
      } catch (error) {
        console.warn('[App] Native firstInstallComplete hatası:', error);
      }
    }
  }, []);

  const handleShowWelcomeWarning = useCallback(() => {
    localStorage.removeItem('ezan_welcome_warning_seen');
    setShowWelcomeWarning(true);
  }, []);

  const handleOpenQiblaFinder = useCallback(() => {
    console.log('[App] Opening Qibla finder');
    setIsQiblaCompassOpen(true);
  }, []);

  const scheduleAllFutureAlarms = useCallback(async (times: any, currentSettings: AppSettings) => {
    if (!Capacitor.isNativePlatform()) return;
    try { await DirectAlarm.cancelAllAlarms(); } catch (e) { }
    if (!currentSettings.notificationsEnabled) return;

    const prayerKeys = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const key of prayerKeys) {
      const timeStr = times[key];
      if (!timeStr) continue;
      const [h, m] = timeStr.split(':').map(Number);
      const isTomorrow = (h * 60 + m) <= currentMinutes;
      const alarmDate = new Date();
      if (isTomorrow) alarmDate.setDate(alarmDate.getDate() + 1);
      alarmDate.setHours(h, m, 1, 0);
      const reminderOffset = currentSettings.prayerReminders[key] || 0;
      const finalAlarmTime = alarmDate.getTime() - (reminderOffset * 60 * 1000);
      if (finalAlarmTime > Date.now()) {
        try {
          await DirectAlarm.scheduleAlarm({
            prayer: key, timestamp: finalAlarmTime, autoTrigger: true,
            directLaunch: true, testMode: false,
            soundType: currentSettings.soundType || 'ezan',
            customSoundSource: currentSettings.customSoundSource,
            volume: currentSettings.volume || 0.8,
            vibrationEnabled: currentSettings.vibrationEnabled ?? true,
            notificationsEnabled: currentSettings.notificationsEnabled,
            language: currentSettings.language || 'tr',
          } as any);
        } catch (err) {
          console.error(`[App] ${key} alarmı kurulamadı:`, err);
        }
      }
    }
  }, []);

  const updateNextPrayer = useCallback((times: any, currentSettings?: AppSettings) => {
    if (!times) return;
    const { nextKey, isTomorrow } = calculateNextPrayer(times, lastAlarmTime);
    const timeStr = times[nextKey];
    const keyToName: Record<string, PrayerName> = {
      imsak: PrayerName.Imsak, gunes: PrayerName.Gunes, ogle: PrayerName.Ogle,
      ikindi: PrayerName.Ikindi, aksam: PrayerName.Aksam, yatsi: PrayerName.Yatsi
    };
    setNextPrayer({
      name: keyToName[nextKey], key: nextKey, time: timeStr,
      minutesRemaining: getTimeDifferenceMinutes(timeStr, isTomorrow), isTomorrow
    });
  }, []);

  useEffect(() => {
    if (!prayerData) return;
    const timer = setInterval(() => {
      if (!prayerData || !settings.notificationsEnabled) return;
      updateNextPrayer(prayerData.times, settings);
      const { nextKey, isTomorrow } = calculateNextPrayer(prayerData.times, lastAlarmTime);
      const timeStr = prayerData.times[nextKey];
      const freshRemaining = getTimeDifferenceMinutes(timeStr, isTomorrow);
      const reminderOffset = settings.prayerReminders[nextKey] ?? 0;
      if (freshRemaining <= reminderOffset && freshRemaining >= 0) {
        const currentAlarmKey = `${new Date().toDateString()}-${nextKey}-${reminderOffset}`;
        if (lastAlarmTime !== currentAlarmKey) {
          const [targetH, targetM] = timeStr.split(':').map(Number);
          const targetDate = new Date();
          if (isTomorrow) targetDate.setDate(targetDate.getDate() + 1);
          targetDate.setHours(targetH, targetM, 1, 0);
          const alarmTime = targetDate.getTime() - (reminderOffset * 60 * 1000);
          if (Date.now() >= alarmTime) {
            if (Capacitor.isNativePlatform()) {
              DirectAlarm.scheduleAlarm({
                prayer: nextKey, timestamp: alarmTime, autoTrigger: true,
                directLaunch: true, testMode: false,
                soundType: settings.soundType || 'ezan',
                customSoundSource: settings.customSoundSource,
                volume: settings.volume || 0.8,
                vibrationEnabled: settings.vibrationEnabled ?? true,
                notificationsEnabled: settings.notificationsEnabled,
                language: settings.language || 'tr',
              } as any).then(() => {
                localStorage.setItem('ezan_last_alarm_key', currentAlarmKey);
                setLastAlarmTime(currentAlarmKey);
                AdInterstitial.showOnPrayerTransition(nextKey);
                forceKillApp();
              });
            } else {
              setLastAlarmTime(currentAlarmKey);
            }
          }
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [prayerData, settings, updateNextPrayer, lastAlarmTime]);

  const handleStopAlarm = async () => {
    // Native tarafı temizle ve sesi/titreşimi durdur
    if (Capacitor.isNativePlatform()) {
      try {
        await DirectAlarm.stopAlarmService();
        console.log('[App] Native alarm servisi durduruldu');
      } catch (e) {
        console.warn('[App] Native alarm servisi durdurma hatası:', e);
      }
      try {
        await DirectAlarm.clearAlarmShowOnOpen();
        console.log('[App] Native ShowOnOpen kaydı alarm durdurulurken temizlendi');
      } catch (e) {
        console.warn('[App] Native ShowOnOpen temizleme hatası:', e);
      }
    }

    // UI'dan alarmı kaldır
    setIsAlarmActive(false);

    // ✅ Durdurulduğunda da işaretle (zaten show'da işaretliyoruz ama garanti olsun)
    const handledKey = markPrayerAsHandled(activeAlarmPrayer);
    setLastAlarmTime(handledKey);

    // ✅ Reklamı göster ve bitmesini bekle, sonra uygulamayı öldür
    if (Capacitor.isNativePlatform()) {
      console.log('[App] Alarm durduruldu, interstitial reklam gösterilecek');
      await AdInterstitial.showForAlarmClosure();
      console.log('[App] Reklam bitti veya hata verdi, uygulama kapatılıyor');

      // Reklam bittikten sonra kapat
      forceKillApp();
    }
  };



  const formatTime = useCallback((timeStr?: string) => {
    if (!timeStr) return '';
    if (settings.timeFormat !== '12h') return timeStr;
    const [hStr, mStr] = timeStr.split(':');
    if (!hStr || !mStr) return timeStr;
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${ampm}`;
  }, [settings.timeFormat]);

  const alarmTimeDisplay = useMemo(() => {
    if (!nextPrayer) return null;
    const reminderMinutes = settings.prayerReminders[nextPrayer.key] ?? 0;
    if (reminderMinutes === 0) return t('vakti_gelince');
    const [h, m] = nextPrayer.time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m - reminderMinutes);
    const alarmH = d.getHours().toString().padStart(2, '0');
    const alarmM = d.getMinutes().toString().padStart(2, '0');
    return `${formatTime(`${alarmH}:${alarmM}`)} (${reminderMinutes} ${t('dk_kala')})`;
  }, [nextPrayer, settings.prayerReminders, formatTime, t]);




  // ============================================================
  // 🔄 LOADING EKRANI — önce göster
  // ============================================================
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-particle"></div>
        <div className="loading-particle"></div>
        <div className="loading-particle"></div>
        <div className="loading-particle"></div>
        <div className="loading-particle"></div>
        <div className="loading-particle"></div>
        <div className="loading-logo-wrapper">
          <div className="loading-logo-glow"></div>
          <div className="loading-ring"></div>
          <div className="loading-ring-outer"></div>
          <img src={appLogo} alt="Ezan Vakti Logo" />
        </div>
        <div className="loading-subtitle mt-8">{t('loading').toLocaleUpperCase(settings.language || 'tr')}</div>
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <div className="loading-shimmer-container">
          <div className="loading-shimmer-bar"></div>
        </div>
        <div className="loading-footer">
          {settings.language === 'tr'
            ? " Ezan Vakti • Diyanet Resmi Verileri"
            : `v1.0 • Ezan Vakti • ${t('data_source_official')}`}
        </div>
      </div>
    );
  }

  // ============================================================
  // 🎉 İLK AÇILIŞ KARTI — loading'den sonra göster
  // ============================================================
  if (!loading && showWelcomeWarning) {
    return (
      <WelcomeWarning
        isVisible={showWelcomeWarning}
        currentLanguage={settings.language || 'tr'}
        onLanguageSelect={handleLanguageSelect}
        onTemporaryLanguageSelect={handleTemporaryLanguageSelect}
        onDismiss={handleDismissWelcomeWarning}
        t={t}
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-red-600 text-2xl font-bold mb-4">{error}</p>
        <button onClick={() => window.location.reload()}
          className="bg-primary text-white px-8 py-4 rounded-xl text-xl font-bold">{t('update')}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenLocationSelect={() => setIsLocationModalOpen(true)}
        onShowWelcomeWarning={handleShowWelcomeWarning}
        onOpenQiblaFinder={handleOpenQiblaFinder}
        currentCityName={prayerData?.city}
        prayerData={prayerData}
        t={t}
      />
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleLocationSelect}
        currentMode={settings.locationMode}
        currentCity={prayerData?.city}
        currentCountry={prayerData?.country}
        t={t}
      />
      <QiblaCompass
        isOpen={isQiblaCompassOpen}
        onClose={() => setIsQiblaCompassOpen(false)}
        t={t}
      />
      {/* Duplikat WelcomeWarning kaldirildi - zaten early return ile gosteriliyor */}

      <header className="pt-8 pb-4 px-6 bg-white shadow-sm flex items-center justify-between z-10 sticky top-0">
        <div>
          <div className="flex items-center text-slate-500 mt-1">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span className="text-lg font-medium">
              {prayerData?.city}
              {prayerData?.country && prayerData.country.toLowerCase() !== 'türkiye' && prayerData.country.toLowerCase() !== 'turkey' && prayerData.country.toLowerCase() !== 'tr' ? `, ${prayerData.country}` : ''}
            </span>
          </div>
          {prayerData?.source && (
            <div className="text-xs text-green-600 font-medium mt-0.5 ml-1">
              {prayerData.source.includes('Diyanet') ? t('source_desc') : prayerData.source}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"
          aria-label="Ayarlar"
        >
          <svg className="w-7 h-7 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-6 bg-slate-50">
        <div className="m-2 sm:m-4 mt-4 p-4 sm:p-8 bg-white rounded-3xl shadow-lg border-2 border-primary/20 text-center">
          <h2 className="text-xl font-bold text-slate-500 uppercase tracking-widest mb-2">{t('next_prayer').toLocaleUpperCase(settings.language || 'tr')}</h2>
          <div className="text-4xl sm:text-6xl font-black text-slate-900 mb-2 tracking-tight">
            {nextPrayer ? PRAYER_NAME_MAP[nextPrayer.key as keyof typeof PRAYER_NAME_MAP] : ''}
          </div>
          <div className="text-4xl font-bold text-primary mb-2">{formatTime(nextPrayer?.time)}</div>
          <div className="text-sm sm:text-lg font-bold text-slate-400 mb-6 flex items-center justify-center gap-2 bg-slate-50 py-2 px-4 rounded-xl inline-block mx-auto">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            {t('prayer_alarm')}: {alarmTimeDisplay}
          </div>
          <div className="inline-block bg-primary/10 px-6 py-3 rounded-full w-full">
            <span className="text-2xl font-bold text-primary block">
              {t('remaining_time')}: {Math.floor((nextPrayer?.minutesRemaining || 0) / 60)}{t('unit_h')} {(nextPrayer?.minutesRemaining || 0) % 60}{t('unit_m')}
            </span>
          </div>


        </div>

        <div className="mx-2 sm:mx-4 mt-6 space-y-2 sm:space-y-3">
          {PrayerKeys.map((key) => {
            const name = PRAYER_NAME_MAP[key] || key;
            const time = prayerData?.times[key];
            const isNext = nextPrayer?.key === key;
            return (
              <div key={key}
                className={`flex justify-between items-center p-3 sm:p-5 rounded-2xl transition-all ${isNext ? 'bg-primary text-white shadow-md scale-105 border-2 border-green-500' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                <span className={`text-xl sm:text-2xl font-bold ${isNext ? 'text-white' : 'text-slate-500'}`}>{name}</span>
                <span className={`text-2xl sm:text-3xl font-bold ${isNext ? 'text-white' : 'text-slate-800'}`}>{formatTime(time)}</span>
              </div>
            );
          })}
        </div>
      </main>

      <div className="px-4 pb-4 text-center text-slate-400 text-xs space-y-0.5">
        <p>{t('source_desc')}</p>
        <p>© 2026 VILLAGESTUDIOTR - All Rights Reserved</p>
      </div>

      {!isSettingsOpen && !isLocationModalOpen && (
        <AdBanner
          adUnitId={ADMOB_IDS.BANNER_HOME}
          className="mx-4 mb-4"
          hideAds={settings.isPremium}
        />
      )}

      {isAlarmActive && (
        <AlarmScreen
          prayerName={activeAlarmPrayer}
          onStop={handleStopAlarm}
          settings={settings}
          t={t}
        />
      )}
    </div>
  );
};

export default App;
