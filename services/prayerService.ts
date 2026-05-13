import { PrayerData, PrayerTimes } from '../types';
import { TURKEY_CITIES, DIYANET_API_BASE, CALCULATION_METHODS, PRAYER_METHOD_BY_COUNTRY, COUNTRY_NAME_EN_TO_CODE } from '../constants';
import { CapacitorHttp } from '@capacitor/core';

const YEARLY_CACHE_KEY = 'ezan_diyanet_v60';
const DISTRICT_CACHE_KEY = 'ezan_district_cache';

// ============================================================
// ANA FONKSİYON: Namaz vakitlerini getir
// Öncelik: 1) Önbellek  2) Diyanet Resmi API  3) Eski proxy'ler  4) Son çare offline mod
// ============================================================
export const fetchPrayerTimes = async (
    lat: number,
    lng: number,
    cityOverride?: string,
    countryOverride?: string,
    ulkeId?: string,
    sehirId?: string,
    ilceId?: string,
    method: number = 13,
    school: number = 0,
    countryEn?: string,
    manualCalculationMethod?: boolean
): Promise<PrayerData> => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const todayKey = `${now.getDate().toString().padStart(2, '0')}.${currentMonth.toString().padStart(2, '0')}.${currentYear}`;

    let cityName = cityOverride || '';
    let countryName = countryOverride || '';

    const isTurkey = ulkeId === '2' || !countryName || ['türkiye', 'turkiye', 'turkey', 'tr'].includes(countryName.toLowerCase());

    // Auto-detect best method if default (13) is used OR if we are doing a fresh location select
    // Respect manualCalculationMethod setting - if true, use the provided method parameter
    let finalMethod = method;
    if (!manualCalculationMethod && !isTurkey) {
        let code = countryEn ? COUNTRY_NAME_EN_TO_CODE[countryEn.toUpperCase()] : null;
        if (!code && countryName) {
            code = COUNTRY_NAME_EN_TO_CODE[countryName.toUpperCase()];
        }

        // If it's a manual selection or auto-detect is needed
        if (code && PRAYER_METHOD_BY_COUNTRY[code]) {
            finalMethod = PRAYER_METHOD_BY_COUNTRY[code];
        } else {
            finalMethod = 3; // Default to MWL for international
        }
    } else if (!manualCalculationMethod && isTurkey) {
        finalMethod = 13; // Always Diyanet for Turkey
    }
    // If manualCalculationMethod is true, use the provided method parameter as-is

    // Step 1: Priority — If we have a Diyanet İlçe ID (manual selection) AND finalMethod is Diyanet (13) AND school is Standard (0)
    // (Diyanet API does not provide Hanafi times, so for school=1 we must use AlAdhan)
    if (ilceId && finalMethod === 13 && school === 0) {
        try {
            // First check cache
            const cacheKey = `diyanet_v3_${ilceId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const fullData = JSON.parse(cached);
                if (fullData.days && fullData.days[todayKey]) {
                    return {
                        date: todayKey,
                        times: fullData.days[todayKey],
                        city: cityName,
                        country: countryName || 'Dünya Geneli',
                        source: `${fullData.source} (Önbellek)`,
                        methodUsed: 13
                    };
                }
            }

            // Fetch from Official Diyanet
            const response = await CapacitorHttp.get({ url: `${DIYANET_API_BASE}/vakitler/${ilceId}` });
            const rawData = response.data;
            if (Array.isArray(rawData) && rawData.length > 0) {
                const daysMap: Record<string, PrayerTimes> = {};
                rawData.forEach((item: any) => {
                    const dateKey = item.MiladiTarihKisa;
                    if (dateKey) {
                        daysMap[dateKey] = {
                            imsak: item.Imsak,
                            gunes: item.Gunes,
                            ogle: item.Ogle,
                            ikindi: item.Ikindi,
                            aksam: item.Aksam,
                            yatsi: item.Yatsi
                        };
                    }
                });

                localStorage.setItem(`diyanet_v3_${ilceId}`, JSON.stringify({
                    city: cityName, days: daysMap, source: "Diyanet İşleri Başkanlığı (Resmi)"
                }));

                if (daysMap[todayKey]) {
                    return {
                        date: todayKey,
                        times: daysMap[todayKey],
                        city: cityName,
                        country: countryName || 'Dünya Geneli',
                        source: "Diyanet İşleri Başkanlığı (Resmi)",
                        methodUsed: 13
                    };
                }
            }
        } catch (e) {
            console.warn("Diyanet ID-based fetch failed, trying fallbacks...", e);
        }
    }

    // Step 2: Fallback — GPS Mode or missing ID
    if (!cityOverride) {
        try {
            const geoRes = await CapacitorHttp.get({ url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=tr` });
            if (geoRes.data) {
                cityName = geoRes.data.city || geoRes.data.locality || '';
                countryName = geoRes.data.countryName || geoRes.data.countryCode || '';
            }
        } catch (e) {
            console.warn("Reverse geocode failed", e);
        }

        if (!cityName) {
            const nearest = findNearestCity(lat, lng);
            cityName = nearest || 'İstanbul';
            countryName = 'Türkiye';
        }
    }

    const useAlAdhan = !isTurkey || school !== 0 || finalMethod !== 13;

    if (useAlAdhan) {
        // AlAdhan approach for GPS-based or Custom Method Discovery
        const cacheKey = `aladhan_v3_${cityName.toLowerCase()}_${countryName.toLowerCase()}_m${finalMethod}_s${school}`;
        const cached = localStorage.getItem(cacheKey);
        let daysMap: Record<string, PrayerTimes> | null = null;
        let sourceInfo = `AlAdhan (${CALCULATION_METHODS.find(m => m.id === finalMethod)?.name || 'MWL'})`;
        if (school === 1) sourceInfo += " - Hanefi";
        let timezoneString = '';

        if (cached) {
            try {
                const fullData = JSON.parse(cached);
                if (fullData.days && fullData.days[todayKey]) {
                    daysMap = fullData.days;
                    sourceInfo = `${fullData.source} (Önbellek)`;
                }
            } catch (e) { }
        }

        if (!daysMap || !daysMap[todayKey]) {
            // Coordinate & Timezone resolution for GPS (only if lat/lng available)
            if (lat !== 0 || lng !== 0) {
                try {
                    const tzRes = await CapacitorHttp.get({
                        url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
                    });
                    if (tzRes.data) timezoneString = tzRes.data.timezone || '';
                } catch (e) { }
            }

            try {
                let url = '';
                if (lat !== 0 || lng !== 0) {
                    url = `https://api.aladhan.com/v1/calendar/${currentYear}/${currentMonth}?latitude=${lat}&longitude=${lng}&method=${finalMethod}&school=${school}`;
                    if (timezoneString) url += `&timezonestring=${encodeURIComponent(timezoneString)}`;
                } else if (cityName && countryName) {
                    url = `https://api.aladhan.com/v1/calendarByCity/${currentYear}/${currentMonth}?city=${encodeURIComponent(cityName)}&country=${encodeURIComponent(countryName)}&method=${finalMethod}&school=${school}`;
                }

                if (url) {
                    const response = await CapacitorHttp.get({ url });
                    const data = response.data;
                    if (data && data.code === 200 && Array.isArray(data.data)) {
                        daysMap = {};
                        data.data.forEach((item: any) => {
                            const dateKey = item.date.gregorian.date.replace(/-/g, '.');
                            const cleanTime = (t: string) => t.substring(0, 5);
                            daysMap![dateKey] = {
                                imsak: cleanTime(item.timings.Fajr), gunes: cleanTime(item.timings.Sunrise),
                                ogle: cleanTime(item.timings.Dhuhr), ikindi: cleanTime(item.timings.Asr),
                                aksam: cleanTime(item.timings.Maghrib), yatsi: cleanTime(item.timings.Isha)
                            };
                        });
                        localStorage.setItem(cacheKey, JSON.stringify({
                            city: cityName, country: countryName, days: daysMap, source: sourceInfo
                        }));
                    }
                }
            } catch (e) {
                console.warn("AlAdhan fetch failed:", e);
            }
        }

        if (daysMap && daysMap[todayKey]) {
            return { date: todayKey, times: daysMap[todayKey], city: cityName, country: countryName, source: sourceInfo, methodUsed: finalMethod };
        }
    }

    // --- TURKEY APPROACH (DİYANET) ---
    if (!cityName) cityName = 'İstanbul';

    // 1. ÖNBELLEK KONTROLÜ (Sonsuz süre, sadece şehir değişiminde temizlenir)
    const cached = localStorage.getItem(YEARLY_CACHE_KEY);
    if (cached) {
        try {
            const fullData = JSON.parse(cached);
            if (fullData.city === cityName && fullData.days && fullData.days[todayKey]) {
                return {
                    date: todayKey,
                    times: fullData.days[todayKey],
                    city: fullData.city,
                    country: 'Türkiye',
                    isOffline: true,
                    source: fullData.source || "Diyanet İşleri Başkanlığı (Önbellek)",
                    methodUsed: 13
                };
            }
        } catch (e) { /* önbellek bozuksa yeniden çek */ }
    }

    // 2. DİYANET RESMİ API (ezanvakti.emushaf.net) - 1 YILLIK VERİ
    try {
        const data = await fetchFromDiyanetOfficial(cityName);
        if (data && data.days[todayKey]) {
            return {
                date: todayKey,
                times: data.days[todayKey],
                city: cityName,
                country: 'Türkiye',
                source: "Diyanet İşleri Başkanlığı (Resmi)",
                methodUsed: 13
            };
        }
    } catch (e) {
        console.warn("Diyanet resmi API başarısız, yedek kaynaklar deneniyor...", e);
    }

    // 3. YEDEK PROXY KANALLARI
    const citySlug = getDiyanetSlug(cityName.toLocaleUpperCase('tr-TR'));
    const proxyEndpoints = [
        `https://vakit.vercel.app/api/timesFromCity?city=${citySlug}`,
        `https://ezanvaktitapi.vercel.app/api/timesFromCity?city=${citySlug}`,
        `https://namaz-vakitleri.vercel.app/api/timesFromCity?city=${citySlug}`
    ];

    for (const url of proxyEndpoints) {
        try {
            console.warn(`Fetching from: ${url}`);
            const response = await CapacitorHttp.get({ url });
            console.warn(`Response received:`, response);
            const data = response.data;
            if (Array.isArray(data) && data.length > 0) {
                const daysMap: Record<string, PrayerTimes> = {};
                data.forEach((item: any) => {
                    daysMap[item.date] = {
                        imsak: item.imsak, gunes: item.gunes, ogle: item.ogle,
                        ikindi: item.ikindi, aksam: item.aksam, yatsi: item.yatsi
                    };
                });

                const sourceInfo = "Diyanet Uyumlu (Proxy)";
                localStorage.setItem(YEARLY_CACHE_KEY, JSON.stringify({
                    city: cityName, days: daysMap, source: sourceInfo
                }));

                if (daysMap[todayKey]) {
                    return { date: todayKey, times: daysMap[todayKey], city: cityName, country: 'Türkiye', source: sourceInfo };
                }
            }
        } catch (e) {
            console.warn("Proxy kanal meşgul, diğeri deneniyor...");
        }
    }

    // 4. SON ÇARE: OFFLINE MOD - Herhangi bir önbellek varsa kullan
    try {
        const anyCached = localStorage.getItem(YEARLY_CACHE_KEY);
        if (anyCached) {
            const fullData = JSON.parse(anyCached);
            if (fullData.days && Object.keys(fullData.days).length > 0) {
                const cachedDates = Object.keys(fullData.days).sort();
                const closestDate = cachedDates.find(date => {
                    const [day, month, year] = date.split('.').map(Number);
                    const cacheDate = new Date(year, month - 1, day);
                    return cacheDate >= now;
                }) || cachedDates[cachedDates.length - 1]; // En son tarih

                if (fullData.days[closestDate]) {
                    return {
                        date: todayKey,
                        times: fullData.days[closestDate],
                        city: fullData.city || cityName,
                        country: 'Türkiye',
                        isOffline: true,
                        source: `${fullData.source || "Önbellek"} (Offline Mod)`
                    };
                }
            }
        }
    } catch (e) {
        console.error("Offline mod da başarısız:", e);
    }

    throw new Error("Diyanet verilerine şu an ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin ve uygulamayı yeniden başlatın.");
};

