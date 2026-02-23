import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ContestSubmissionsService } from 'app/core/dbOperations/contestSubmissions/contestSubmissions.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContestInteractionService {

  unlockedSteps = new BehaviorSubject(null)

  constructor(
    private contestSubmissionsService: ContestSubmissionsService,
    private studentService: StudentsService,
    private sharedService: SharedService,
    private afs: AngularFirestore,
  ) { }

  // incompleteSubmissions(studentId, contestId, rawWorkflowInfo, currentWorkflow, queryParams) {
  //   this.contestSubmissionsService.getContestSubmissions(studentId, contestId).subscribe((res: any) => {
  //     let incompleteAssignments = rawWorkflowInfo.contestSteps.filter((workflow) => {
  //       if (res.data()) {
  //         if (workflow.sequenceNumber == currentWorkflow.sequenceNumber) {
  //           return workflow
  //         }
  //         else if (workflow.type == 'ASSIGNMENT') {
  //           let ref = res.data()[`stageId-${queryParams.stageId}`]?.[`submId-${queryParams.submId}`]
  //           let notCompleted = workflow.contents.filter(content => {
  //             if (!ref?.[`assignmentId-${content.assignmentId}`]) {
  //               return content
  //             }
  //           })
  //           if (notCompleted.length) {
  //             return workflow
  //           }
  //         }
  //       }
  //       else {
  //         if (workflow.type == 'ASSIGNMENT') {
  //           return workflow
  //         }
  //       }
  //     })
  //   })
  // }

  incompleteSubmissions(studentId, rawWorkflowInfo, currentWorkflow, queryParams): Observable<any[]> {

    return this.contestSubmissionsService.getContestSubmissions(studentId, queryParams.contestId).pipe(
      map((res: any) => {
        return rawWorkflowInfo.contestSteps.filter((workflow, index) => {
          if (res.data()) {
            if (workflow.type == 'ASSIGNMENT' && (workflow.sequenceNumber != currentWorkflow.sequenceNumber)) {
              let ref = res.data()[`stageId-${queryParams.stageId}`]?.[`submId-${queryParams.submId}`];
              let notCompleted = workflow.contents.filter(content => {
                if (!ref?.[`assignmentId-${content.assignmentId}`]) {
                  return content;
                }
              });
              if (notCompleted.length) {
                return workflow;
              }
            }
          } else {
            if (workflow.type == 'ASSIGNMENT') {
              if (index < rawWorkflowInfo.contestSteps.length - 1) {
                return workflow;
              } else {
                return undefined;
              };
            }
          }
        });
      })
    );
  }

  getConfigForIncompleteSubmissions(incompleteAssignments) {

    let dialogText = "";
    incompleteAssignments.map((assignment) => (dialogText += (`<li> ${assignment.contestStepName} </li>`)))
    return {
      title: `Confirmation`,
      message: `<div style="font-family: Arial, sans-serif; border: 1px solid #ccc; border-radius: 8px; padding: 16px; background-color: #f9f9f9; max-width: 400px; margin: auto;">
                <h3 style="color: #d32f2f; font-size: 18px; margin-bottom: 10px;">Action Required</h3>
                <p style="margin: 0; font-size: 14px; color: #333;">
                The following steps have not been submitted:
                </p>
                <ul style="margin-top: 10px; padding-left: 20px; font-size: 14px; color: #555;">
                ${dialogText}
                </ul>
                <p style="margin-top: 10px; font-size: 14px; color: #333;">
                Please submit the above steps to proceed.
                </p>
                </div>`,
      // message: `The following steps have not been submitted: <br> <br> <ul>${dialogText}</ul> <br>Please submit the above steps to proceed.`,
      actions: {
        confirm: {
          disable: true
        }
      }
    }
  }

  setFlagInStudentDoc(params: any, studentId: string, assignmentId: string, isLastStep: boolean) {
    const { contestId, stageId, submId } = params;

    const stageSubmissionObj = {
      contestSubmissions: {
        [`contestId_${contestId}`]: {
          [`stageId_${stageId}`]: {
            [`submId_${submId}`]: {
              assignmentSubmissions: arrayUnion(assignmentId),
              isSubmitted: isLastStep ?? false,
              submittedAt: serverTimestamp()
            }
          }
        }
      }
    }

    return this.studentService.updateStudent(stageSubmissionObj, studentId);
  }

  sendWhatsappNotification(studentFullName: string, submissionNumber: number, submissionTitle: string, stageName: string, contestTitle: string, urlLink: string, selectionOption: string, selectionMenu: string, contestResultDate: string, awardScheduleUrl: string, senderName: string, contestId: string, stageId: string, phone: string, classroomId: string, institutionId: string, studentId: string, submissionId: string, isLastSubmission: boolean) {
    const ranks = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    const rankCreator = ranks.map((rank, i) => ({ [i + 1]: rank })).reduce((acc, val) => ({ ...acc, ...val }), {});
    const submissionRank = rankCreator[submissionNumber];
    const templateName = isLastSubmission ? environment.whatsAppTemplates.contestFinalSubmissionConfirmation.templateName : environment.whatsAppTemplates.contestEachSubmissionConfirmation.templateName;
    const headerImage = isLastSubmission ? environment.whatsAppTemplates.contestFinalSubmissionConfirmation.headerImage : environment.whatsAppTemplates.contestEachSubmissionConfirmation.headerImage;
    const mediaType = "image";
    const params = [
      studentFullName,
      ...(!isLastSubmission ? [submissionRank, submissionTitle] : []),
      stageName,
      contestTitle,
      urlLink,
      selectionOption,
      selectionMenu,
      urlLink,
      contestResultDate,
      awardScheduleUrl,
      senderName,
    ];
    const urlRoute = `contest-submissions/interaction?classroomId=${classroomId}&institutionId=${institutionId}&studentId=${studentId}&contestId=${contestId}&stageId=${stageId}&submId=${submissionId}`;

    this.sharedService.sendWhatsAppNotification(phone, templateName, params, headerImage, mediaType, urlRoute);
  }

  getContestWorkflowCompletion(studentId: string, contestId: string) {
    return this.afs.collection('Students').doc(studentId).collection('Completion').doc(contestId).get();
  }

  setContestWorkflowCompletion(studentId: string, contestId: string, contestCompletion: any) {
    this.afs.collection('Students').doc(studentId).collection('Completion').doc(contestId).set(contestCompletion);
  }

}
