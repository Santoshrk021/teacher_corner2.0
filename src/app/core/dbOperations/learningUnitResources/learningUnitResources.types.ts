import firebase from 'firebase/compat/app';

export interface LearningUnitResource {
    docId: string;
    learningUnitDocId: string;
    learningUnitId: string;
    maturity: string;
    resources: {};
    type: string;
    createdAt?: firebase.firestore.Timestamp;
    updatedAt?: firebase.firestore.Timestamp;
}