// ============================================================
// DİYANET RESMİ API - İlçe ID'sini bul ve vakitleri çek
// ============================================================
const fetchFromDiyanetOfficial = async (cityName: string): Promise<{ days: Record<string, PrayerTimes>; source: string } | null> => {
    // Şehir bilgisini bul
    const cityInfo = TURKEY_CITIES.find(c => c.name === cityName);
    if (!cityInfo) return null;

    // İlçe ID'sini al (önbellekten veya API'den)
    const ilceId = await getDiyanetDistrictId(cityInfo.sehirId, cityName);
    if (!ilceId) return null;

    // Namaz vakitlerini çek
    const response = await CapacitorHttp.get({ url: `${DIYANET_API_BASE}/vakitler/${ilceId}` });

    const rawData = response.data;
    if (!Array.isArray(rawData) || rawData.length === 0) throw new Error("Boş veri");

    // Diyanet API yanıtını uygulama formatına dönüştür
    const daysMap: Record<string, PrayerTimes> = {};
    rawData.forEach((item: any) => {
        const dateKey = item.MiladiTarihKisa; // "13.02.2026" formatı
        if (dateKey) {
            daysMap[dateKey] = {
                imsak: item.Imsak,
                gunes: item.Gunes,
                ogle: item.Ogle,
                ikindi: item.Ikindi,
                aksam: item.Aksam,
                yatsi: item.Yatsi
            };
        }
    });

    const source = "Diyanet İşleri Başkanlığı (Resmi)";

    // Önbelleğe kaydet
    localStorage.setItem(YEARLY_CACHE_KEY, JSON.stringify({
        city: cityName, days: daysMap, source
    }));

    return { days: daysMap, source };
};

