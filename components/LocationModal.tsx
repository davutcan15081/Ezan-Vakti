import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, MapPin, Search, Navigation, Globe } from 'lucide-react';
import { TURKEY_CITIES } from '../constants';
import { ManualLocation } from '../types';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (locationMode: 'auto' | 'manual', manualData?: ManualLocation) => void;
  currentMode: 'auto' | 'manual';
  currentCity?: string;
  currentCountry?: string;
  t: (key: string) => string;
}

// Genişletilmiş Ülke Sözlüğü
const COUNTRY_NAME_MAP: Record<string, string> = {
  'TURKIYE': 'Turkey',
  'ALMANYA': 'Germany',
  'AMERIKA BIRLESIK DEVLETLERI': 'United States',
  'ARNAVUTLUK': 'Albania',
  'AVUSTRALYA': 'Australia',
  'AVUSTURYA': 'Austria',
  'AZERBAYCAN': 'Azerbaijan',
  'BELCIKA': 'Belgium',
  'BIRLESIK ARAP EMIRLIKLERI': 'United Arab Emirates',
  'BIRLESIK KRALLIK': 'United Kingdom',
  'BOSNA HERSEK': 'Bosnia and Herzegovina',
  'BREZILYA': 'Brazil',
  'BULGARISTAN': 'Bulgaria',
  'CEZAYIR': 'Algeria',
  'CEK CUMHURIYETI': 'Czechia',
  'CIN': 'China',
  'DANIMARKA': 'Denmark',
  'ENDONEZYA': 'Indonesia',
  'FAS': 'Morocco',
  'FILIPINLER': 'Philippines',
  'FILISTIN': 'Palestine',
  'FRANSA': 'France',
  'GUNEY AFRIKA': 'South Africa',
  'GUNEY KORE': 'South Korea',
  'HINDISTAN': 'India',
  'HIRVATISTAN': 'Croatia',
  'HOLLANDA': 'Netherlands',
  'IRAK': 'Iraq',
  'INGILTERE': 'United Kingdom',
  'IRAN': 'Iran',
  'ISPANYA': 'Spain',
  'ISRAIL': 'Israel',
  'ISVEC': 'Sweden',
  'ISVICRE': 'Switzerland',
  'ITALYA': 'Italy',
  'JAPONYA': 'Japan',
  'KANADA': 'Canada',
  'KARADAG': 'Montenegro',
  'KAZAKISTAN': 'Kazakhstan',
  'KIBRIS': 'Cyprus',
  'KUZEY KORE': 'North Korea',
  'KUZEY MAKEDONYA': 'North Macedonia',
  'LUBNAN': 'Lebanon',
  'MACARISTAN': 'Hungary',
  'MEKSIKA': 'Mexico',
  'MISIR': 'Egypt',
  'NORVEC': 'Norway',
  'OZEBEKISTAN': 'Uzbekistan',
  'POLONYA': 'Poland',
  'PORTEKIZ': 'Portugal',
  'ROMANYA': 'Romania',
  'RUSYA': 'Russia',
  'SIRBISTAN': 'Serbia',
  'SURIYE': 'Syria',
  'SUUDI ARABISTAN': 'Saudi Arabia',
  'YUNANISTAN': 'Greece',
  'FILDISI SAHILI': 'Ivory Coast',
  'DOMINIK CUMHURIYETI': 'Dominican Republic',
  'YENI ZELANDA': 'New Zealand',
  'PAPUA YENI GINE': 'Papua New Guinea',
  'TRINIDAD VE TOBAGO': 'Trinidad and Tobago',
  'SEYSEL ADALARI': 'Seychelles',
  'SOLOMON ADALARI': 'Solomon Islands',
  'SAO TOME VE PRINCIPE': 'São Tomé and Príncipe',
  'ANTIGUA VE BARBUDA': 'Antigua and Barbuda',
  'SAINT KITTS VE NEVIS': 'Saint Kitts and Nevis',
  'SAINT VINCENT VE GRENADINLER': 'Saint Vincent and the Grenadines',
};

