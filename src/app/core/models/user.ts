import { Address } from './address';
import { MarketingConsent } from './consenct';

export interface User {
    name: string | '';
    type: 'parent' | 'guardian' | 'educator';
    address: Address;
    lastLogin: string;
    firstLogin: string;
    acceptsMarketing: MarketingConsent;
    acceptsMarketingUpdatedAt: number; // dateObj
    email: string;
    phone: string; // 10-digit mobile with country code
    photoUrl?: string;
    id: string;
}

