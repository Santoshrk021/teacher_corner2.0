import firebase from 'firebase/compat/app';
export interface customAuthentication {
    createdAt: firebase.firestore.Timestamp | firebase.firestore.FieldValue;
    docId: string;
    updatedAt: firebase.firestore.Timestamp | firebase.firestore.FieldValue;
    accessCode: string;
    email: string;
    userName: string;
};
