export interface Outreach {
  docId?: string;
  institutionId?: string;
  institutionName: string;
  uniqueCode?: string;
  qrCodeValue?: string;
  qrCodeImageUrl?: string;
  teacherRegistered?: string[];
  dateGenerated?: any;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

export interface DeletedOutreach extends Outreach {
  deletedAt?: any;
}
