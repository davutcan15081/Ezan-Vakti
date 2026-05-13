
import { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  soundType: 'ezan',
  vibrationEnabled: true,
  notificationsEnabled: true,
  prayerReminders: {
    imsak: 0,
    gunes: 0,
    ogle: 0,
    ikindi: 0,
    aksam: 0,
    yatsi: 0,
  },
  volume: 1.0,
  locationMode: 'auto',
  timeFormat: '24h',
  calculationMethod: 13, // Diyanet
  asrMethod: 0, // Standard (Shafi, Maliki, Hanbali)
  manualCalculationMethod: false, // Auto-detect by default
  language: 'tr',
  preventBackgroundOptimization: false, // Default: allow optimization
};

// Fallback Istanbul coordinates if geolocation fails
export const DEFAULT_COORDS = {
  latitude: 41.0082,
  longitude: 28.9784,
};

// Using a clear beep sound and the local ezan file
export const SOUND_BEEP = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
export const SOUND_EZAN = './ezan.mp3';

export const CALCULATION_METHODS = [
  { id: 13, name: "Diyanet İşleri Başkanlığı (Türkiye)" },
  { id: 3, name: "MWL (Dünya Müslüman Birliği)" },
  { id: 2, name: "ISNA (Kuzey Amerika)" },
  { id: 5, name: "Mısır Genel Fetva Kurulu" },
  { id: 4, name: "Mekke Ümmü'l-Kurâ Üniversitesi" },
  { id: 1, name: "Karaçi İslami İlimler Üniversitesi" },
  { id: 8, name: "Körfez Bölgesi (Gulf)" },
  { id: 11, name: "Singapur/Endonezya (MUIS/Kemenag)" },
  { id: 12, name: "Fransa (UOIF) - 12 Derece" },
  { id: 7, name: "Tahran Üniversitesi Jeofizik Enstitüsü" },
  { id: 14, name: "Rusya Müslümanları Dini İdaresi" }
];

export const PRAYER_METHOD_BY_COUNTRY: Record<string, number> = {
  // 🇪🇺 AVRUPA
  "DE": 3, "FR": 12, "GB": 1, "NL": 3, "BE": 12, "AT": 3, "CH": 3, "IT": 3, "ES": 3,
  "SE": 3, "NO": 3, "DK": 3, "FI": 3, "GR": 3, "BG": 3, "RO": 3, "PL": 3, "HU": 3,
  "CZ": 3, "SK": 3, "AL": 3, "BA": 3, "XK": 3, "MK": 3, "RS": 3, "ME": 3, "UA": 3,
  "BY": 3, "RU": 14, "IE": 3, "IS": 3, "LU": 12, "MC": 12, "AD": 12, "MT": 3, "VA": 3,
  "LV": 3, "LT": 3, "EE": 3,

  // 🌎 AMERİKA
  "US": 2, "CA": 2, "MX": 2, "BR": 2, "AR": 2, "CL": 2, "CO": 2, "PE": 2, "UY": 2,
  "PY": 2, "VE": 2, "BO": 2, "PA": 2, "CR": 2, "GT": 2, "CU": 2, "JM": 2, "BS": 2,

  // 🌏 ASYA & ORTA DOĞU
  "TR": 13, "CY": 13, "AZ": 3, "KZ": 3, "UZ": 3, "TM": 3, "KG": 3, "TJ": 3,
  "SA": 4, "AE": 4, "QA": 4, "KW": 4, "BH": 4, "OM": 4, "IQ": 4, "SY": 4, "LB": 4,
  "JO": 4, "PS": 4, "IR": 7, "AF": 1, "PK": 1, "IN": 1, "JP": 3, "KR": 3, "CN": 3,
  "ID": 11, "MY": 3, "SG": 11, "TH": 3, "VN": 3, "PH": 3,

  // 🌍 AFRİKA
  "EG": 5, "LY": 5, "TN": 5, "DZ": 5, "MA": 5, "ZA": 3, "NG": 3, "KE": 3, "ET": 3,
  "SD": 4, "SN": 3, "GH": 3, "TZ": 3, "SO": 4, "MR": 3,

  // 🌊 OKYANUSYA
  "AU": 3, "NZ": 3, "FJ": 3,
};

