import React, { useRef, useEffect, useState } from 'react';
import { AppSettings, PrayerKeys, PrayerName, PrayerData } from '../types';
import { ArrowLeft, Info, Smartphone, Check, Sun, Moon, Sunrise, Sunset, CheckCircle, MapPin, Plus, Minus, Music, Bell, Upload, FileAudio, Power, BellOff, ShieldCheck, RefreshCw, Clock, Globe, Shield, Battery, Compass } from 'lucide-react';
import { SOUND_BEEP, SOUND_EZAN, ADMOB_IDS, CALCULATION_METHODS } from '../constants';
import PurchaseService from '../services/purchaseService';
import AdBanner from './AdBanner';
import { LANGUAGES } from '../translations';
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    onOpenLocationSelect: () => void;
    onShowWelcomeWarning: () => void;
    onOpenQiblaFinder: () => void;
    currentCityName?: string;
    prayerData: PrayerData | null;
    t: (key: string) => string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings, onOpenLocationSelect, onShowWelcomeWarning, onOpenQiblaFinder, currentCityName, prayerData, t }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [holdingButtons, setHoldingButtons] = useState<Record<string, boolean>>({});
    const [editingPrayer, setEditingPrayer] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const editInputRef = useRef<HTMLInputElement>(null);

    const settingsRef = useRef(settings);
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    const activeTimersRef = useRef<Record<string, { interval?: any, timeout?: any }>>({});

    const playPreview = (type: string, volume: number, base64?: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        let src = '';
        if (type === 'ezan') src = SOUND_EZAN;
        else if (type === 'beep') src = SOUND_BEEP;
        else if (type === 'custom' && base64) src = base64;
        else if (type === 'custom' && settings.customSoundSource) src = settings.customSoundSource;

        if (src) {
            const audio = new Audio(src);
            audio.volume = volume;
            audio.play().catch(err => console.warn("[Settings] Ses çalınamadı:", err));
            audioRef.current = audio;
            setTimeout(() => {
                if (audioRef.current === audio) audio.pause();
            }, 5000);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        onUpdateSettings({ ...settings, volume: val });
        playPreview(settings.soundType, val);
    };

    const handleSoundTypeChange = (type: 'ezan' | 'beep' | 'custom') => {
        onUpdateSettings({ ...settings, soundType: type });
        playPreview(type, settings.volume);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                onUpdateSettings({ ...settings, soundType: 'custom', customSoundSource: base64, customSoundName: file.name });
                playPreview('custom', settings.volume, base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleLocationMode = () => { onUpdateSettings({ ...settings, locationMode: settings.locationMode === 'auto' ? 'manual' : 'auto' }); };
    const toggleVibration = () => { onUpdateSettings({ ...settings, vibrationEnabled: !settings.vibrationEnabled }); };
    const toggleNotifications = () => { onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled }); };
    const toggleBackgroundOptimization = () => { onUpdateSettings({ ...settings, preventBackgroundOptimization: !settings.preventBackgroundOptimization }); };

    const handleRemoveAds = async () => {
        const success = await PurchaseService.purchaseRemoveAds();
        if (success) { onUpdateSettings({ ...settings, isPremium: true }); alert(t('purchase_success')); }
    };
    const handleRestorePurchases = async () => {
        const success = await PurchaseService.restorePurchases();
        if (success) { onUpdateSettings({ ...settings, isPremium: true }); alert(t('restore_success')); }
        else { alert(t('restore_not_found')); }
    };

    if (!isOpen) return null;

    const stopHolding = (key: string, direction: 'increase' | 'decrease') => {
        const id = `${key}-${direction}`;
        const timers = activeTimersRef.current[id];
        if (timers) {
            if (timers.timeout) clearTimeout(timers.timeout);
            if (timers.interval) clearInterval(timers.interval);
            delete activeTimersRef.current[id];
        }
        setHoldingButtons(prev => { const next = { ...prev }; delete next[id]; return next; });
    };

    const startHolding = (key: string, direction: 'increase' | 'decrease') => {
        const id = `${key}-${direction}`;
        stopHolding(key, direction);
        setHoldingButtons(prev => ({ ...prev, [id]: true }));
        const step = direction === 'increase' ? 1 : -1;
        const timeout = setTimeout(() => {
            if (!activeTimersRef.current[id]) return;
            const interval = setInterval(() => {
                const currentSettings = settingsRef.current;
                if (!currentSettings || !currentSettings.prayerReminders) return;
                const currentMinutes = currentSettings.prayerReminders[key] || 0;
                const newMinutes = Math.max(0, currentMinutes + step);
                if (newMinutes !== currentMinutes) {
                    onUpdateSettings({ ...currentSettings, prayerReminders: { ...currentSettings.prayerReminders, [key]: newMinutes } });
                }
            }, 70);
            if (activeTimersRef.current[id]) { activeTimersRef.current[id].interval = interval; }
            else { clearInterval(interval); }
        }, 300);
        activeTimersRef.current[id] = { timeout };
    };

    const handleQuickAdjust = (key: string, direction: 'increase' | 'decrease') => {
        const step = direction === 'increase' ? 1 : -1;
        const currentMinutes = settings.prayerReminders[key] || 0;
        const newMinutes = Math.max(0, currentMinutes + step);
        if (newMinutes !== currentMinutes) {
            onUpdateSettings({ ...settings, prayerReminders: { ...settings.prayerReminders, [key]: newMinutes } });
        }
    };

    const getPrayerIcon = (key: string) => {
        switch (key) {
            case 'imsak': return <Sunrise className="w-4 h-4 text-orange-400" />;
            case 'gunes': return <Sun className="w-4 h-4 text-yellow-500" />;
            case 'ogle': return <Sun className="w-4 h-4 text-orange-500" />;
            case 'ikindi': return <Sun className="w-4 h-4 text-orange-600" />;
            case 'aksam': return <Sunset className="w-4 h-4 text-red-500" />;
            case 'yatsi': return <Moon className="w-4 h-4 text-indigo-400" />;
            default: return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    const getPrayerLabel = (key: string) => {
        return t(key);
    };

    /* ── Ortak stil parçaları ── */
    const sectionLabel = "text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1";
    const card = "bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-hidden";
    const row = "flex items-center gap-3 px-4 py-4";
    const divider = "h-px bg-slate-50 mx-4";
    const iconBox = (color: string) => `w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`;
    const toggle = (on: boolean) =>
        `w-14 h-7 rounded-full relative transition-all duration-300 ${on ? 'bg-green-500' : 'bg-slate-200'}`;
    const toggleKnob = (on: boolean) =>
        `absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 flex items-center justify-center ${on ? 'left-7' : 'left-0.5'}`;

    return (
        <div className="fixed inset-0 z-[50] flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
            {/* ── Header ── */}
            <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                <button onClick={onClose} className="p-2 -ml-1 hover:bg-slate-50 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-800" />
                </button>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('settings')}</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

                {/* ── Dil ── */}
                <p className={sectionLabel}>{t('language').toLocaleUpperCase(settings.language || 'tr')}</p>
                <div className={card}>
                    <div className={row}>
                        <div className={iconBox('bg-amber-100 text-amber-600')}>
                            <Globe className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('language')}</div>
                            <div className="text-slate-400 text-sm">{t('app_settings')}</div>
                        </div>
                        <select
                            value={settings.language || 'tr'}
                            onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value as any })}
                            className="bg-slate-100 border-0 rounded-xl py-2 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[140px] appearance-none pr-7 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Konum ── */}
                <p className={`${sectionLabel} pt-2`}>{t('location').toLocaleUpperCase(settings.language || 'tr')}</p>
                <div className={card}>
                    <div
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => onOpenLocationSelect(), 100); }}
                        className={`${row} cursor-pointer active:bg-slate-50`}
                    >
                        <div className={iconBox('bg-blue-100 text-blue-600')}>
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base truncate">{currentCityName || t('location_not_selected')}</div>
                            <div className="text-slate-400 text-sm">{settings.locationMode === 'auto' ? t('auto_location') : t('manual_location')}</div>
                        </div>
                        <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-semibold text-sm shrink-0">{t('update')}</div>
                    </div>

                    {prayerData?.source && (
                        <>
                            <div className={divider} />
                            <div className="flex items-start gap-2 px-4 py-3">
                                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-slate-400 leading-relaxed">
                                    {t('data_source')}: <span className="text-slate-600 font-medium">
                                        {prayerData.source.includes('Diyanet') ? t('source_desc') : prayerData.source}
                                    </span> · {t('calendar_compliance')}
                                </div>
                            </div>
                        </>
                    )}

                    <div className={divider} />
                    <div className="flex items-start gap-2 bg-amber-50 mx-3 my-3 rounded-xl px-3 py-2.5">
                        <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">{t('location_deviation_note')}</p>
                    </div>

                    <div className={divider} />

                    {/* Qibla Finder */}
                    <div
                        onClick={(e) => { 
                            console.log('[SettingsModal] Qibla button clicked'); 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            onOpenQiblaFinder(); 
                        }}
                        className={`${row} cursor-pointer active:bg-slate-50`}
                    >
                        <div className={iconBox('bg-green-100 text-green-600')}>
                            <Compass className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('qibla_finder')}</div>
                            <div className="text-slate-400 text-sm">{t('qibla_direction')}</div>
                        </div>
                        <div className="bg-green-100 text-green-600 px-3 py-1.5 rounded-lg font-semibold text-sm shrink-0">{t('qibla_compass')}</div>
                    </div>
                </div>

                {/* ── Bildirimler ── */}
                <p className={`${sectionLabel} pt-2`}>{t('notifications').toLocaleUpperCase(settings.language || 'tr')}</p>
                <div className={card}>
                    {/* Master switch */}
                    <div onClick={toggleNotifications} className={`${row} cursor-pointer active:bg-slate-50`}>
                        <div className={iconBox(settings.notificationsEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500')}>
                            {settings.notificationsEnabled ? <Power className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('notifications')}</div>
                            <div className="text-slate-400 text-sm truncate">
                                {settings.notificationsEnabled
                                    ? (settings.soundType === 'ezan' ? t('ezan_sound_active') : settings.soundType === 'beep' ? t('beep_sound_active') : t('custom_sound_active'))
                                    : t('notifications_disabled')}
                            </div>
                        </div>
                        <div className={toggle(settings.notificationsEnabled)}>
                            <div className={toggleKnob(settings.notificationsEnabled)}>
                                {settings.notificationsEnabled && <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={3} />}
                            </div>
                        </div>
                    </div>

                    <div className={divider} />

                    {/* Arka Plan Optimizasyonu */}
                    <div onClick={toggleBackgroundOptimization} className={`${row} cursor-pointer active:bg-slate-50`}>
                        <div className={iconBox(settings.preventBackgroundOptimization ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400')}>
                            <Battery className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('background_properties')}</div>
                            <div className="text-slate-400 text-sm">
                                {settings.preventBackgroundOptimization ? 
                                    t('continue_when_not_used') : 
                                    t('prevent_background_stop')
                                }
                            </div>
                        </div>
                        <div className={toggle(settings.preventBackgroundOptimization)}>
                            <div className={toggleKnob(settings.preventBackgroundOptimization)}>
                                {settings.preventBackgroundOptimization && <Check className="w-3.5 h-3.5 text-orange-500" strokeWidth={3} />}
                            </div>
                        </div>
                    </div>

                    <div className={divider} />

                    {/* Overlay izni */}
                    <div onClick={onShowWelcomeWarning} className={`${row} cursor-pointer active:bg-slate-50`}>
                        <div className={iconBox('bg-amber-100 text-amber-600')}>
                            <Info className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('overlay_permission_info_title')}</div>
                            <div className="text-slate-400 text-sm">{t('overlay_permission_info_desc')}</div>
                        </div>
                        <div className="bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg font-semibold text-sm shrink-0">{t('overlay_permission_view')}</div>
                    </div>

                    <div className={divider} />

                    {/* Titreşim */}
                    <div
                        onClick={toggleVibration}
                        className={`${row} cursor-pointer active:bg-slate-50 ${!settings.notificationsEnabled ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                        <div className={iconBox(settings.vibrationEnabled ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400')}>
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('vibration')}</div>
                            <div className="text-slate-400 text-sm">{settings.vibrationEnabled ? t('vibration_enabled') : t('vibration_disabled')}</div>
                        </div>
                        <div className={toggle(settings.vibrationEnabled)}>
                            <div className={toggleKnob(settings.vibrationEnabled)}>
                                {settings.vibrationEnabled && <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={3} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Premium ── */}
                <p className={`${sectionLabel} pt-2`}>{t('premium_title').toLocaleUpperCase(settings.language || 'tr')}</p>
                <div className={card}>
                    <div className={row}>
                        <div className={iconBox(settings.isPremium ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600')}>
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('premium_title')}</div>
                            <div className="text-slate-400 text-sm">{settings.isPremium ? t('premium_active') : t('premium_desc')}</div>
                        </div>
                        {!settings.isPremium ? (
                            <button onClick={handleRemoveAds} className="bg-amber-500 active:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-md shadow-amber-200 shrink-0">
                                {t('buy')}
                            </button>
                        ) : (
                            <div className="bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-1 shrink-0">
                                <Check className="w-4 h-4" /> {t('save')}
                            </div>
                        )}
                    </div>

                    {!settings.isPremium && (
                        <>
                            <div className={divider} />
                            <button onClick={handleRestorePurchases} className="w-full py-3 text-slate-400 text-sm font-medium flex items-center justify-center gap-2 active:text-slate-600 transition-colors">
                                <RefreshCw className="w-4 h-4" /> {t('restore_purchase')}
                            </button>
                        </>
                    )}
                </div>

                {/* ── Görünüm & Format ── */}
                <p className={`${sectionLabel} pt-2`}>{t('appearance_format').toLocaleUpperCase(settings.language || 'tr')}</p>
                <div className={card}>
                    {/* Saat formatı */}
                    <div className={row}>
                        <div className={iconBox('bg-indigo-100 text-indigo-600')}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-base">{t('time_format')}</div>
                            <div className="text-slate-400 text-sm">{settings.timeFormat === '12h' ? t('time_format_12h') : t('time_format_24h')}</div>
                        </div>
                        <div className="flex bg-slate-100 rounded-xl p-0.5 shrink-0">
                            <button
                                onClick={() => onUpdateSettings({ ...settings, timeFormat: '24h' })}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${(!settings.timeFormat || settings.timeFormat === '24h') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                {t('symbol_24h')}
                            </button>
                            <button
                                onClick={() => onUpdateSettings({ ...settings, timeFormat: '12h' })}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${settings.timeFormat === '12h' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                {t('symbol_12h')}
                            </button>
                        </div>
                    </div>

                    <div className={divider} />

                    {/* Hesaplama yöntemi */}
                    <div className="px-4 py-3 space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className={iconBox('bg-blue-50 text-blue-600')}>
                                <Globe className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 text-base">{t('calculation_method')}</div>
                                <div className="text-slate-400 text-sm leading-tight">{t('calculation_method_desc')}</div>
                            </div>
                        </div>
                        <select
                            value={settings.calculationMethod || 13}
                            onChange={(e) => {
                                const newMethod = parseInt(e.target.value);
                                onUpdateSettings({ ...settings, calculationMethod: newMethod, manualCalculationMethod: true });
                                localStorage.setItem('ezan_manual_method_selected', 'true');
                            }}
                            className="w-full bg-slate-100 border-0 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            {CALCULATION_METHODS.map(m => (
                                <option key={m.id} value={m.id}>{t(`method_${m.id}`)}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-slate-400 italic px-1">{t('calculation_method_note')}</p>
                    </div>
                </div>

                {/* ── Ses ── */}
                <p className={`${sectionLabel} pt-2`}>{t('sound_alarm').toLocaleUpperCase(settings.language || 'tr')}</p>
                <div className={card}>
                    <div className="px-4 pt-3 pb-2 space-y-2.5">
                        {/* Ezan */}
                        <button
                            onClick={() => handleSoundTypeChange('ezan')}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${settings.soundType === 'ezan' ? 'border-green-400 bg-green-50' : 'border-slate-100 bg-slate-50'}`}
                        >
                            <Music className={`w-5 h-5 shrink-0 ${settings.soundType === 'ezan' ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className={`font-semibold text-base flex-1 text-left ${settings.soundType === 'ezan' ? 'text-green-800' : 'text-slate-600'}`}>{t('ezan_sound')}</span>
                            {settings.soundType === 'ezan' && <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
                        </button>

                        {/* Beep */}
                        <button
                            onClick={() => handleSoundTypeChange('beep')}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${settings.soundType === 'beep' ? 'border-green-400 bg-green-50' : 'border-slate-100 bg-slate-50'}`}
                        >
                            <Bell className={`w-5 h-5 shrink-0 ${settings.soundType === 'beep' ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className={`font-semibold text-base flex-1 text-left ${settings.soundType === 'beep' ? 'text-green-800' : 'text-slate-600'}`}>{t('beep_sound')}</span>
                            {settings.soundType === 'beep' && <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />}
                        </button>

                        {/* Custom */}
                        <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${settings.soundType === 'custom' ? 'border-green-400 bg-green-50' : 'border-slate-100 bg-slate-50'}`}>
                            <FileAudio className={`w-5 h-5 shrink-0 ${settings.soundType === 'custom' ? 'text-green-600' : 'text-slate-400'}`} />
                            <div className="flex flex-col flex-1 min-w-0 text-left">
                                <span className={`font-semibold text-base ${settings.soundType === 'custom' ? 'text-green-800' : 'text-slate-600'}`}>{t('custom_sound')}</span>
                                {settings.customSoundName && <span className="text-xs text-slate-400 truncate">{settings.customSoundName}</span>}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 active:bg-slate-100 shrink-0"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Namaz Hatırlatıcıları ── */}
                <p className={`${sectionLabel} pt-2`}>{t('prayer_reminders').toLocaleUpperCase(settings.language || 'tr')}</p>
                <div className={card}>
                    {PrayerKeys.map((key, idx) => (
                        <React.Fragment key={key}>
                            {idx > 0 && <div className={divider} />}
                            <div className="flex items-center gap-3 px-4 py-3">
                                {/* İkon + İsim */}
                                <div className="flex items-center gap-2.5 w-[90px] shrink-0">
                                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center">
                                        {getPrayerIcon(key)}
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">{getPrayerLabel(key)}</span>
                                </div>

                                {/* Stepper */}
                                <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 ml-auto">
                                    <button
                                        onMouseDown={() => {
                                            handleQuickAdjust(key, 'decrease');
                                            startHolding(key, 'decrease');
                                            const cleanup = () => { stopHolding(key, 'decrease'); window.removeEventListener('mouseup', cleanup); };
                                            window.addEventListener('mouseup', cleanup);
                                        }}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                            handleQuickAdjust(key, 'decrease');
                                            startHolding(key, 'decrease');
                                            const cleanup = () => { stopHolding(key, 'decrease'); window.removeEventListener('touchend', cleanup); window.removeEventListener('touchcancel', cleanup); };
                                            window.addEventListener('touchend', cleanup);
                                            window.addEventListener('touchcancel', cleanup);
                                        }}
                                        className={`w-11 h-11 rounded-xl font-medium transition-all flex items-center justify-center ${(settings.prayerReminders[key] || 0) > 0 ? 'bg-white text-red-500 shadow-sm active:bg-red-50' : 'bg-slate-200 text-slate-300'}`}
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>

                                    <div
                                        className="w-[90px] text-center cursor-pointer px-1"
                                        onClick={() => {
                                            setEditingPrayer(key);
                                            setEditValue(String(settings.prayerReminders[key] || 0));
                                            setTimeout(() => editInputRef.current?.focus(), 50);
                                        }}
                                    >
                                        {editingPrayer === key ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <input
                                                    ref={editInputRef}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    value={editValue}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || /^\d{1,3}$/.test(val)) setEditValue(val);
                                                    }}
                                                    onBlur={() => {
                                                        const num = Math.max(0, parseInt(editValue) || 0);
                                                        onUpdateSettings({ ...settings, prayerReminders: { ...settings.prayerReminders, [key]: num } });
                                                        setEditingPrayer(null);
                                                    }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                    className="w-12 text-center font-bold text-slate-800 text-sm bg-white border-2 border-blue-400 rounded-lg py-1 outline-none"
                                                />
                                                <span className="text-[10px] text-slate-400">{t('dk_kala_display')}</span>
                                            </div>
                                        ) : (
                                            <div className="font-bold text-slate-700 text-sm active:bg-slate-200 rounded-lg py-1 transition-colors">
                                                {(settings.prayerReminders[key] || 0) === 0
                                                    ? <span className="text-slate-400">{t('tam_vakti')}</span>
                                                    : `${settings.prayerReminders[key]} ${t('dk_kala_display')}`}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onMouseDown={() => {
                                            handleQuickAdjust(key, 'increase');
                                            startHolding(key, 'increase');
                                            const cleanup = () => { stopHolding(key, 'increase'); window.removeEventListener('mouseup', cleanup); };
                                            window.addEventListener('mouseup', cleanup);
                                        }}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                            handleQuickAdjust(key, 'increase');
                                            startHolding(key, 'increase');
                                            const cleanup = () => { stopHolding(key, 'increase'); window.removeEventListener('touchend', cleanup); window.removeEventListener('touchcancel', cleanup); };
                                            window.addEventListener('touchend', cleanup);
                                            window.addEventListener('touchcancel', cleanup);
                                        }}
                                        className="w-11 h-11 rounded-xl font-medium transition-all flex items-center justify-center bg-white text-green-500 shadow-sm active:bg-green-50"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                {/* ── GDPR Gizlilik ── */}
                {!settings.isPremium && Capacitor.isNativePlatform() && (
                    <div className={`${card} mt-2`}>
                        <button
                            onClick={async () => {
                                try {
                                    await AdMob.showPrivacyOptionsForm();
                                } catch (e) {
                                    try {
                                        const consentInfo = await AdMob.requestConsentInfo();
                                        if (consentInfo.isConsentFormAvailable) await AdMob.showConsentForm();
                                        else alert(t('privacy_settings_not_available'));
                                    } catch (err) {
                                        console.error('[AdMob] Consent akışı da başarısız:', err);
                                    }
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3.5 text-slate-400 text-sm font-medium active:text-slate-600 active:bg-slate-50 rounded-2xl transition-colors"
                        >
                            <Shield className="w-4 h-4" />
                            {t('manage_privacy_preferences')}
                        </button>
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="text-center text-slate-300 text-xs pt-2 pb-4 space-y-0.5">
                    <p>© 2026 VILLAGESTUDIOTR — All Rights Reserved</p>
                </div>

                <AdBanner
                    adUnitId={ADMOB_IDS.BANNER_SETTINGS}
                    className="mt-1"
                    hideAds={settings.isPremium}
                />
            </div>
        </div>
    );
};

export default SettingsModal;