// Genişletilmiş Şehirler, Eyaletler ve Bölgeler Sözlüğü
const CITY_NAME_MAP: Record<string, string> = {
  // Avrupa Başkentleri
  'LONDRA': 'London',
  'PARIS': 'Paris',
  'ROMA': 'Rome',
  'VIYANA': 'Vienna',
  'ATINA': 'Athens',
  'MOSKOVA': 'Moscow',
  'PEKIN': 'Beijing',
  'TOKYO': 'Tokyo',
  'BERLIN': 'Berlin',
  'AMSTERDAM': 'Amsterdam',
  'BRUKSEL': 'Brussels',
  'KOPENHAG': 'Copenhagen',
  'STOKHOLM': 'Stockholm',
  'OSLO': 'Oslo',
  'HELSINKI': 'Helsinki',
  'VARSOVA': 'Warsaw',
  'BUDAPESTE': 'Budapest',
  'PRAG': 'Prague',
  'BELGRAD': 'Belgrade',
  'BUKRES': 'Bucharest',
  'SOFYA': 'Sofia',
  'DUBLIN': 'Dublin',
  'LISBON': 'Lisbon',
  'MADRID': 'Madrid',
  'ANDORRA LA VELLA': 'Andorra la Vella',
  'VALLETTA': 'Valletta',
  'PODGORICA': 'Podgorica',
  'PRISTINA': 'Pristina',
  'SARAYBOSNA': 'Sarajevo',
  'SKOPJE': 'Skopje',
  'TIRANA': 'Tirana',
  'VADUZ': 'Vaduz',
  'VATIKAN': 'Vatican City',
  'ZAGREB': 'Zagreb',

  // Orta Doğu ve Afrika
  'KAHIRE': 'Cairo',
  'SAM': 'Damascus',
  'BAGDAT': 'Baghdad',
  'TAHRAN': 'Tehran',
  'KABUL': 'Kabul',
  'YENI DELHI': 'New Delhi',
  'MEKKE': 'Mecca',
  'MEDINE': 'Medina',
  'KUDUS': 'Jerusalem',
  'AMMAN': 'Amman',
  'BEYRUT': 'Beirut',
  'DOHA': 'Doha',
  'KUVEIT': 'Kuwait',
  'MANAMA': 'Manama',
  'MASKAT': 'Muscat',
  'RIYAD': 'Riyadh',
  'SANAA': 'Sanaa',
  'TRIPOLI': 'Tripoli',
  'TUNUS': 'Tunis',
  'Cezayir': 'Algiers',
  'RABAT': 'Rabat',
  'HARARE': 'Harare',
  'LUANDA': 'Luanda',
  'Nairobi': 'Nairobi',
  'Pretoria': 'Pretoria',

  // Amerika Kıtası
  'NEW YORK': 'New York',
  'LOS ANGELES': 'Los Angeles',
  'CHICAGO': 'Chicago',
  'WASHINGTON': 'Washington',
  'MIAMI': 'Miami',
  'BOSTON': 'Boston',
  'PHILADELPHIA': 'Philadelphia',
  'SAN FRANCISCO': 'San Francisco',
  'SEATTLE': 'Seattle',
  'TORONTO': 'Toronto',
  'MONTREAL': 'Montreal',
  'VANCOUVER': 'Vancouver',
  'MEXICO CITY': 'Mexico City',
  'BUENOS AIRES': 'Buenos Aires',
  'SAO PAULO': 'São Paulo',
  'RIO DE JANEIRO': 'Rio de Janeiro',
  'LIMA': 'Lima',
  'BOGOTA': 'Bogotá',
  'CARACAS': 'Caracas',
  'SANTIAGO': 'Santiago',
  'MONTIVIDEO': 'Montevideo',

  // Asya Pasifik
  'BANGKOK': 'Bangkok',
  'SINGAPUR': 'Singapore',
  'HONG KONG': 'Hong Kong',
  'JAKARTA': 'Jakarta',
  'MANILA': 'Manila',
  'KUALA LUMPUR': 'Kuala Lumpur',
  'HO CHI MINH': 'Ho Chi Minh City',
  'HANOI': 'Hanoi',
  'SEOUL': 'Seoul',
  'TAIPEI': 'Taipei',
  'ISLAMABAD': 'Islamabad',
  'KARACHI': 'Karachi',
  'DHAKA': 'Dhaka',
  'KOLKATA': 'Kolkata',
  'MUMBAI': 'Mumbai',
  'COLOMBO': 'Colombo',

  // Almanya Eyaletleri ve Şehirleri
  'BADEN-WURTTEMBERG': 'Baden-Württemberg',
  'BAYERN': 'Bavaria',
  'BRANDENBURG': 'Brandenburg',
  'HAMBURG': 'Hamburg',
  'HESSEN': 'Hesse',
  'MECKLENBURG-VORPOMMERN': 'Mecklenburg-Vorpommern',
  'NIEDERSACHSEN': 'Lower Saxony',
  'NORDRHEIN-WESTFALEN': 'North Rhine-Westphalia',
  'RHEINLAND-PFALZ': 'Rhineland-Palatinate',
  'SAARLAND': 'Saarland',
  'SACHSEN': 'Saxony',
  'SACHSEN-ANHALT': 'Saxony-Anhalt',
  'SCHLESWIG-HOLSTEIN': 'Schleswig-Holstein',
  'THURINGEN': 'Thuringia',
  'MUNIH': 'Munich',
  'KOLN': 'Cologne',
  'FRANKFURT': 'Frankfurt',
  'STUTTGART': 'Stuttgart',
  'DORTMUND': 'Dortmund',
  'DUSSELDORF': 'Düsseldorf',
  'ESSEN': 'Essen',
  'LEIPZIG': 'Leipzig',
  'DRESDEN': 'Dresden',
  'HANNOVER': 'Hanover',
  'NUREMBERG': 'Nuremberg',

  // İtalya Şehirleri
  'MILANO': 'Milan',
  'VENEDIK': 'Venice',
  'FLORANSA': 'Florence',
  'NAPOLI': 'Naples',
  'TORINO': 'Turin',
  'BOLOGNA': 'Bologna',
  'GENOA': 'Genoa',
  'PALERMO': 'Palermo',
  'CATANIA': 'Catania',
  'VERONA': 'Verona',

  // Fransa Şehirleri
  'MARSEILLE': 'Marseille',
  'LYON': 'Lyon',
  'TOULOUSE': 'Toulouse',
  'NICE': 'Nice',
  'NANTES': 'Nantes',
  'STRASBOURG': 'Strasbourg',
  'MONTPELLIER': 'Montpellier',

  // İspanya Şehirleri
  'BARSELONA': 'Barcelona',
  'VALENCIA': 'Valencia',
  'SEVILLA': 'Seville',
  'ZARAGOZA': 'Zaragoza',
  'MALAGA': 'Malaga',
  'MURCIA': 'Murcia',
  'LAS PALMAS': 'Las Palmas',

  // İsviçre Şehirleri
  'CENEVRE': 'Geneva',
  'ZURIH': 'Zurich',
  'BASEL': 'Basel',
  'BERN': 'Bern',
  'LAUSANNE': 'Lausanne',

  // İngiltere Şehirleri
  'MANCHESTER': 'Manchester',
  'BIRMINGHAM': 'Birmingham',
  'GLASGOW': 'Glasgow',
  'LIVERPOOL': 'Liverpool',
  'LEEDS': 'Leeds',
  'SHEFFIELD': 'Sheffield',
  'BRISTOL': 'Bristol',
  'EDINBURGH': 'Edinburgh',

  // Hollanda Şehirleri
  'ROTTERDAM': 'Rotterdam',
  'THE HAGUE': 'The Hague',
  'UTRECHT': 'Utrecht',
  'EINDHOVEN': 'Eindhoven',

  // Belçika Şehirleri
  'ANTWERP': 'Antwerp',
  'GHENT': 'Ghent',
  'LIEGE': 'Liège',

  // Avusturya Şehirleri
  'SALZBURG': 'Salzburg',
  'INNSBRUCK': 'Innsbruck',
  'GRAZ': 'Graz',

  // İskandinavya Şehirleri
  'GOTHENBURG': 'Gothenburg',
  'MALMO': 'Malmö',
  'AALBORG': 'Aalborg',
  'ODENSE': 'Odense',
  'BERGEN': 'Bergen',
  'TRONDHEIM': 'Trondheim',
  'TAMPERE': 'Tampere',
  'TURKU': 'Turku',

  // Doğu Avrupa Şehirleri
  'KRakow': 'Kraków',
  'GDANSK': 'Gdańsk',
  'WROCLAW': 'Wrocław',
  'SZCZECIN': 'Szczecin',
  'BRNO': 'Brno',
  'OSTRAVA': 'Ostrava',
  'PLZEN': 'Plzeň',
  'TIMISOARA': 'Timișoara',
  'CLUJ-NAPOCA': 'Cluj-Napoca',
  'IASI': 'Iași',
  'CONSTANTA': 'Constanța',
  'NOVI SAD': 'Novi Sad',
  'NIS': 'Niš',

  // Türkiye Büyük Şehirleri (API'den gelen hatalı isimler için)
  'ISTANBUL': 'Istanbul',
  'ANKARA': 'Ankara',
  'IZMIR': 'Izmir',
  'BURSA': 'Bursa',
  'ADANA': 'Adana',
  'GAZIANTEP': 'Gaziantep',
  'KONYA': 'Konya',
  'ANTALYA': 'Antalya',
  'DIYARBAKIR': 'Diyarbakır',
  'MERSIN': 'Mersin',
  'KAYSERI': 'Kayseri',
  'ESKISEHIR': 'Eskişehir',
  'SANLIURFA': 'Şanlıurfa',
  'SAMSUN': 'Samsun',
  'MALATYA': 'Malatya',
  'VAN': 'Van',
  'ELAZIG': 'Elazığ',
  'DENIZLI': 'Denizli',
  'SIVAS': 'Sivas',
  'ERZURUM': 'Erzurum',
  'KOCAELI': 'Kocaeli',
  'SAKARYA': 'Sakarya',
  'MANISA': 'Manisa',
  'BALIKESIR': 'Balıkesir',
  'KAHRAMANMARAS': 'Kahramanmaraş',
  'AYDIN': 'Aydın',
  'IZMIT': 'İzmit',
  'KIRIKKALE': 'Kırıkkale',
  'BATMAN': 'Batman',
  'USAK': 'Uşak',
  'KUTAHYA': 'Kütahya',
  'AFYON': 'Afyon',
  'BOLU': 'Bolu',
  'DUZCE': 'Düzce',
  'KARABUK': 'Karabük',
  'ZONGULDAK': 'Zonguldak',
  'BARTIN': 'Bartın',
  'KASTAMONU': 'Kastamonu',
  'CANKIRI': 'Çankırı',
  'SINOP': 'Sinop',
  'CORUM': 'Çorum',
  'AMASYA': 'Amasya',
  'TOKAT': 'Tokat',
  'YALOVA': 'Yalova',
  'BILECIK': 'Bilecik',
  'KIRKLARELI': 'Kırklareli',
  'EDIRNE': 'Edirne',
  'TEKIRDAG': 'Tekirdağ',
  'KIRSEHIR': 'Kırşehir',
  'NEVSEHIR': 'Nevşehir',
  'NIGDE': 'Niğde',
  'AKSARAY': 'Aksaray',
  'ARDAHAN': 'Ardahan',
  'ARTVIN': 'Artvin',
  'RIZE': 'Rize',
  'TRABZON': 'Trabzon',
  'GUMUSHANE': 'Gümüşhane',
  'BAYBURT': 'Bayburt',
  'HAKKARI': 'Hakkari',
  'SIRNAK': 'Şırnak',
  'MARDIN': 'Mardin',
  'SIRT': 'Siirt',
  'BITLIS': 'Bitlis',
  'MUS': 'Muş',
  'AGRI': 'Ağrı',
  'KARS': 'Kars',
  'IGDIR': 'Iğdır',
  'TUNCELI': 'Tunceli',
  'ERZINCAN': 'Erzincan',
  'BINGOL': 'Bingöl',
};

