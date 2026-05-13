import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import DirectAlarm from '../services/directAlarm';
import { LANGUAGES } from '../translations';

interface WelcomeWarningProps {
  isVisible: boolean;
  onDismiss: () => void;
  onCardLanguageSelect?: (language: string) => void;
  getCardLanguage?: () => string;
  t: (key: string) => string;
}

const WelcomeWarning: React.FC<WelcomeWarningProps> = ({
  isVisible,
  onDismiss,
  onCardLanguageSelect,
  getCardLanguage,
  t
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('tr');

  if (!isVisible) return null;

  // Kart için kendi çeviri fonksiyonu - ana uygulama dilini kullanmaz
  const getCardTranslation = (key: string) => {
    const cardTranslations: Record<string, Record<string, string>> = {
      tr: {
        welcome_title: 'Ezan Vakti\'ne Hoş Geldiniz',
        welcome_subtitle: 'Arka planda alarm çalışması için önemli ayarlar',
        select_language: 'Dil Seçimi',
        overlay_permission_title: 'Otomatik Açılma İzni (Zorunlu)',
        overlay_permission_desc: 'Uygulama kapalıyken alarmın otomatik açılıp reklam gösterilebilmesi için "Diğer uygulamalar üzerinde görüntüleme" izni ZORUNLUDUR.',
        manual_warning: 'Xiaomi cihazlarda ayrıca "Kilit ekranında göster" ve "Arka planda çalışırken yeni pencere aç" izinlerini de MANUEL vermeniz gerekebilir.',
        how_to_enable: 'Nasıl Aktif Edilir',
        later: 'Sonra',
        understood: 'Anladım',
        open_settings: 'Ayarları Aç',
      },
      en: {
        welcome_title: 'Welcome to Ezan Vakti',
        welcome_subtitle: 'Important settings for background alarm functionality',
        select_language: 'Language Selection',
        overlay_permission_title: 'Auto-Open Permission (Mandatory)',
        overlay_permission_desc: 'For the alarm to open automatically when the app is closed, "Display over other apps" permission is MANDATORY.',
        manual_warning: 'On Xiaomi devices, you may also need to MANUALLY grant "Show on Lock screen" and "Start in background" permissions.',
        how_to_enable: 'How to Enable',
        step_go_settings: 'Go to Settings → Apps menu',
        step_find_app: 'Find Ezan Vakti app',
        step_enable_permission: 'Enable "Display on screen" permissions',
        later: 'Later',
        understood: 'Understood',
        open_settings: 'Open Settings',
      },
      de: {
        welcome_title: 'Willkommen bei Ezan Vakti',
        welcome_subtitle: 'Wichtige Einstellungen für Alarm-Funktion im Hintergrund',
        select_language: 'Sprachauswahl',
        overlay_permission_title: 'Bildschirmanzeigeberechtigungen erforderlich',
        overlay_permission_desc: 'Sie müssen Bildschirmanzeigeberechtigungen erteilen, damit die App den Alarmbildschirm im Hintergrund oder bei geschlossener App anzeigen kann.',
        manual_warning: 'Wenn Sie mit dem Button die richtige Einstellungsseite nicht erreichen können, müssen Sie sie manuell finden und öffnen, andernfalls öffnet sich die Gebetszeit-Seite nicht.',
        how_to_enable: 'Wie man aktiviert',
        step_go_settings: 'Gehen Sie zu Einstellungen → Apps-Menü',
        step_find_app: 'Finden Sie die Ezan Vakti App',
        step_enable_permission: 'Aktivieren Sie "Bildschirmanzeige" Berechtigungen',
        later: 'Später',
        understood: 'Verstanden',
        open_settings: 'Einstellungen Öffnen',
      },
      fr: {
        welcome_title: 'Bienvenue dans Ezan Vakti',
        welcome_subtitle: 'Paramètres importants pour la fonction d\'alarme en arrière-plan',
        select_language: 'Sélection de la langue',
        overlay_permission_title: 'Autorisations d\'affichage sur écran requises',
        overlay_permission_desc: 'Vous devez accorder des autorisations d\'affichage sur écran pour que l\'application puisse afficher l\'écran d\'alarme en arrière-plan ou lorsqu\'elle est fermée.',
        manual_warning: 'Si vous ne pouvez pas accéder à la bonne page de paramètres avec le bouton, vous devez la trouver et l\'ouvrir manuellement, sinon l\'écran des heures de prière ne s\'ouvrira pas.',
        how_to_enable: 'Comment activer',
        step_go_settings: 'Allez dans Paramètres → Menu Applications',
        step_find_app: 'Trouvez l\'application Ezan Vakti',
        step_enable_permission: 'Activez les autorisations "Affichage sur écran"',
        later: 'Plus tard',
        understood: 'Compris',
        open_settings: 'Ouvrir les Paramètres',
      },
      ar: {
        welcome_title: 'مرحباً بك في Ezan Vakti',
        welcome_subtitle: 'إعدادات هامة لعمل التنبيه في الخلفية',
        select_language: 'اختيار اللغة',
        overlay_permission_title: 'إذن العرض على الشاشة مطلوب',
        overlay_permission_desc: 'يجب منح إذن العرض على الشاشة للتطبيق ليتمكن من عرض شاشة التنبيه عندما يكون في الخلفية أو مغلق.',
        manual_warning: 'إذا لم تتمكن من الوصول إلى صفحة الإعدادات الصحيحة باستخدام الزر، يجب عليك العثور عليها وفتحها يدوياً، وإلا فلن تفتح شاشة أوقات الصلاة.',
        how_to_enable: 'كيفية التفعيل',
        step_go_settings: 'اذهب إلى الإعدادات → قائمة التطبيقات',
        step_find_app: 'ابحث عن تطبيق Ezan Vakti',
        step_enable_permission: 'فعّل إذن "العرض على الشاشة"',
        later: 'لاحقاً',
        understood: 'فهمت',
        open_settings: 'فتح الإعدادات',
      },
      ru: {
        welcome_title: 'Добро пожаловать в Ezan Vakti',
        welcome_subtitle: 'Важные настройки для работы будильника в фоновом режиме',
        select_language: 'Выбор языка',
        overlay_permission_title: 'Разрешения на отображение на экране требуются',
        overlay_permission_desc: 'Вы должны предоставить разрешения на отображение на экране, чтобы приложение могло показывать экран будильника в фоновом режиме или когда закрыто.',
        manual_warning: 'Если вы не можете перейти на правильную страницу настроек с помощью кнопки, вы должны найти и открыть ее вручную, иначе экран времени молитвы не откроется.',
        how_to_enable: 'Как включить',
        step_go_settings: 'Перейдите в Настройки → Приложения',
        step_find_app: 'Найдите приложение Ezan Vakti',
        step_enable_permission: 'Включите разрешения "Отображение на экране"',
        later: 'Позже',
        understood: 'Понятно',
        open_settings: 'Открыть Настройки',
      },
      id: {
        welcome_title: 'Selamat Datang di Ezan Vakti',
        welcome_subtitle: 'Pengaturan penting untuk fungsi alarm latar belakang',
        select_language: 'Pemilihan Bahasa',
        overlay_permission_title: 'Izin Tampil di Layar Diperlukan',
        overlay_permission_desc: 'Anda harus memberikan izin tampil di layar agar aplikasi dapat menampilkan layar alarm saat di latar belakang atau ditutup.',
        manual_warning: 'Jika Anda tidak dapat mencapai halaman pengaturan yang benar dengan tombol, Anda harus menemukan dan membukanya secara manual, jika tidak layar waktu sholat tidak akan terbuka.',
        how_to_enable: 'Cara Mengaktifkan',
        step_go_settings: 'Buka Pengaturan → Menu Aplikasi',
        step_find_app: 'Temukan aplikasi Ezan Vakti',
        step_enable_permission: 'Aktifkan izin "Tampil di layar"',
        later: 'Nanti',
        understood: 'Mengerti',
        open_settings: 'Buka Pengaturan',
      },
      uz: {
        welcome_title: 'Ezan Vakti\'ga xush kelibsiz',
        welcome_subtitle: 'Fon rejimida signal ishlashi uchun muhim sozlamalar',
        select_language: 'Til tanlash',
        overlay_permission_title: 'Ekranda ko\'rsatish ruxsati talab qilinadi',
        overlay_permission_desc: 'Ilova fon rejimida yoki yopiq bo\'lganda signal ekranini ko\'rsatishi uchun ekranda ko\'rsatish ruxsatlarini berishingiz kerak.',
        step_enable_permission: '"Ekranda ko\'rsatish" ruxsatlarini yoqing',
        step_go_settings: 'Sozlamalar → Ilovalar menyusiga o\'ting',
        step_find_app: 'Ezan Vakti ilovasini toping',
        later: 'Keyinroq',
        understood: 'Tushundim',
        open_settings: 'Sozlamalarni Ochish',
      },
      kz: {
        welcome_title: 'Ezan Vakti\'не қош келдіңіз',
        welcome_subtitle: 'Фондық ескерту жұмысы үшін маңызды параметрлер',
        select_language: 'Тіл таңдау',
        overlay_permission_title: 'Ekranda kөrsetu rұқsаты қажет',
        overlay_permission_desc: 'Қолданба фон режимінде немесе жабық кезінде ескерту экранын көрсетуі үшін еkranda көрсету рұқсаттарын беруіңіз керек.',
        step_enable_permission: '"Ekranda көрсету" рұқсаттарын қосыңыз',
        later: 'Кейін',
        understood: 'Түсіндім',
        open_settings: 'Параметрлерді Ашу',
      },
      az: {
        welcome_title: 'Ezan Vakti\'ə xoş gəldiniz',
        welcome_subtitle: 'Fon alarm funksiyası üçün vacib parametrlər',
        select_language: 'Dil seçimi',
        overlay_permission_title: 'Ekranda göstərmə icazəsi tələb olunur',
        overlay_permission_desc: 'Tətbiqin arxa planda və ya qapalı ikən alarm ekranını aça bilməsi üçün ekranda göstərmə icazələri verməlisiniz.',
        step_enable_permission: '"Ekranda göstərmə" icazələrini aç',
        step_go_settings: 'Parametrlər → Tətbiqlər menyusuna get',
        step_find_app: 'Ezan Vakti tətbiqini tap',
        later: 'Sonra',
        understood: 'Başa düşdüm',
        open_settings: 'Parametrləri Aç',
      },
      nl: {
        welcome_title: 'Welkom bij Ezan Vakti',
        welcome_subtitle: 'Belangrijke instellingen voor achtergrond alarmfunctionaliteit',
        select_language: 'Taalkeuze',
        overlay_permission_title: 'Schermweergave Toestemming Vereist',
        overlay_permission_desc: 'U moet schermweergave toestemming geven zodat de app het alarmscherm kan tonen wanneer in achtergrond of gesloten.',
        step_enable_permission: 'Activeer "Schermweergave" toestemming',
        later: 'Later',
        understood: 'Begrepen',
        open_settings: 'Instellingen Openen',
      },
      es: {
        welcome_title: 'Bienvenido a Ezan Vakti',
        welcome_subtitle: 'Configuraciones importantes para la funcionalidad de alarma en segundo plano',
        select_language: 'Selección de Idioma',
        overlay_permission_title: 'Permiso de Visualización en Pantalla Requerido',
        overlay_permission_desc: 'Debes conceder permisos de visualización en pantalla para que la app pueda mostrar la pantalla de alarma cuando esté en segundo plano o cerrada.',
        step_enable_permission: 'Activa los permisos "Visualización en pantalla"',
        step_go_settings: 'Ve a Configuración → Menú Aplicaciones',
        step_find_app: 'Busca la aplicación Ezan Vakti',
        later: 'Más tarde',
        understood: 'Entendido',
        open_settings: 'Abrir Configuración',
      }
    };

    return cardTranslations[selectedLanguage]?.[key] || cardTranslations['tr']?.[key] || key;
  };

  const handleCardLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    // Kartın kendi çevirisini güncelle - ana uygulamayı etkilemez
    // setSelectedLanguage zaten kart içi çevirileri güncelleyecek
  };

  const handleConfirmLanguage = () => {
    // Kart kapatılsın, dil seçimi ana uygulamaya gönderilsin
    onCardLanguageSelect?.(selectedLanguage);
    onDismiss();
  };

  const handleLater = () => {
    // Sonra butonuna basınca ana uygulama dilini değiştirme, sadece kapat
    onDismiss();
  };

  const handleOpenSettings = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // DirectAlarm plugin'i ile üreticiye özel izinler sayfasını aç
        await DirectAlarm.openAppPermissions();
      } catch (error) {
        console.warn('İzinler açılamadı:', error);
        // Alternatif: genel ayarlar sayfasını aç
        window.location.href = 'app-settings:';
      }
    } else {
      // Web platformunda ayarları aç
      window.open('app-settings:', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <button
              onClick={onDismiss}
              className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <h2 className="text-lg font-bold mb-1">{getCardTranslation('welcome_title')}</h2>
          <p className="text-sm text-white/90">{getCardTranslation('welcome_subtitle')}</p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Language Selection */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">{getCardTranslation('select_language')}</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleCardLanguageSelect(lang.code)}
                  className={`flex items-center gap-1 p-2 rounded-lg border transition-all text-xs ${
                    selectedLanguage === lang.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span className="font-medium leading-tight">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Overlay Permission Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 mb-1 text-sm">{getCardTranslation('overlay_permission_title')}</h4>
                <p className="text-xs text-amber-700 mb-2">{getCardTranslation('overlay_permission_desc')}</p>
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                  <p className="text-xs text-red-700 font-medium">⚠️ {getCardTranslation('manual_warning')}</p>
                </div>
                <div className="bg-white rounded p-2 border border-amber-200">
                  <p className="text-xs text-amber-600 font-medium mb-1">{getCardTranslation('how_to_enable')}:</p>
                  <ol className="text-xs text-amber-700 space-y-0.5">
                    <li>1. {getCardTranslation('step_go_settings')}</li>
                    <li>2. {getCardTranslation('step_find_app')}</li>
                    <li>3. {getCardTranslation('step_enable_permission')}</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleLater}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm"
            >
              {getCardTranslation('later')}
            </button>
            <button
              onClick={handleOpenSettings}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
            >
              {getCardTranslation('open_settings')}
            </button>
            <button
              onClick={handleConfirmLanguage}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
            >
              {getCardTranslation('understood')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeWarning;
