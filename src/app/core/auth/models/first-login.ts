// import { serverTimestamp } from 'firebase/firestore';

export interface FirstLoginData {
    registeredDomain: string;
    registeredAt?: any;
    uid: string;
    phone: string;
}
