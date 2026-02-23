import firebase from 'firebase/compat/app';

export interface ComponentModel{
    id?: string;
    image: string[];
    componentCode?: string;
    componentName?: string;
    groupName?: string;
    category?: string;
    subCategory?: string;
    componentSize?: string;
    attribute?: string;
    quantity?: number;
    createdAt?: firebase.firestore.Timestamp;
}