import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// ⬇️ Add these small types (optional but nice)
export type ReportInstitution = { institutionId: string; institutionName: string };
export type ReportClassroom  = { classroomId: string; classroomName: string; institutionId: string };
export type ReportProgramme  = { programmeId: string; programmeName: string; classroomId: string; institutionId: string };
export type AssignmentReportPayload = {
  institutions: ReportInstitution[];
  classrooms: ReportClassroom[];
  programmes: ReportProgramme[];
  learningUnits: Array<{ learningUnitId: string; learningUnitName: string }>;
  assignmentId: string;             // 👈 NEW (required)
  assignmentName?: string;          // 👈 NEW (optional, used for file name)
};

@Injectable({ providedIn: 'root' })
export class FuseDrawerService {
  drawerCloseQuizSubject = new BehaviorSubject(false)
  drawerOpenEventSubject = new BehaviorSubject(false)
  drawerOpenLearningUnitsSubject = new BehaviorSubject(false)
  drawerOpenNotificationSubject = new BehaviorSubject(false)
  drawerOpenSubject = new BehaviorSubject(false)
  drawerOpenTrashAssignmentSubject = new BehaviorSubject(false)
  drawerOpenTrashClsSubject = new BehaviorSubject(false)
  drawerOpenTrashComponentSubject = new BehaviorSubject(false)
  drawerOpenTrashInstitutesSubject = new BehaviorSubject(false)
  drawerOpenTrashLUSubject = new BehaviorSubject(false)
  drawerOpenTrashPartnerSubject = new BehaviorSubject(false)
  drawerOpenTrashProgrammesSubject = new BehaviorSubject(false)
  drawerOpenTrashVendorSubject = new BehaviorSubject(false)
  drawerOpenTrashWorkflowTemplateSubject = new BehaviorSubject(false)
  drawerOpenWorkflowsSubject = new BehaviorSubject(false)
  drawerOpenWhatsAppHistorySubject = new BehaviorSubject(false)

  // ⬇️ NEW: a tiny bus for the report data
  private _reportData$ = new BehaviorSubject<AssignmentReportPayload | null>(null);
  reportData$ = this._reportData$.asObservable();

  constructor() {}

  setQuizStarted(isQuizActive: boolean) {
    this.drawerCloseQuizSubject.next(isQuizActive);
  }

  // ⬇️ NEW: setter/clearer for report data
  setReportData(data: AssignmentReportPayload | null) {
    this._reportData$.next(data);
  }
}
