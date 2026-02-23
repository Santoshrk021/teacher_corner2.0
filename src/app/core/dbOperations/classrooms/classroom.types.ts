import firebase from 'firebase/compat/app';

export interface ClassroomOld {
    docId?: string;
    institutionId?: string;
    institutionName?: string;
    programmeId?: string;
    programmeName?: string;
    classroomId?: string;
    classroomName?: string;
    board?: string;
    subject?: string;
    grade?: number;
    section?: string;
    programmes?: {
        programmeId?: {
            programmeId: string;
            programmeName: string;
        };
    };
}

export interface BaseClassroom {
    board: string;
    classroomCode: string;
    classroomId: string;
    creationDate: firebase.firestore.Timestamp | firebase.firestore.FieldValue;
    docId: string;
    grade: number;
    institutionId: string;
    institutionName: string;
    masterDocId: string;
    programmes: {
        programmeId: {
            displayName: string;
            programmeCode?: string;
            programmeId: string;
            programmeName: string;
            sequentiallyLocked: boolean;
            workflowIds: [{
                learningUnitId: string;
                workflowId: string;
                lockAt: firebase.firestore.Timestamp | string;
                unlockAt: firebase.firestore.Timestamp | string;
                workflowLocked: boolean;
            }];
        };
    };
    section: string;
    studentCredentialStoragePath: string;
    studentCounter: number;
    type: 'CLASSROOM' | 'STEM-CLUB';
    updatedAt: firebase.firestore.Timestamp | firebase.firestore.FieldValue;
};

// Define a type without workflowIds
type ProgrammesWithoutWorkflowIds = {
    [programmeId: string]: Omit<BaseClassroom['programmes']['programmeId'], 'workflowIds'>;
};

export interface Classroom extends BaseClassroom {
    classroomName: string;
};

export interface StemClub extends BaseClassroom {
    stemClubName: string;
};

export interface ClassroomMaster extends Omit<Classroom, 'masterDocId' | 'programmes'> {
    classroomName: string;
    programmes: ProgrammesWithoutWorkflowIds;
};

export interface StemClubMaster extends Omit<StemClub, 'masterDocId' | 'programmes'> {
    stemClubName: string;
    programmes: ProgrammesWithoutWorkflowIds;
};
