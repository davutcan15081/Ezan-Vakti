import React, { useEffect, useRef } from 'react';
import { SOUND_BEEP, SOUND_EZAN } from '../constants';
import { AppSettings } from '../types';
import { Capacitor } from '@capacitor/core';
import AdBanner from './AdBanner';
import { ADMOB_IDS } from '../constants';

interface AlarmScreenProps {
  onStop: () => void;
  prayerName: string;
  settings: AppSettings;
  t: (key: string) => string;
}

const AlarmScreen: React.FC<AlarmScreenProps> = ({ onStop, prayerName, settings, t }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationTimeout = useRef<number | null>(null);

  useEffect(() => {
    // 1. Play Sound
    let soundSrc = SOUND_BEEP;
    if (settings.soundType === 'ezan') {
      soundSrc = SOUND_EZAN;
    } else if (settings.soundType === 'custom' && settings.customSoundSource) {
      soundSrc = settings.customSoundSource;
    }

    // Only play audio on Web; Native plays via Android Service
    if (!Capacitor.isNativePlatform()) {
      audioRef.current = new Audio(soundSrc);
      audioRef.current.loop = settings.soundType === 'beep';
      audioRef.current.volume = settings.volume;
      audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
    }

    // 2. Vibration
    const startVibration = async () => {
      if (settings.vibrationEnabled && !Capacitor.isNativePlatform() && navigator.vibrate) {
        // Only run JS vibration on Web; Native is handled by AlarmLauncherService.java
        navigator.vibrate([500, 300, 500]);
        vibrationTimeout.current = window.setTimeout(() => startVibration(), 2000);
      }
    };

    startVibration();

    return () => {
      // Cleanup
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (vibrationTimeout.current) {
        clearTimeout(vibrationTimeout.current);
        if (!Capacitor.isNativePlatform() && navigator.vibrate) {
          navigator.vibrate(0);
        }
      }
    };
  }, [settings]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex flex-col h-full"
    >
      <div 
        className="flex-1 flex flex-col items-center justify-center p-6 cursor-pointer"
        onClick={onStop}
      >
        <div className="bg-red-600 w-full max-w-md p-10 rounded-[3rem] shadow-2xl border-4 border-white/20 flex flex-col items-center text-center transform scale-110 sm:scale-125">
          <h1 className="text-white/90 text-2xl font-bold mb-4 uppercase tracking-[0.3em] drop-shadow-sm">
            {t('prayer_alarm') || 'EZAN VAKTİ'}
          </h1>
          
          <div className="w-24 h-24 mb-6 relative">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
            <div className="absolute inset-0 bg-white/40 rounded-full animate-pulse"></div>
            <svg className="w-full h-full text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
          </div>

          <h2 className="text-white text-5xl font-black mb-8 drop-shadow-lg uppercase tracking-tight">
            {t(prayerName)}
          </h2>

          <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-2xl text-white font-bold text-lg animate-bounce">
            {t('stop_alarm_instruction') || 'Durdurmak için dokunun'}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-t-[2.5rem] shadow-2xl">
        <AdBanner 
          adUnitId={ADMOB_IDS.BANNER_HOME} 
          hideAds={settings.isPremium}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default AlarmScreen;
