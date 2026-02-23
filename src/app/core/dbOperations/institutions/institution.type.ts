import firebase from 'firebase/compat/app';
import { WorkflowTemplate } from '../workflowTemplate/workflow-template.type';
import { ProgrammeTemplate } from '../programmeTemplate/programme-template.type';

export interface Institution {
    board: string;
    classroomCounter: number;
    createdAt: firebase.firestore.Timestamp;
    createdSource: string;
    creationDate: firebase.firestore.Timestamp;
    docId: string;
    genderType: string;
    id: string;
    institutionAddress: {
        city: string;
        district: string;
        pincode: string;
        state: string;
        street: string;
        subDistrict: string;
        village: string;
    };
    institutionCode: string;
    institutionCreatorCountryCode: string;
    institutionCreatorEmail: string;
    institutionCreatorFirstName: string;
    institutionCreatorLastName: string;
    institutionCreatorName: string;
    institutionCreatorPhoneNumber: string;
    institutionId: string;
    institutionName: string;
    institutiontype: string;
    lastUsedDate: firebase.firestore.Timestamp;
    medium: string;
    registrationNumber: string;
    representativeCountryCode: string;
    representativeEmail: string;
    representativeFirstName: string;
    representativeLastName: string;
    representativeName: string;
    representativePhoneNumber: string;
    typeofSchool: string;
    updatedAt: firebase.firestore.Timestamp;
}

export interface InstitutionMaster extends Omit<Institution,
    'classroomCounter' |
    'createdAt' |
    'creationDate' |
    'genderType' |
    'id' |
    'institutionAddress' |
    'institutionCode' |
    'institutionCreatorFirstName' |
    'institutionCreatorLastName' |
    'institutionId' |
    'institutiontype' |
    'lastUsedDate' |
    'medium' |
    'representativeFirstName' |
    'representativeLastName' |
    'updatedAt'
> {
    pincode: string;
    verificationStatus: string;
}

export interface OneClickInstitution {
    institution: Institution;
    classrooms: {
        classInfoArray: [
            {
                grade: number;
                section: string;
                availableSections: Array<string>;
                subject: 'Science' | 'Math';
                availableSubjects: Array<'Science' | 'Math'>;
                programmeTemplate: 'Discover' | 'Ignite' | 'Explore' | 'Create';
                availableProgrammes: Array<'Create' | 'Explore' | 'Discover' | 'Ignite'>;
                classroomCode: string;
            }
        ] | [];
    };
    defaultWorkflowTemplate: WorkflowTemplate;
    programmeTemplates: Array<ProgrammeTemplate>;
    createdSource: 'one-click-institution-classroom-programme-creation' | 'teacher-corner-self-registration' | 'set-up-wizard' | 'classroom-addition' | 'programme-addition' | 'student-manager' | 'institution-creation';
    operation: 'create' | 'edit' | 'delete' | 'trash';
    component: string;
};
