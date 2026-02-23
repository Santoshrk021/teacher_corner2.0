import firebase from 'firebase/compat';

export interface User {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    status?: string;
    eventSubmissions?: object;
}

export interface FirebaseUser {
    accessLevel?: string | number;
    cookieConsent: boolean;
    countryCode: string;
    docId: string;
    email: string;
    phoneNumber: string;
    registeredAt: firebase.firestore.Timestamp;
    registeredFrom: string;
    uid: string;
    updatedAt: firebase.firestore.Timestamp;
}