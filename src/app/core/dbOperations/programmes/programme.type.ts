
import firebase from 'firebase/compat/app';
export interface BaseProgramme {
    assignmentIds: Object;
    board: string;
    createdAt: firebase.firestore.Timestamp;
    displayName: string;
    docId: string;
    grades: Array<number>;
    isLocalHost: boolean;
    learningUnitsIds: Array<string>;
    institutionId?: string;
    institutionName?: string;
    programmeDescription: string;
    programmeImagePath: string;
    programmeName: string;
    programmeStatus: string;
    masterDocId: string;
    type: string;
    updatedAt: firebase.firestore.Timestamp;
};


export type ProgrammeMaster = Omit<BaseProgramme, 'isLocalHost' |  'masterDocId'>;
