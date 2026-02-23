
export interface WorkFlowStep {
    workflowId?: string;
    privilegeTable?: any[];
    selectedStepView?: {
        workflowStepId?: string;
        workflowStepName?: string;
        workflowStepDescription?: string;
        workflowStepDuration?: number;
    };

    workflowSteps?: {
        workflowStepId: string;
        workflowStepName: string;
        workflowStepDescription?: string;
        workflowStepDuration?: number;

        allowAccess: boolean;
        canSkipWorkflowStep: boolean;
        sequenceNumber: number;
        workflowLocation: number;
        workflowStepType: string;
        workflowSubtitle: string;
        allowArtefactUpload?: boolean;
        scannedArtefacts?: string[];

        contents?: {
            contentIsLocked: boolean;
            contentName: string;
            contentType: string;
        }[];
    }[];

    totalSteps?: number;
    updatedAt?: number;
    featured?: boolean;
    progress?: {
        currentStep?: number;
        completed?: number;
    };

    // allowAccess: boolean,
    // canSkipWorkflowStep: boolean,
    // sequenceNumber: string,
    // workflowLocation: string,
    // workflowStepType: string,
    // workflowSubtitle: string,
}

export interface Content {
    contentIsLocked: boolean;
    contentName: string;
    contentType: string;
}
export interface Step {

}


export interface WorkFlowStepTemp {
    id?: string;
    title?: string;
    slug?: string;
    description?: string;
    category?: string;
    duration?: number;
    steps?: {
        order?: number;
        title?: string;
        subtitle?: string;
        content?: string;
    }[];
    totalSteps?: number;
    updatedAt?: number;
    featured?: boolean;
    progress?: {
        currentStep?: number;
        completed?: number;
    };
}