// İlçeler ve Mahalleler için özel sözlük
const DISTRICT_NAME_MAP: Record<string, string> = {
  // Almanya Berlin İlçeleri
  'MITTE': 'Mitte',
  'FRIEDRICHSHAIN-KREUZBERG': 'Friedrichshain-Kreuzberg',
  'PANKOW': 'Pankow',
  'CHARLOTTENBURG-WILMERSDORF': 'Charlottenburg-Wilmersdorf',
  'SPANDAU': 'Spandau',
  'STEGLITZ-ZEHLENDORF': 'Steglitz-Zehlendorf',
  'TEMPELHOF-SCHONEBERG': 'Tempelhof-Schöneberg',
  'NEUKOLLN': 'Neukölln',
  'TREPTOW-KOPENICK': 'Treptow-Köpenick',
  'MARZAHN-HELLERSDORF': 'Marzahn-Hellersdorf',
  'LICHTENBERG': 'Lichtenberg',
  'REINICKENDORF': 'Reinickendorf',

  // Türkiye Büyükşehir İlçeleri
  'KADIKOY': 'Kadıköy',
  'BEYKOZ': 'Beykoz',
  'KARTAL': 'Kartal',
  'MALTEPE': 'Maltepe',
  'PENDIK': 'Pendik',
  'SULTANBEYLI': 'Sultanbeyli',
  'TUZLA': 'Tuzla',
  'UMRANIYE': 'Ümraniye',
  'CEKMEKOY': 'Çekmeköy',
  'SILE': 'Şile',
  'BEYLIKDUZU': 'Beylikdüzü',
  'BUYUKCEKMECE': 'Büyükçekmece',
  'KUCUKCEKMECE': 'Küçükçekmece',
  'BASAKSEHIR': 'Başakşehir',
  'ARNAVUTKOY': 'Arnavutköy',
  'ESENYURT': 'Esenyurt',
  'BAGCILAR': 'Bağcılar',
  'GUNGOREN': 'Güngören',
  'BAHCELIEVLER': 'Bahçelievler',
  'KAGITHANE': 'Kağıthane',
  'SISLI': 'Şişli',
  'SARIYER': 'Sarıyer',
  'BESIKTAS': 'Beşiktaş',
  'BEYOGLU': 'Beyoğlu',
  'FATIH': 'Fatih',
  'EYUPSULTAN': 'Eyüpsultan',
  'BAYRAMPASA': 'Bayrampaşa',
  'ZEYTINBURNU': 'Zeytinburnu',
  'GAZIOSMANPASA': 'Gaziosmanpaşa',
  'ESKISEHIR': 'Eskişehir',
  'ALIAGA': 'Aliaga',
  'BERGAMA': 'Bergama',
  'KARSIYAKA': 'Karşıyaka',
  'KEMALPASA': 'Kemalpaşa',
  'MENDERES': 'Menderes',
  'MENEMEN': 'Menemen',
  'NARLIDERE': 'Narlidere',
  'SEFERIHISAR': 'Seferihisar',
  'TIRE': 'Tire',
  'TORBALI': 'Torbalı',
  'URLA': 'Urla',
  'BUCA': 'Buca',
  'BORNIOVA': 'Bornova',
  'KARABAGLAR': 'Karabağlar',
  'KONAK': 'Konak',
  'BALCOVA': 'Balçova',
  'CIGLI': 'Çiğli',
  'GAZIEMIR': 'Gaziemir',
};