// ============================================================
// İlçe ID'sini bul (şehir merkezi)
// ============================================================
const getDiyanetDistrictId = async (sehirId: string, cityName: string): Promise<string | null> => {
    // Önbellekten kontrol
    const districtCache = localStorage.getItem(DISTRICT_CACHE_KEY);
    if (districtCache) {
        try {
            const cache = JSON.parse(districtCache);
            if (cache[sehirId]) return cache[sehirId];
        } catch (e) { /* */ }
    }

    // API'den ilçeleri çek
    const response = await CapacitorHttp.get({ url: `${DIYANET_API_BASE}/ilceler/${sehirId}` });

    const districts = response.data;
    if (!Array.isArray(districts) || districts.length === 0) return null;

    // Şehir merkezini bul: ilçe adı şehir adıyla aynı olan veya ilk ilçe
    const normalizedCity = normalizeTurkish(cityName);
    const centerDistrict = districts.find((d: any) =>
        normalizeTurkish(d.IlceAdi) === normalizedCity ||
        normalizeTurkish(d.IlceAdiEn) === normalizedCity
    ) || districts[0];

    const ilceId = centerDistrict.IlceID;

    // Önbelleğe kaydet
    const existingCache = districtCache ? JSON.parse(districtCache) : {};
    existingCache[sehirId] = ilceId;
    localStorage.setItem(DISTRICT_CACHE_KEY, JSON.stringify(existingCache));

    return ilceId;
};

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================

