import firebase from 'firebase/compat/app';

export interface WorkflowTemplate {
    createdAt: firebase.firestore.Timestamp;
    status: 'LIVE' | 'DEVELOPMENT';
    templateId: string;
    templateName: string;
    type: 'CLASSROOM' | 'STEM-CLUB';
    workflowSteps: [
        {
            allowAccess: boolean;
            canSkipWorkflowStep: boolean;
            contents: [
                Contents | AssignmentContents
            ];
            sequenceNumber: number;
            viewUnlab: boolean;
            workflowLocation: string;
            workflowStepDescription: string;
            workflowStepDuration: number;
            workflowStepName: string;
            allowArtefactUpload?: boolean;
            scannedArtefacts?: string[];
        }
    ];
}

interface Contents {
    additionalResourceType: string;
    contentCategory: string;
    contentIsLocked: boolean;
    contentName: string;
    contentSubCategory: string;
    contentType: string;
    gameName: string;
    isDownloadable: boolean;
    isDueDate: boolean;
    resourcePath: string;
}

interface AssignmentContents extends Contents {
    assignmentDueDate: firebase.firestore.Timestamp;
    assignmentId: string;
    assignmentName: string;
    assignmentType: 'UPLOAD' | 'QUIZ' | 'FORM' | 'GAME' | 'TEXTBLOCK';
}