const normalizeTR = (str: string) => {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/Î/g, 'I')
    .replace(/Â/g, 'A')
    .replace(/Û/g, 'U')
    .replace(/\s+/g, ' ') 
    .trim();
};

// Eğer hiçbir İngilizce kelime bulunamazsa, BÜYÜK HARF yerine Düzgün Formata çevirir (Title Case)
const toTitleCase = (str: string) => {
  return (str || '').replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};

const getCountryNameEn = (c: { UlkeAdi: string; UlkeAdiEn?: string }) => {
  const normalizedTr = normalizeTR(c.UlkeAdi);
  const normalizedEn = normalizeTR(c.UlkeAdiEn || '');

  // 1. Öncelik: Bizim tanımladığımız sözlükte (Map) eşleşme var mı?
  if (COUNTRY_NAME_MAP[normalizedTr]) return COUNTRY_NAME_MAP[normalizedTr];
  if (COUNTRY_NAME_MAP[normalizedEn]) return COUNTRY_NAME_MAP[normalizedEn];

  // 2. Sözlükte yoksa ve API bir İngilizce isim verdiyse (genelde büyük harf veriyor, onu Title Case yapalım)
  if (c.UlkeAdiEn && c.UlkeAdiEn.trim()) return toTitleCase(c.UlkeAdiEn);

  // 3. Hiçbiri yoksa Türkçe ismin harflerini Title Case yap
  return toTitleCase(c.UlkeAdi);
};

