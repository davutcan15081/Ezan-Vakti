import React, { useEffect, useState } from 'react';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface AdBannerProps {
  className?: string;
  adSize?: 'BANNER' | 'LARGE_BANNER' | 'MEDIUM_RECTANGLE' | 'FULL_BANNER' | 'LEADERBOARD';
  adUnitId?: string;
  hideAds?: boolean;
}

const AD_SIZE_MAP: Record<string, BannerAdSize> = {
  BANNER: BannerAdSize.BANNER,
  LARGE_BANNER: BannerAdSize.LARGE_BANNER,
  MEDIUM_RECTANGLE: BannerAdSize.MEDIUM_RECTANGLE,
  FULL_BANNER: BannerAdSize.FULL_BANNER,
  LEADERBOARD: BannerAdSize.LEADERBOARD,
};

const AdBanner: React.FC<AdBannerProps> = ({
  className = '',
  adSize = 'BANNER',
  adUnitId = '',
  hideAds = false
}) => {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // ✅ FIX: useEffect MUST be called before any early return (Rules of Hooks)
  useEffect(() => {
    if (hideAds) return;
    
    // ✅ FIX: adUnitId null check
    if (!adUnitId || adUnitId.trim() === '') {
      console.warn('AdBanner: adUnitId is empty, skipping ad setup');
      setAdError('Ad unit ID is missing');
      return;
    }

    let isMounted = true;

    const startAdSetup = async () => {
      if (!Capacitor.isNativePlatform()) return;

      // İlk yüklemede biraz bekle ki UI yerleşsin
      setTimeout(async () => {
        if (isMounted) await initializeAd();
      }, 500);
    };

    // AppStateChange listener - Sadece uygulama arkaplana gidip gelince lazım
    const appStateListener = App.addListener('appStateChange', async (state) => {
      if (state.isActive && Capacitor.isNativePlatform() && isMounted) {
        console.log(`AdBanner: App active - Yeniden gösteriliyor - ${adUnitId}`);
        // Resume durumunda MIUI vb. için gecikme iyidir
        setTimeout(async () => {
          if (isMounted) await initializeAd();
        }, 800);
      }
    });

    startAdSetup();

    return () => {
      isMounted = false;
      appStateListener.then(listener => listener.remove());
      if (Capacitor.isNativePlatform()) {
        console.log(`AdBanner: Unmount - Reklam kaldırılıyor - ${adUnitId}`);
        AdMob.removeBanner().catch(() => { });
      }
    };
  }, [adUnitId]); // adUnitId değişirse yeniden başla

  const initializeAd = async () => {
    try {
      if (!Capacitor.isNativePlatform()) return;
      
      // ✅ FIX: adUnitId null check
      if (!adUnitId || adUnitId.trim() === '') {
        console.warn('AdBanner: adUnitId is empty, skipping ad initialization');
        setAdError('Ad unit ID is missing');
        return;
      }

      console.log(`AdBanner: [${adUnitId}] başlatılıyor...`);

      // ✅ FIX: BannerAdOptions kullanılıyor (AdOptions değil)
      // ✅ FIX: adSize ve position parametreleri eklendi
      const bannerOptions: BannerAdOptions = {
        adId: adUnitId,
        adSize: AD_SIZE_MAP[adSize] || BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        isTesting: false,
        npa: false, // Kişiselleştirilmiş reklamlar (true = non-personalized)
      };

      try {
        await AdMob.removeBanner();
      } catch (e) { }

      console.log(`AdMob: Banner gösteriliyor - adId: ${adUnitId}, adSize: ${adSize}`);
      await AdMob.showBanner(bannerOptions);
      setIsAdLoaded(true);
      setAdError(null);
      console.log(`AdMob: Banner başarıyla yüklendi - ${adUnitId}`);

    } catch (error: any) {
      console.error('AdMob Banner Hatası:', error);
      const errorMsg = error?.message || error?.errorMessage || 'Bilinmeyen hata';
      console.error('AdMob Banner Hata Detayı:', JSON.stringify(error));
      setAdError(errorMsg);
      setIsAdLoaded(false);

      // ✅ Hata durumunda 30 saniye sonra tekrar dene
      setTimeout(async () => {
        console.log(`AdMob: Banner yeniden deneniyor - ${adUnitId}`);
        try {
          // ✅ FIX: Tekrar denemede de null check
          if (!adUnitId || adUnitId.trim() === '') return;
          
          const retryOptions: BannerAdOptions = {
            adId: adUnitId,
            adSize: AD_SIZE_MAP[adSize] || BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            isTesting: false,
            npa: false,
          };
          await AdMob.showBanner(retryOptions);
          setIsAdLoaded(true);
          setAdError(null);
          console.log(`AdMob: Banner yeniden deneme başarılı - ${adUnitId}`);
        } catch (retryError) {
          console.error('AdMob: Banner yeniden deneme başarısız:', retryError);
        }
      }, 30000);
    }
  };

  if (adError) {
    return (
      <div className={`bg-slate-100 border border-slate-200 rounded-lg p-2 text-center text-xs text-slate-500 ${className}`}>
        <span>Ad</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="h-12 flex items-center justify-center">
        {!isAdLoaded && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
            <div className="text-xs text-slate-400">Loading ad...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdBanner;
