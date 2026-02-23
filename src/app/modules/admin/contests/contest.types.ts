export interface Contest {
    contestTitle: string;
    contestSubtitle: string;
    contestDescription: string;
    contestEndUrl: string;
    domain: string;
    contestFullUrl: string;
    creatorName: string;
    participantType: string /*  'STUDENT || TEACHER' */;
    contestLogosPath: string[];
    contestType: string /* 'CONTEST'||'CHALLENGE' */;
    docId?: string;
    categories: any[];
    grades: number[];
    stagesNames?: StageName[];
    maximumNomination?: number;
    contestStartDate?: Date;
    contestEndDate?: Date;
    type?: string;

    contestVisibilityToInstitutions: {
        [key: string]: {
            institutionName: string;
            institutionId: string;
            pincode: string;
            board: string;
        };
    };


}

export interface StageName {
    stageName: string;
    stageNumber: number;
    startDate: Date;
    endDate: Date;
    numberOfAllowedSubmissions: Number;
    isNominationAllowed: boolean;
    isMultipleGrade: boolean;
    isDependentOtherStage: boolean;
    submissions?: any[];
}