const getCityNameEn = (c: { SehirAdi: string; SehirAdiEn?: string }) => {
  const normalizedTr = normalizeTR(c.SehirAdi);
  const normalizedEn = normalizeTR(c.SehirAdiEn || '');

  if (CITY_NAME_MAP[normalizedTr]) return CITY_NAME_MAP[normalizedTr];
  if (CITY_NAME_MAP[normalizedEn]) return CITY_NAME_MAP[normalizedEn];

  if (c.SehirAdiEn && c.SehirAdiEn.trim()) return toTitleCase(c.SehirAdiEn);
  return toTitleCase(c.SehirAdi);
};

const getDistrictNameEn = (d: { IlceAdi: string; IlceAdiEn?: string }) => {
  const normalizedTr = normalizeTR(d.IlceAdi);
  const normalizedEn = normalizeTR(d.IlceAdiEn || '');

  if (DISTRICT_NAME_MAP[normalizedTr]) return DISTRICT_NAME_MAP[normalizedTr];
  if (DISTRICT_NAME_MAP[normalizedEn]) return DISTRICT_NAME_MAP[normalizedEn];

  if (d.IlceAdiEn && d.IlceAdiEn.trim()) return toTitleCase(d.IlceAdiEn);
  return toTitleCase(d.IlceAdi);
};

