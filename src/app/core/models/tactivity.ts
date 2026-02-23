
import { serverTimestamp } from 'firebase/firestore';

export interface TACtivity {
    tacName: string;
    tacCode: string;
    tacVersion: string;
    tacLanguage: string;
    headlineImage: string;
    longDescription: string;
    shortDescription: string;
    videoUrl: string;
    mainGuideUrl: string;
    materialUrl: string;
    observationSheetUrl: string;
    additionalResources?: AdditionalResource[];
    similarTACs?: SimilarTACs[];
    prerequisiteTACs?: PrerequisiteTACs[];
    createdAt?: any;
}

export interface PrerequisiteTACs {
    tacName: string;
    tacCode: string;
    tacLanguage: string;
    headlineImage: string;
    tacVersion: string;
    description: string;
    createdAt?: any;
}
export interface AdditionalResource {
    publish: boolean;
    description: string;
    title: string;
    type: string;
    url: string;
    createdAt?: any;
}
export interface SimilarTACs {
    tacName: string;
    tacCode: string;
    tacLanguage: string;
    headlineImage: string;
    tacVersion: string;
    description: string;
    createdAt?: any;
}