// Diyanet English names to ISO for auto-method lookup
export const COUNTRY_NAME_EN_TO_CODE: Record<string, string> = {
  "GERMANY": "DE", "FRANCE": "FR", "UNITED KINGDOM": "GB", "NETHERLANDS": "NL", "BELGIUM": "BE",
  "AUSTRIA": "AT", "SWITZERLAND": "CH", "ITALY": "IT", "SPAIN": "ES", "SWEDEN": "SE",
  "NORWAY": "NO", "DENMARK": "DE", "FINLAND": "FI", "GREECE": "GR", "BULGARIA": "BG",
  "ROMANIA": "RO", "POLAND": "PL", "HUNGARY": "HU", "CZECH REPUBLIC": "CZ", "SLOVAKIA": "SK",
  "ALBANIA": "AL", "BOSNIA-HERZEGOVINA": "BA", "KOSOVA": "XK", "MACEDONIA": "MK", "SIRBISTAN": "RS",
  "KARADAG": "ME", "UKRAINE": "UA", "BELARUS": "BY", "RUSSIA": "RU", "IRELAND": "IE", "IZLANDA": "IS",
  "LUXEMBOURG": "LU", "MONACO": "MC", "ANDORRA": "AD", "MALTA": "MT", "VATIKAN": "VA",
  "LATVIA": "LV", "LITHUANIA": "LT", "ESTONYA": "EE", "USA": "US", "CANADA": "CA",
  "MEXICO": "MX", "BRAZIL": "BR", "ARGENTINA": "AR", "CHILE": "CL", "COLOMBIYA": "CO",
  "PERU": "PR", "URUGUAY": "UY", "PARAGUAY": "PY", "VENEZUELA": "VE", "BOLIVYA": "BO",
  "PANAMA": "PA", "KOSTARIKA": "CR", "GUATEMALA": "GT", "CUBA": "CU", "JAMAIKA": "JM",
  "BAHAMAS": "BS", "SOUTH AFRICA": "ZA", "NIGERIA": "NG", "KENYA": "KE", "ETHIOPIA": "ET",
  "SUDAN": "SD", "SENEGAL": "SN", "GHANA": "GH", "TANZANYA": "TZ", "SOMALIA": "SO",
  "MORITANYA": "MR", "AUSTRALIA": "AU", "NEW ZEALAND": "NZ", "FIJI": "FJ"
};

export const ASR_METHODS = [
  { id: 0, name: "Standart (Şafii, Maliki, Hanbeli)" },
  { id: 1, name: "Hanefi (Daha Geç)" }
];

// Diyanet Resmi API (ezanvakti.emushaf.net - Diyanet İşleri Başkanlığı verilerini yansıtır)
export const DIYANET_API_BASE = 'https://ezanvakti.emushaf.net';

