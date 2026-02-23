
export interface ContestStep {
    contestId?: string;
    selectedStepView?: {
        contestStepId?: string;
        contestStepName?: string;
        contestStepDescription?: string;
        contestStepDuration?: number;
    };

    contestSteps?: {
        contestStepId: string;
        contestStepName: string;
        contestStepDescription?: string;
        contestStepDuration?: number;

        allowAccess: boolean;
        canSkipContestStep: boolean;
        sequenceNumber: number;
        contestLocation: number;
        contestStepType: string;
        contestSubtitle: string;

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
    // canSkipcontestStep: boolean,
    // sequenceNumber: string,
    // contestLocation: string,
    // contestStepType: string,
    // contestSubtitle: string,
}

export interface Content {
    contentIsLocked: boolean;
    contentName: string;
    contentType: string;
}
export interface Step {

}


export interface contestStepTemp {
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
