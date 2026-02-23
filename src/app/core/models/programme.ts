export interface Programme {
    syllabus: string;
    students: [];
}

// New Db Progrmme schema
export interface Programme {
    programmeName: string;
    programmeId: string;
    institutionId: string;
    institutionName: string;
    creator: string;
    createdAt?: any;
    programmeImage: string;
    tactivities: TACs[];
}

export interface TACs {
    tacCode: string;
    tacName: string;
    tacVersion: string;
    createdAt?: any;
}