const normalizeTurkish = (str: string): string => {
    return str
        .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
        .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u').replace(/ü/g, 'u')
        .replace(/Ş/g, 's').replace(/ş/g, 's')
        .replace(/Ö/g, 'o').replace(/ö/g, 'o')
        .replace(/Ç/g, 'c').replace(/ç/g, 'c')
        .toLowerCase().trim();
};

const getDiyanetSlug = (str: string): string => {
    return normalizeTurkish(str).replace(/\s+/g, '-');
};

export const calculateNextPrayer = (times: PrayerTimes, lastAlarmKey?: string | null): { nextKey: string, isTomorrow: boolean } => {
    const now = new Date();
    const dateStr = now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const keys = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];
    
    for (const key of keys) {
        const t = times[key];
        if (!t) continue;
        
        // Eğer bu vakit için bugün alarm çaldıysa (vakit erken çalmış olsa bile), bir sonrakine geç
        if (lastAlarmKey && lastAlarmKey.includes(dateStr) && lastAlarmKey.includes(`-${key}-`)) {
            continue;
        }

        const [h, m] = t.split(':').map(Number);
        if ((h * 60 + m) >= currentMinutes) return { nextKey: key, isTomorrow: false };
    }
    return { nextKey: 'imsak', isTomorrow: true };
}

export const getTimeDifferenceMinutes = (targetTimeStr: string, isTomorrow: boolean): number => {
    const now = new Date();
    const [targetH, targetM] = targetTimeStr.split(':').map(Number);
    let target = new Date();
    target.setHours(targetH, targetM, 0, 0);
    if (isTomorrow) target.setDate(target.getDate() + 1);
    return Math.floor((target.getTime() - now.getTime()) / 1000 / 60);
}

const findNearestCity = (lat: number, lng: number): string | null => {
    let minDist = Infinity; let nearest = null;
    for (const c of TURKEY_CITIES) {
        const d = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lng - c.lng, 2));
        if (d < minDist) { minDist = d; nearest = c.name; }
    }
    return nearest;
}