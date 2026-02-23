export interface Student {
    name: string;
    institutionName: string;
    institutionId: string;
    grade: number;
    classroomName: string;
    classroomId: string;
    uid: string;
}

export interface StudentsPhone {
  id?: string;
  studentMeta?: {
    phoneNumber?: string;
  };
  // other fields...
}
