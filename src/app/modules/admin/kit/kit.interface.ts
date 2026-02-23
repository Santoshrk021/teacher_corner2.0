export interface Kit {
  docId?: string;
  kitId: string;
  status: 'active' | 'inactive' | 'dispatched';
  teacherRemotes: KitRemote[];
  studentRemotes: KitRemote[];
  spareRemotes: KitRemote[];
  totalRemotes: number;
  createdAt?: any;
  updatedAt?: any;
  notWorkingRemoteEntries?: NotWorkingRemoteEntry[];
  // Institution assignment (current)
  institutionId?: string;
  institutionName?: string;
  dispatchedAt?: any;
  receivedBackAt?: any;
  // Previous institution (for history display)
  lastInstitutionId?: string;
  lastInstitutionName?: string;
}

export interface NotWorkingRemoteEntry {
  id?: string;
  mac: string;
  role: 'teacher' | 'student' | 'spare';
  slotNumber: number;
}

export interface KitRemote {
  mac: string;
  role: 'teacher' | 'student' | 'spare';
  slotNumber: number;
  capturedAt?: any;
}

export interface DeletedKit extends Kit {
  deletedAt?: any;
}
