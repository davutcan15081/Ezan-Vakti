
import { Purchases, LOG_LEVEL, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { REVENUECAT_CONFIG } from '../constants';

export class PurchaseService {
    private static instance: PurchaseService;
    private initialized = false;

    private constructor() { }

    public static getInstance(): PurchaseService {
        if (!PurchaseService.instance) {
            PurchaseService.instance = new PurchaseService();
        }
        return PurchaseService.instance;
    }

    /**
     * Initialize RevenueCat
     */
    public async initialize(): Promise<void> {
        if (this.initialized || !Capacitor.isNativePlatform()) return;

        try {
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

            if (Capacitor.getPlatform() === 'android') {
                await Purchases.configure({ apiKey: REVENUECAT_CONFIG.GOOGLE_API_KEY });
            } else {
                await Purchases.configure({ apiKey: REVENUECAT_CONFIG.APPLE_API_KEY });
            }

            this.initialized = true;
            console.log('[PurchaseService] RevenueCat initialized');
        } catch (e) {
            console.error('[PurchaseService] Initialization failed', e);
        }
    }

    /**
     * Check if user has active "Remove Ads" entitlement
     */
    public async checkPremiumStatus(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            const { customerInfo } = await Purchases.getCustomerInfo();
            return customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID] !== undefined;
        } catch (e) {
            console.error('[PurchaseService] Failed to check status', e);
            return false;
        }
    }

    /**
     * Purchase "Remove Ads" poduct
     */
    public async purchaseRemoveAds(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) {
            alert("Satın alma sadece gerçek cihazlarda çalışır.");
            return false;
        }

        try {
            const { current } = await Purchases.getOfferings();
            if (current && current.availablePackages.length > 0) {
                const { customerInfo } = await Purchases.purchasePackage({
                    aPackage: current.availablePackages[0]
                });
                return customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID] !== undefined;
            } else {
                throw new Error("Satın alınacak paket bulunamadı.");
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('[PurchaseService] Purchase failed', e);
                alert("Satın alma işlemi başarısız oldu: " + e.message);
            }
            return false;
        }
    }

    /**
     * Restore previous purchases
     */
    public async restorePurchases(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            const { customerInfo } = await Purchases.restorePurchases();
            return customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID] !== undefined;
        } catch (e) {
            console.error('[PurchaseService] Restore failed', e);
            return false;
        }
    }
}

export default PurchaseService.getInstance();
