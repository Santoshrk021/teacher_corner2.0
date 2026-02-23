import firebase from 'firebase/compat/app';
export interface ProgrammeTemplate {
    assignmentIds: Object;
    board: string;
    createdAt: firebase.firestore.Timestamp;
    displayName: string;
    docId: string;
    grade: number;
    isLocalHost: boolean;
    learningUnitsIds: Array<string>;
    masterDocId: string;
    subject: string;
    templateCategory: string;
    templateDescription: string;
    templateId: string;
    templateImagePath: string;
    templateName: string;
    templateStatus: string;
    type: string;
    updatedAt: firebase.firestore.Timestamp;
};

export type ProgrammeTemplateMaster = Omit<ProgrammeTemplate, 'isLocalHost' | 'assignmentIds' | 'masterDocId'>;
