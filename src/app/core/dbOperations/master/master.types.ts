// export interface User {
//     id?: string;
//     name?: string;
//     email?: string;
//     phone?: string;
//     avatar?: string;
//     status?: string;
// }

export interface MasterInstituteDoc {
  docId: string;
  board: string; /* Board Code */
  institutionName: string;
  institutionCreatorCountryCode: string;
  institutionCreatorPhoneNumber: string;
  institutionCreatorName: string;
  registrationNumber: string;
  representativeFirstName: string;
  representativeLastName: string;
  representativeCountryCode: string;
  representativePhoneNumber: string;
  creationDate?: Date;
  pincode: string;
  typeofSchool: string;
  verificationStatus: boolean;
}
