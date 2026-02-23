export interface Teacher {
    name?: string;
    firstName: string;
    lastName: string;
    email?: string;
    countryCode?: string;
    phoneNumber?: string;
    uid: string;
    institutionName: string;
    institutionId: string;
    board?: string;
    classroomName?: string;
    classroomId?: string;
    programme?: {
        programmeId: '';
        programmeName: '';
    };
    grade: number;
    section?: string;
    representativeCountryCode?: string;
    representativePhoneNumber?: string;
    type?: 'CLASSROOM' | 'STEM-CLUB';
}
