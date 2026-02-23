export interface Notification {
    id?: string;
    userId?: string; // User ID for whom this notification belongs
    role?: string; // 'teacher' or 'student'
    read?: boolean;
    remove?: boolean;
    title?: string;
    time: string | Date;
    description?: string;
    icon?: string;  
    image?: string;
    link?: string;
    useRouter?: boolean;
    approvalRequest?: boolean;
    selfRegUserId?: string;
    classroomId?: string;
    updatedAt?: string | Date;

    masterDocId?: string; // ID of the master document (e.g., assignment, workflow)

    // Assignment related fields
    assignmentId?: string;
    learningUnitId?: string;
    workflowId?: string;
    institutionId?: string;
    programmeId?: string;
    studentId?: string;

    // User related fields for approval requests
    firstName?: string;
    lastName?: string;
    countryCode?: string;
    phoneNumber?: string;
    email?: string;
    instituteName?: string;
    classroomName?: string;
    subject?: string;
    actionTakenBy?: string;
    actionDate?: string | Date;
    rejectionReason?: string;
    schoolRepUid?: string;

    // Admin notification flag
    viewNotificationsAdmin?: boolean;
}