const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onSelectLocation, currentMode, currentCity, currentCountry, t }) => {
  const [activeTab, setActiveTab] = useState<'tr' | 'world'>(
    currentMode === 'manual' && currentCountry && currentCountry.toLowerCase() !== 'türkiye' ? 'world' : 'tr'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [worldCountryId, setWorldCountryId] = useState('');
  const [worldCityId, setWorldCityId] = useState('');
  const [worldDistrictId, setWorldDistrictId] = useState('');
  const [worldCountryName, setWorldCountryName] = useState(currentCountry && currentCountry.toLowerCase() !== 'türkiye' ? currentCountry : '');
  const [worldCountryNameEn, setWorldCountryNameEn] = useState('');
  const [worldCityName, setWorldCityName] = useState(currentCountry && currentCountry.toLowerCase() !== 'türkiye' ? (currentCity || '') : '');
  const [worldDistrictName, setWorldDistrictName] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  const [countries, setCountries] = useState<{ UlkeAdi: string, UlkeID: string, UlkeAdiEn?: string }[]>([]);
  const [cities, setCities] = useState<{ SehirAdi: string, SehirID: string, SehirAdiEn?: string }[]>([]);
  const [districts, setDistricts] = useState<{ IlceAdi: string, IlceID: string, IlceAdiEn?: string }[]>([]);
  const [loadingDrops, setLoadingDrops] = useState({ countries: false, cities: false, districts: false });
  const [dropError, setDropError] = useState('');

  useEffect(() => {
    if (activeTab === 'world' && countries.length === 0 && !loadingDrops.countries) {
      setLoadingDrops(p => ({ ...p, countries: true }));
      setDropError('');
      fetch("https://ezanvakti.emushaf.net/ulkeler")
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) {
            setCountries(d.sort((a: any, b: any) => getCountryNameEn(a).localeCompare(getCountryNameEn(b))));
          } else setDropError(t('error_data'));
        })
        .catch(() => setDropError(t('error_data')))
        .finally(() => setLoadingDrops(p => ({ ...p, countries: false })));
    }
  }, [activeTab]);

  useEffect(() => {
    if (worldCountryId && activeTab === 'world') {
      setLoadingDrops(p => ({ ...p, cities: true }));
      setCities([]);
      setDistricts([]);
      setWorldCityId('');
      setWorldDistrictId('');
      setDistrictSearch('');

      fetch(`https://ezanvakti.emushaf.net/sehirler?ulke=${worldCountryId}`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) {
            setCities(d);
            if (d.length === 1) {
              setWorldCityId(d[0].SehirID);
              setWorldCityName(getCityNameEn(d[0]));
            }
          }
        })
        .catch(e => console.error(e))
        .finally(() => setLoadingDrops(p => ({ ...p, cities: false })));
    }
  }, [worldCountryId, activeTab]);

  useEffect(() => {
    if (worldCityId && activeTab === 'world') {
      setLoadingDrops(p => ({ ...p, districts: true }));
      setDistricts([]);
      setWorldDistrictId('');
      setDistrictSearch('');

      fetch(`https://ezanvakti.emushaf.net/ilceler/${worldCityId}`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) {
            setDistricts(d);
            if (d.length === 1) {
              setWorldDistrictId(d[0].IlceID);
              setWorldDistrictName(getDistrictNameEn(d[0]));
            }
          }
        })
        .catch(e => console.error(e))
        .finally(() => setLoadingDrops(p => ({ ...p, districts: false })));
    }
  }, [worldCityId, activeTab]);

  const filteredCities = useMemo(() => {
    if (!searchTerm) return TURKEY_CITIES;
    const lower = searchTerm.toLocaleLowerCase('tr-TR');
    return TURKEY_CITIES.filter(c => c.name.toLocaleLowerCase('tr-TR').includes(lower));
  }, [searchTerm]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearch) return districts;
    const lower = districtSearch.toLocaleLowerCase('tr-TR');
    return districts.filter(d =>
      d.IlceAdi.toLocaleLowerCase('tr-TR').includes(lower) ||
      (d.IlceAdiEn && d.IlceAdiEn.toLocaleLowerCase('tr-TR').includes(lower)) ||
      (getDistrictNameEn(d).toLowerCase().includes(lower))
    );
  }, [districts, districtSearch]);

  if (!isOpen) return null;

  const handleAuto = () => {
    onSelectLocation('auto');
    onClose();
  };

  const handleManualTurkey = (city: typeof TURKEY_CITIES[0]) => {
    onSelectLocation('manual', {
      city: city.name,
      country: 'Türkiye',
      coords: { latitude: city.lat, longitude: city.lng }
    });
    onClose();
  };

  const handleManualWorld = () => {
    if (isGlobalSearch) {
      if (!worldCountryName || !worldCityName) return;
      onSelectLocation('manual', {
        city: worldCityName,
        country: worldCountryName,
        coords: { latitude: 0, longitude: 0 }
      });
      onClose();
      return;
    }

    if (!worldCountryId || !worldCityId || !worldDistrictId) return;
    onSelectLocation('manual', {
      city: worldDistrictName || worldCityName,
      country: worldCountryName,
      countryEn: worldCountryNameEn,
      ulkeId: worldCountryId,
      sehirId: worldCityId,
      ilceId: worldDistrictId,
      coords: { latitude: 0, longitude: 0 }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-4 bg-slate-50 border-b border-slate-100/50 sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-3 bg-white rounded-full shadow-sm border border-slate-200 active:bg-slate-100"
        >
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('select_location')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-10">
        {/* GPS Option */}
        <button
          onClick={handleAuto}
          className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 mb-6 transition-all ${currentMode === 'auto' ? 'border-primary bg-green-50 shadow-md' : 'border-slate-200 bg-white shadow-sm'}`}
        >
          <div className={`p-3 rounded-full ${currentMode === 'auto' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Navigation className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="font-bold text-xl text-slate-900">{t('auto_location')}</div>
            <div className="text-slate-500 text-sm mt-1">{t('find_my_location')}</div>
          </div>
          {currentMode === 'auto' && <div className="ml-auto text-primary font-bold">{t('selected')}</div>}
        </button>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-200 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('tr')}
            className={`flex-1 py-3 text-center rounded-lg font-bold text-sm transition-all ${activeTab === 'tr' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>
            Türkiye
          </button>
          <button
            onClick={() => setActiveTab('world')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-center rounded-lg font-bold text-sm transition-all ${activeTab === 'world' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>
            <Globe className="w-4 h-4" /> {t('global').toUpperCase()}
          </button>
        </div>

        {activeTab === 'tr' ? (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <input
                type="text"
                placeholder={`${t('search_city')}...`}
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-14 pr-4 text-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Cities List */}
            <div className="space-y-3">
              {filteredCities.map((city) => {
                const isSelected = currentMode === 'manual' && currentCity === city.name;
                return (
                  <button
                    key={city.name}
                    onClick={() => handleManualTurkey(city)}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl bg-white border transition-all active:scale-95 ${isSelected ? 'border-primary shadow-md ring-1 ring-primary' : 'border-slate-100 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-slate-300'}`} />
                      <span className={`text-xl font-bold ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{city.name}</span>
                    </div>
                  </button>
                );
              })}
              {filteredCities.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-lg">
                  {t('no_city_found')}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200">
            {dropError && <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">{dropError}</div>}

            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-900 font-bold">{t('source')}</span>
              <button
                onClick={() => setIsGlobalSearch(!isGlobalSearch)}
                className="text-primary text-sm font-bold underline"
              >
                {isGlobalSearch ? t('cancel') : t('global_search')}
              </button>
            </div>

            {isGlobalSearch ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-sm ml-1">{t('country_en')}</label>
                  <input
                    type="text"
                    placeholder={t('country_placeholder')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={worldCountryName}
                    onChange={(e) => {
                      setWorldCountryName(e.target.value);
                      setWorldCountryNameEn(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-sm ml-1">{t('city_en')}</label>
                  <input
                    type="text"
                    placeholder={t('city_placeholder')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={worldCityName}
                    onChange={(e) => setWorldCityName(e.target.value)}
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-blue-600 text-xs leading-relaxed">
                  {t('global_search_desc')}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-sm ml-1">{t('country_label')}</label>
                  <select
                    value={worldCountryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const c = countries.find(c => c.UlkeID === id);
                      setWorldCountryId(id);
                      setWorldCountryName(getCountryNameEn(c || { UlkeAdi: '', UlkeAdiEn: '' }));
                      setWorldCountryNameEn(getCountryNameEn(c || { UlkeAdi: '', UlkeAdiEn: '' }));
                    }}
                    disabled={loadingDrops.countries}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    <option value="">{t('select_location')}</option>
                    {loadingDrops.countries && <option value="">{t('loading')}...</option>}
                    {countries.map(c => (
                      <option key={c.UlkeID} value={c.UlkeID}>{getCountryNameEn(c)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-sm ml-1">{t('state_label')}</label>
                  <select
                    value={worldCityId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const city = cities.find(c => c.SehirID === id);
                      setWorldCityId(id);
                      setWorldCityName(city ? getCityNameEn(city) : '');
                    }}
                    disabled={!worldCountryId || loadingDrops.cities || cities.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    <option value="">{loadingDrops.cities ? `${t('loading')}...` : t('select_location')}</option>
                    {cities.map(city => (
                      <option key={city.SehirID} value={city.SehirID}>{getCityNameEn(city)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-sm ml-1">{t('city_label')}</label>
                  {districts.length > 10 && (
                    <div className="relative mb-2">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder={`${t('search_city')}...`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={districtSearch}
                        onChange={(e) => setDistrictSearch(e.target.value)}
                      />
                    </div>
                  )}
                  <select
                    value={worldDistrictId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const dist = districts.find(d => d.IlceID === id);
                      setWorldDistrictId(id);
                      setWorldDistrictName(dist ? getDistrictNameEn(dist) : '');
                    }}
                    disabled={!worldCityId || loadingDrops.districts || districts.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    <option value="">{loadingDrops.districts ? `${t('loading')}...` : t('select_location')}</option>
                    {filteredDistricts.map(dist => (
                      <option key={dist.IlceID} value={dist.IlceID}>{getDistrictNameEn(dist)}</option>
                    ))}
                  </select>
                  {filteredDistricts.length === 0 && districtSearch && (
                    <div className="text-xs text-red-400 mt-1">Sonuç bulunamadı.</div>
                  )}
                </div>
              </>
            )}

            <button
              onClick={handleManualWorld}
              disabled={isGlobalSearch ? (!worldCountryName || !worldCityName) : (!worldCountryId || !worldCityId || !worldDistrictId)}
              className="w-full mt-4 bg-primary hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl transition-all"
            >
              {t('save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationModal;