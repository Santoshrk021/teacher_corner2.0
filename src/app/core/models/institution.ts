import { Address } from './address';

export interface Institution {
    registrationNumber: any;
    institutionId: string;
    institutionName: string;
    institutionCreatorFirstName: string;
    institutionCreatorLastName: string;
    institutionCreatorName: string;
    institutionCreatorEmail: string;
    representativeEmail?: string;
    representativePhone?: string;
    representativeFirstName?: string;
    representativeLastName?: string;
    organizationtype: 'thinktac' | 'school' | 'partner';
    organizationAddress: Address;
    creationDate?: Date;
    lastUsedDate?: Date;
    boardId: string;
    board: string;
    genderType: string;
    medium: string;
}