// Türkiye'nin 81 ili - Diyanet şehir ID'leri (sehirId) ile birlikte
export const TURKEY_CITIES = [
  { name: "Adana", lat: 37.0000, lng: 35.3213, sehirId: "500" },
  { name: "Adıyaman", lat: 37.7648, lng: 38.2786, sehirId: "501" },
  { name: "Afyonkarahisar", lat: 38.7507, lng: 30.5567, sehirId: "502" },
  { name: "Ağrı", lat: 39.7191, lng: 43.0503, sehirId: "503" },
  { name: "Aksaray", lat: 38.3687, lng: 34.0370, sehirId: "504" },
  { name: "Amasya", lat: 40.6501, lng: 35.8360, sehirId: "505" },
  { name: "Ankara", lat: 39.9334, lng: 32.8597, sehirId: "506" },
  { name: "Antalya", lat: 36.8841, lng: 30.7056, sehirId: "507" },
  { name: "Ardahan", lat: 41.1105, lng: 42.7022, sehirId: "508" },
  { name: "Artvin", lat: 41.1828, lng: 41.8183, sehirId: "509" },
  { name: "Aydın", lat: 37.8444, lng: 27.8458, sehirId: "510" },
  { name: "Balıkesir", lat: 39.6484, lng: 27.8826, sehirId: "511" },
  { name: "Bartın", lat: 41.6344, lng: 32.3375, sehirId: "512" },
  { name: "Batman", lat: 37.8812, lng: 41.1351, sehirId: "513" },
  { name: "Bayburt", lat: 40.2552, lng: 40.2249, sehirId: "514" },
  { name: "Bilecik", lat: 40.1451, lng: 29.9799, sehirId: "515" },
  { name: "Bingöl", lat: 38.8851, lng: 40.4983, sehirId: "516" },
  { name: "Bitlis", lat: 38.3938, lng: 42.1232, sehirId: "517" },
  { name: "Bolu", lat: 40.7350, lng: 31.6061, sehirId: "518" },
  { name: "Burdur", lat: 37.7203, lng: 30.2908, sehirId: "519" },
  { name: "Bursa", lat: 40.1885, lng: 29.0610, sehirId: "520" },
  { name: "Çanakkale", lat: 40.1553, lng: 26.4142, sehirId: "521" },
  { name: "Çankırı", lat: 40.6013, lng: 33.6134, sehirId: "522" },
  { name: "Çorum", lat: 40.5506, lng: 34.9556, sehirId: "523" },
  { name: "Denizli", lat: 37.7765, lng: 29.0864, sehirId: "524" },
  { name: "Diyarbakır", lat: 37.9144, lng: 40.2306, sehirId: "525" },
  { name: "Düzce", lat: 40.8438, lng: 31.1565, sehirId: "526" },
  { name: "Edirne", lat: 41.6771, lng: 26.5557, sehirId: "527" },
  { name: "Elazığ", lat: 38.6810, lng: 39.2264, sehirId: "528" },
  { name: "Erzincan", lat: 39.7500, lng: 39.5000, sehirId: "529" },
  { name: "Erzurum", lat: 39.9043, lng: 41.2679, sehirId: "530" },
  { name: "Eskişehir", lat: 39.7667, lng: 30.5256, sehirId: "531" },
  { name: "Gaziantep", lat: 37.0662, lng: 37.3833, sehirId: "532" },
  { name: "Giresun", lat: 40.9128, lng: 38.3895, sehirId: "533" },
  { name: "Gümüşhane", lat: 40.4600, lng: 39.4814, sehirId: "534" },
  { name: "Hakkari", lat: 37.5833, lng: 43.7333, sehirId: "535" },
  { name: "Hatay", lat: 36.4018, lng: 36.3498, sehirId: "536" },
  { name: "Iğdır", lat: 39.9167, lng: 44.0333, sehirId: "537" },
  { name: "Isparta", lat: 37.7648, lng: 30.5566, sehirId: "538" },
  { name: "İstanbul", lat: 41.0082, lng: 28.9784, sehirId: "539" },
  { name: "İzmir", lat: 38.4189, lng: 27.1287, sehirId: "540" },
  { name: "Kahramanmaraş", lat: 37.5858, lng: 36.9371, sehirId: "541" },
  { name: "Karabük", lat: 41.2061, lng: 32.6204, sehirId: "542" },
  { name: "Karaman", lat: 37.1759, lng: 33.2287, sehirId: "543" },
  { name: "Kars", lat: 40.6167, lng: 43.1000, sehirId: "544" },
  { name: "Kastamonu", lat: 41.3887, lng: 33.7827, sehirId: "545" },
  { name: "Kayseri", lat: 38.7312, lng: 35.4787, sehirId: "546" },
  { name: "Kilis", lat: 36.7184, lng: 37.1212, sehirId: "547" },
  { name: "Kırıkkale", lat: 39.8468, lng: 33.5153, sehirId: "548" },
  { name: "Kırklareli", lat: 41.7333, lng: 27.2167, sehirId: "549" },
  { name: "Kırşehir", lat: 39.1425, lng: 34.1709, sehirId: "550" },
  { name: "Kocaeli", lat: 40.8533, lng: 29.8815, sehirId: "551" },
  { name: "Konya", lat: 37.8667, lng: 32.4833, sehirId: "552" },
  { name: "Kütahya", lat: 39.4167, lng: 29.9833, sehirId: "553" },
  { name: "Malatya", lat: 38.3552, lng: 38.3095, sehirId: "554" },
  { name: "Manisa", lat: 38.6191, lng: 27.4289, sehirId: "555" },
  { name: "Mardin", lat: 37.3212, lng: 40.7245, sehirId: "556" },
  { name: "Mersin", lat: 36.8000, lng: 34.6333, sehirId: "557" },
  { name: "Muğla", lat: 37.2153, lng: 28.3636, sehirId: "558" },
  { name: "Muş", lat: 38.9462, lng: 41.7539, sehirId: "559" },
  { name: "Nevşehir", lat: 38.6244, lng: 34.7144, sehirId: "560" },
  { name: "Niğde", lat: 37.9667, lng: 34.6833, sehirId: "561" },
  { name: "Ordu", lat: 40.9839, lng: 37.8764, sehirId: "562" },
  { name: "Osmaniye", lat: 37.0742, lng: 36.2467, sehirId: "563" },
  { name: "Rize", lat: 41.0201, lng: 40.5234, sehirId: "564" },
  { name: "Sakarya", lat: 40.7569, lng: 30.3783, sehirId: "565" },
  { name: "Samsun", lat: 41.2928, lng: 36.3313, sehirId: "566" },
  { name: "Şanlıurfa", lat: 37.1591, lng: 38.7969, sehirId: "567" },
  { name: "Siirt", lat: 37.9333, lng: 41.9500, sehirId: "568" },
  { name: "Sinop", lat: 42.0231, lng: 35.1531, sehirId: "569" },
  { name: "Şırnak", lat: 37.5164, lng: 42.4611, sehirId: "570" },
  { name: "Sivas", lat: 39.7477, lng: 37.0179, sehirId: "571" },
  { name: "Tekirdağ", lat: 40.9833, lng: 27.5167, sehirId: "572" },
  { name: "Tokat", lat: 40.3167, lng: 36.5500, sehirId: "573" },
  { name: "Trabzon", lat: 41.0015, lng: 39.7178, sehirId: "574" },
  { name: "Tunceli", lat: 39.1079, lng: 39.5401, sehirId: "575" },
  { name: "Uşak", lat: 38.6823, lng: 29.4082, sehirId: "576" },
  { name: "Van", lat: 38.4891, lng: 43.4089, sehirId: "577" },
  { name: "Yalova", lat: 40.6500, lng: 29.2667, sehirId: "578" },
  { name: "Yozgat", lat: 39.8181, lng: 34.8147, sehirId: "579" },
  { name: "Zonguldak", lat: 41.4564, lng: 31.7987, sehirId: "580" }
];

export const ADMOB_IDS = {
  BANNER_HOME: 'ca-app-pub-6135130502521835/8455480838', // Ana sayfa banner
  BANNER_SETTINGS: 'ca-app-pub-6135130502521835/2014820289', // Ayarlar banner
  INTERSTITIAL: 'ca-app-pub-6135130502521835/3203154155', // Vakit geçişleri
};

export const REVENUECAT_CONFIG = {
  APPLE_API_KEY: 'appl_your_key_here',
  GOOGLE_API_KEY: 'goog_KAzyOzlKHpdygmgUAtMoyVmApry',
  ENTITLEMENT_ID: 'premium',
};

export const ADMOB_APP_ID = 'ca-app-pub-6135130502521835~2716962245';
