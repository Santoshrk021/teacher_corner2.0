interface ContestSteps {
    Junior: {
        steps: any[];
    };
    Intermediate: {
        steps: any[];
    };
    Senior: {
        steps: any[];
    };
}

interface Template {
    templateId: string;
    templateName: string;
    docId: string;
    contestSteps: ContestSteps;
    totalSteps: {
        [key: string]: number | undefined; // To support other levels like Intermediate or Senior if needed in the future
    };
}
