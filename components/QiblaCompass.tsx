import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface QiblaCompassProps {
    isOpen: boolean;
    onClose: () => void;
    t: (key: string) => string;
}

// Kaaba (Mecca) precise coordinates
const KAABA_LAT = 21.422510;
const KAABA_LNG = 39.826160;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Great-circle initial bearing from (lat,lng) to Kaaba.
 * Returns 0-360° clockwise from true north.
 */
const calcQiblaBearing = (lat: number, lng: number): number => {
    const φ1 = toRad(lat);
    const φ2 = toRad(KAABA_LAT);
    const Δλ = toRad(KAABA_LNG - lng);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/**
 * Convert raw DeviceOrientationEvent (alpha/beta/gamma) + screen orientation
 * to compass heading (degrees clockwise from true north), with:
 *  - iOS:     uses webkitCompassHeading (already true north, screen-adjusted)
 *  - Android: uses tilt-compensated rotation-matrix approach on absolute alpha
 *
 * Reference: https://w3c.github.io/deviceorientation/#worked-example
 */
const getCompassHeading = (
    event: DeviceOrientationEvent,
    isAbsolute: boolean
): number | null => {

    // ── iOS path ────────────────────────────────────────────────────────────
    const wkh = (event as any).webkitCompassHeading as number | undefined;
    if (wkh !== undefined && wkh !== null && !isNaN(wkh)) {
        // webkitCompassHeading is already compensated for screen orientation
        // and gives true north heading.
        return wkh;
    }

    // ── Android / generic path ───────────────────────────────────────────────
    if (!isAbsolute) return null; // Reject non-absolute events (unreliable)
    if (event.alpha === null || event.beta === null || event.gamma === null) return null;

    const alpha = toRad(event.alpha);   // rotation around Z (yaw)
    const beta = toRad(event.beta);    // rotation around X (pitch)
    const gamma = toRad(event.gamma);   // rotation around Y (roll)

    // Tilt-compensated heading using the W3C rotation matrix method.
    // This projects the device's "up" vector onto the horizontal plane
    // and measures its bearing from geographic north.
    const sinAlpha = Math.sin(alpha), cosAlpha = Math.cos(alpha);
    const sinBeta = Math.sin(beta), cosBeta = Math.cos(beta);
    const sinGamma = Math.sin(gamma), cosGamma = Math.cos(gamma);

    // Components of the gravity vector in device frame (approx)
    // These are the last column of the ZXY rotation matrix:
    const Rx = -cosAlpha * sinGamma - sinAlpha * sinBeta * cosGamma;
    const Ry = -sinAlpha * sinGamma + cosAlpha * sinBeta * cosGamma;

    let heading = toDeg(Math.atan2(Rx, Ry));
    heading = (heading + 360) % 360;

    // Correct for screen orientation (landscape etc.)
    const screenAngle: number =
        (window.screen?.orientation?.angle) ??
        (typeof window.orientation === 'number' ? window.orientation : 0);

    heading = (heading - screenAngle + 360) % 360;

    return heading;
};

/**
 * Low-pass filter that handles 0/360 wrap-around correctly.
 */
const smoothAngle = (current: number, target: number, k: number): number => {
    let diff = target - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (current + diff * k + 360) % 360;
};

// ─────────────────────────────────────────────────────────────────────────────

const QiblaCompass: React.FC<QiblaCompassProps> = ({ isOpen, onClose, t }) => {

    const [displayHeading, setDisplayHeading] = useState(0);
    const [qiblaBearing, setQiblaBearing] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accuracy, setAccuracy] = useState<'high' | 'medium' | 'low' | null>(null);
    const [sensorReady, setSensorReady] = useState(false);

    const rawHeadingRef = useRef(0);
    const smoothedRef = useRef(0);
    const animFrameRef = useRef(0);
    const absHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
    const relHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
    const usingAbsRef = useRef(false);
    const mountedRef = useRef(false);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        cancelAnimationFrame(animFrameRef.current);
        if (absHandlerRef.current) {
            window.removeEventListener(
                'deviceorientationabsolute',
                absHandlerRef.current as EventListener
            );
            absHandlerRef.current = null;
        }
        if (relHandlerRef.current) {
            window.removeEventListener('deviceorientation', relHandlerRef.current);
            relHandlerRef.current = null;
        }
    }, []);

    // ── Smooth animation loop ─────────────────────────────────────────────────
    const startAnimation = useCallback(() => {
        const tick = () => {
            smoothedRef.current = smoothAngle(smoothedRef.current, rawHeadingRef.current, 0.12);
            setDisplayHeading(smoothedRef.current);
            animFrameRef.current = requestAnimationFrame(tick);
        };
        animFrameRef.current = requestAnimationFrame(tick);
    }, []);

    // ── Sensor handler ────────────────────────────────────────────────────────
    const makeHandler = useCallback((isAbsolute: boolean) =>
        (event: DeviceOrientationEvent) => {
            if (!mountedRef.current) return;

            // If we already have absolute data, ignore the regular event
            if (!isAbsolute && usingAbsRef.current) return;
            if (isAbsolute) usingAbsRef.current = true;

            const h = getCompassHeading(event, isAbsolute);
            if (h === null) return;

            rawHeadingRef.current = h;

            // Accuracy estimation
            const wkAcc = (event as any).webkitCompassAccuracy as number | undefined;
            if (wkAcc !== undefined && wkAcc >= 0) {
                setAccuracy(wkAcc < 15 ? 'high' : wkAcc < 35 ? 'medium' : 'low');
            } else {
                setAccuracy(isAbsolute ? 'high' : 'medium');
            }

            if (mountedRef.current) {
                setSensorReady(true);
                setLoading(false);
            }
        },
        []);

    // ── Main init ─────────────────────────────────────────────────────────────
    const initialize = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSensorReady(false);
        usingAbsRef.current = false;

        // 1. iOS permission
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const res = await (DeviceOrientationEvent as any).requestPermission();
                if (res !== 'granted') {
                    setError(t('qibla_permission_needed'));
                    setLoading(false);
                    return;
                }
            } catch {
                setError(t('qibla_permission_needed'));
                setLoading(false);
                return;
            }
        }

        // 2. Geolocation (Capacitor native → browser fallback)
        try {
            let lat: number, lng: number;

            if (Capacitor.isNativePlatform()) {
                const pos = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true, timeout: 15000
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } else {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true, timeout: 15000, maximumAge: 300000
                    })
                );
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            }

            const bearing = calcQiblaBearing(lat, lng);
            setQiblaBearing(bearing);
        } catch {
            setError(t('qibla_error'));
            setLoading(false);
            return;
        }

        // 3. Register orientation listeners
        const absHandler = makeHandler(true);
        const relHandler = makeHandler(false);
        absHandlerRef.current = absHandler;
        relHandlerRef.current = relHandler;

        window.addEventListener(
            'deviceorientationabsolute',
            absHandler as EventListener,
            true
        );
        window.addEventListener('deviceorientation', relHandler, true);

        // 4. Start render loop
        startAnimation();

        // 5. Sensor timeout (3 s)
        setTimeout(() => {
            if (mountedRef.current && !usingAbsRef.current) {
                setLoading(prev => {
                    if (prev) { setError(t('qibla_error')); return false; }
                    return prev;
                });
            }
        }, 3000);

    }, [makeHandler, startAnimation, t]);

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    useEffect(() => {
        mountedRef.current = isOpen;
        if (isOpen) {
            initialize();
        }
        return () => {
            mountedRef.current = false;
            cleanup();
        };
    }, [isOpen, initialize, cleanup]);

    if (!isOpen) return null;

    // Arrow pointing from device's current direction to qibla
    const needleAngle = (qiblaBearing - displayHeading + 360) % 360;
    const compassRotate = -displayHeading;

    const accColor = accuracy === 'high' ? '#22c55e'
        : accuracy === 'medium' ? '#f59e0b'
            : '#ef4444';
    const accDots = accuracy === 'high' ? '●●●'
        : accuracy === 'medium' ? '●●○'
            : '●○○';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
                <button onClick={onClose} style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    borderRadius: 12, padding: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                }}>
                    <ArrowLeft style={{ width: 24, height: 24, color: '#e2e8f0' }} />
                </button>
                <h2 style={{
                    color: '#f1f5f9', fontSize: 20, fontWeight: 800,
                    margin: 0, letterSpacing: '-0.02em', flex: 1,
                }}>{t('qibla_finder')}</h2>

                {sensorReady && accuracy && (
                    <div style={{
                        background: 'rgba(255,255,255,0.08)', padding: '4px 10px',
                        borderRadius: 8, fontSize: 13, color: accColor, fontWeight: 700,
                    }}>{accDots}</div>
                )}
            </div>

            {/* ── Body ── */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '16px 24px', gap: 20, overflowY: 'auto',
            }}>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                        <div style={{ position: 'relative', width: 80, height: 80 }}>
                            <div style={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                border: '3px solid rgba(74,222,128,0.15)',
                                borderTopColor: '#4ade80',
                                animation: 'qspin 1s linear infinite',
                            }} />
                            <div style={{
                                position: 'absolute', inset: 10, borderRadius: '50%',
                                border: '3px solid rgba(74,222,128,0.1)',
                                borderBottomColor: '#22c55e',
                                animation: 'qspin 1.5s linear infinite reverse',
                            }} />
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 28,
                            }}>🕋</div>
                        </div>
                        <p style={{ color: '#94a3b8', fontWeight: 500, margin: 0 }}>
                            {t('qibla_calibrating')}
                        </p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 16, textAlign: 'center',
                    }}>
                        <AlertCircle style={{ width: 56, height: 56, color: '#ef4444' }} />
                        <p style={{
                            color: '#fca5a5', fontWeight: 500, margin: 0,
                            maxWidth: 280, lineHeight: 1.6,
                        }}>{error}</p>
                        <button
                            onClick={() => { cleanup(); initialize(); }}
                            style={{
                                padding: '12px 28px', background: '#22c55e',
                                color: '#fff', border: 'none', borderRadius: 12,
                                fontWeight: 700, fontSize: 16, cursor: 'pointer',
                            }}
                        >{t('update')}</button>
                    </div>
                )}

                {/* Compass */}
                {!loading && !error && (
                    <>
                        <p style={{
                            color: '#94a3b8', fontSize: 14, textAlign: 'center',
                            margin: 0, maxWidth: 300, lineHeight: 1.6,
                        }}>{t('qibla_instructions')}</p>

                        {/* Compass wheel */}
                        <div style={{ position: 'relative', width: 280, height: 280 }}>

                            {/* Ambient glow */}
                            <div style={{
                                position: 'absolute', inset: -24, borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }} />

                            {/* Compass body */}
                            <div style={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                                border: '2px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 0 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                                overflow: 'hidden',
                            }}>
                                {/* ── Rotating compass rose ── */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    transform: `rotate(${compassRotate}deg)`,
                                    // no CSS transition — handled by rAF for smoothness
                                }}>
                                    {/* Degree tick marks every 5° */}
                                    {Array.from({ length: 72 }).map((_, i) => {
                                        const major = i % 6 === 0;
                                        return (
                                            <div key={i} style={{
                                                position: 'absolute',
                                                left: '50%', top: 0,
                                                width: major ? 2 : 1,
                                                height: major ? 18 : 10,
                                                background: major
                                                    ? 'rgba(255,255,255,0.35)'
                                                    : 'rgba(255,255,255,0.12)',
                                                transformOrigin: '50% 140px',
                                                transform: `translateX(-50%) rotate(${i * 5}deg)`,
                                            }} />
                                        );
                                    })}

                                    {/* Cardinal & intercardinal labels */}
                                    {[
                                        { label: 'N', angle: 0, color: '#ef4444', size: 18, fw: 800 },
                                        { label: 'NE', angle: 45, color: '#64748b', size: 11, fw: 600 },
                                        { label: 'E', angle: 90, color: '#cbd5e1', size: 15, fw: 700 },
                                        { label: 'SE', angle: 135, color: '#64748b', size: 11, fw: 600 },
                                        { label: 'S', angle: 180, color: '#cbd5e1', size: 15, fw: 700 },
                                        { label: 'SW', angle: 225, color: '#64748b', size: 11, fw: 600 },
                                        { label: 'W', angle: 270, color: '#cbd5e1', size: 15, fw: 700 },
                                        { label: 'NW', angle: 315, color: '#64748b', size: 11, fw: 600 },
                                    ].map(({ label, angle, color, size, fw }) => {
                                        const r = 108; // radius from center in px
                                        const rad = toRad(angle);
                                        return (
                                            <div key={label} style={{
                                                position: 'absolute',
                                                left: `calc(50% + ${Math.sin(rad) * r}px)`,
                                                top: `calc(50% - ${Math.cos(rad) * r}px)`,
                                                transform: 'translate(-50%, -50%)',
                                                color, fontSize: size, fontWeight: fw,
                                                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                                                lineHeight: 1,
                                            }}>{label}</div>
                                        );
                                    })}

                                    {/* Kaaba icon pinned at qibla bearing on the rose ring */}
                                    {(() => {
                                        const r = 118;
                                        const rad = toRad(qiblaBearing);
                                        return (
                                            <div style={{
                                                position: 'absolute',
                                                left: `calc(50% + ${Math.sin(rad) * r}px)`,
                                                top: `calc(50% - ${Math.cos(rad) * r}px)`,
                                                transform: 'translate(-50%, -50%)',
                                                fontSize: 20,
                                                filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.7))',
                                            }}>🕋</div>
                                        );
                                    })()}
                                </div>

                                {/* ── Qibla needle (fixed to screen, points to qibla) ── */}
                                {/* North half – green */}
                                <div style={{
                                    position: 'absolute',
                                    left: '50%', top: '50%',
                                    width: 4, height: 100,
                                    transformOrigin: '50% 100%',
                                    transform: `translate(-50%, -100%) rotate(${needleAngle}deg)`,
                                    background: 'linear-gradient(to top, #16a34a, #4ade80)',
                                    borderRadius: '2px 2px 0 0',
                                    boxShadow: '0 0 10px rgba(74,222,128,0.5)',
                                    zIndex: 5,
                                }}>
                                    {/* Arrowhead */}
                                    <div style={{
                                        position: 'absolute', top: -8, left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 0, height: 0,
                                        borderLeft: '7px solid transparent',
                                        borderRight: '7px solid transparent',
                                        borderBottom: '12px solid #4ade80',
                                    }} />
                                </div>
                                {/* South half – dimmed red */}
                                <div style={{
                                    position: 'absolute',
                                    left: '50%', top: '50%',
                                    width: 3, height: 60,
                                    transformOrigin: '50% 0%',
                                    transform: `translate(-50%, 0%) rotate(${needleAngle}deg)`,
                                    background: 'linear-gradient(to bottom, rgba(239,68,68,0.6), transparent)',
                                    borderRadius: '0 0 2px 2px',
                                    zIndex: 4,
                                }} />

                                {/* Center cap */}
                                <div style={{
                                    position: 'absolute', left: '50%', top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: 18, height: 18, borderRadius: '50%',
                                    background: 'linear-gradient(145deg, #22c55e, #15803d)',
                                    border: '2px solid rgba(255,255,255,0.25)',
                                    boxShadow: '0 0 12px rgba(34,197,94,0.5)',
                                    zIndex: 6,
                                }} />
                            </div>

                            {/* Fixed north indicator (triangle at top of bezel) */}
                            <div style={{
                                position: 'absolute', top: 2, left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0, height: 0,
                                borderLeft: '7px solid transparent',
                                borderRight: '7px solid transparent',
                                borderBottom: '14px solid rgba(255,255,255,0.15)',
                                zIndex: 7,
                            }} />
                        </div>

                        {/* Qibla info card */}
                        <div style={{
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            borderRadius: 16, padding: '14px 28px',
                            textAlign: 'center', minWidth: 220,
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 8, marginBottom: 4,
                            }}>
                                <span style={{ fontSize: 20 }}>🕋</span>
                                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 15 }}>
                                    {t('qibla_direction')}
                                </span>
                            </div>
                            <p style={{ color: '#86efac', fontWeight: 600, margin: 0, fontSize: 22 }}>
                                {Math.round(qiblaBearing)}°
                            </p>
                        </div>

                        {/* Debug heading */}
                        <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>
                            ↑ {Math.round(displayHeading)}°
                        </p>
                    </>
                )}
            </div>

            <style>{`
                @keyframes qspin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default QiblaCompass;
