import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { arrayUnion, serverTimestamp } from '@angular/fire/firestore';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { CustomAuthenticationService } from 'app/core/dbOperations/customAuthentication/customAuthentication.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { ScannedArtefactsService } from 'app/core/dbOperations/scannedArtefacts/scanned-artefacts.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-scanned-document-manager',
  templateUrl: './scanned-document-manager.component.html',
  styleUrls: ['./scanned-document-manager.component.scss']
})
export class ScannedDocumentManagerComponent implements OnInit {
  storageFolder = 'Scanned Artefacts';
  loadingSpinner = false;
  scannedArtefacts: Array<any> = [];
  expandedArtefactId: string | null = null;

  // Editing state
  editingArtefactId: string | null = null;
  editingStudentName: string = '';
  editingRollNumber: string = '';

  // Validation state
  rollNumberValid: boolean = false;
  rollNumberValidating: boolean = false;
  rollNumberValidationMessage: string = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private storage: AngularFireStorage,
    private sharedService: SharedService,
    private workflowsService: WorkflowsService,
    private scannedArtefactsService: ScannedArtefactsService,
    private uiService: UiService,
    private institutionService: InstitutionsService,
    private classroomService: ClassroomsService,
    private studentsService: StudentsService,
    private customAuthenticationService: CustomAuthenticationService,
    private contestService: ContestService,
    private deviceInfoService: DeviceInfoService,
    private assignmentService: AssignmentsService,
  ) { }

  ngOnInit(): void {
    this.getScannedArtefacts();
  }

  async getScannedArtefacts() {
    this.scannedArtefacts = this.data?.scannedArtefacts ? await Promise.all(this.data?.scannedArtefacts?.map(async (scannedArtefactId: any) => {
      const artefact: any = await lastValueFrom(this.scannedArtefactsService.getScannedArtefactsById(scannedArtefactId));
      // Fetch matched student name from student document
      if (artefact?.studentId) {
        artefact.matchedStudentName = await this.getMatchedStudentName(artefact.studentId);
      }
      return artefact;
    })) : [];
  }

  async getMatchedStudentName(studentId: string): Promise<string> {
    try {
      const studentDoc = await lastValueFrom(this.studentsService.getStudentByIdOnce(studentId));
      if (studentDoc?.exists) {
        const studentMeta = studentDoc.get('studentMeta');
        if (studentMeta) {
          const firstName = studentMeta.firstName || '';
          const lastName = studentMeta.lastName || '';
          return `${firstName} ${lastName}`.trim() || '-';
        }
      }
      return '-';
    } catch (error) {
      console.error('Error fetching matched student name:', error);
      return '-';
    }
  }

  async onFileSelected(event: Event) {
    this.loadingSpinner = true;
    const { institutionId, classroomId, programmeId, learningUnitId, workflow, step: workflowStep } = this.data;
    const files: FileList = (event.target as HTMLInputElement).files;

    const institution = await lastValueFrom(this.institutionService.getInstitutionByIdOnce(institutionId));
    const institutionCode = institution.exists ? institution.get('institutionCode') : '0000000';

    const classroom = await lastValueFrom(this.classroomService.getClassroomByIdOnce(classroomId));
    const classroomCode = classroom.exists ? classroom.get('classroomCode') : '000';

    const studentCounter = classroom.exists ? classroom.get('studentCounter') : 0;

    // Track the starting index based on existing scanned artefacts
    const existingCount = this.scannedArtefacts.length;

    if (!!files?.length) {
      for (let i = 0; i < files.length; i++) {
        this.uiService.alertMessage('Processing', `Processing file ${i + 1} of ${files.length}`, 'info');
        const file = files[i];
        const { name: fileName, type } = file;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
        if (!allowedTypes.includes(type)) {
          console.error(`File type ${type} not allowed`);
        };
        const storagePath = `${this.storageFolder}/${institutionId}/${classroomId}/${programmeId}/${learningUnitId}/${fileName}`;
        const textExtractionUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/extractHandwrittenTextFromImage`;
        // const textExtractionUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/extractHandwrittenTextFromImage`;
        if (type === 'application/pdf') {
          const pdfExportUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/exportPDFToImages`;
          // const pdfExportUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/exportPDFToImages`;
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          const body = JSON.stringify({ fileData: base64, fileName, institutionId, classroomId, programmeId, learningUnitId, workflow, workflowStep });
          const responseBody = await this.sharedService.sendToCloudFunction(pdfExportUrl, body);
          if (responseBody.hasOwnProperty('uploadedFiles')) {
            for (let j = 0; j < responseBody.uploadedFiles.length; j++) {
              const uploadedFile = {
                ...responseBody.uploadedFiles[j]
              };
              const extractionResponse = await this.sharedService.sendToCloudFunction(textExtractionUrl, uploadedFile);

              const index = (existingCount + j + 1).toString().padStart(3, '0');
              const rollNumber = `${institutionCode}${classroomCode}${index}`;

              const studentId = await this.updateStudentDetails(rollNumber, extractionResponse, uploadedFile.storagePath);

              // Build extractedData as flat structure with fileName as key-value
              // Remove non-serializable properties before saving to Firestore
              const { headers, ok, status, statusText, url, type, ...serializableResponse } = extractionResponse;
              const extractedData = {
                fileName: uploadedFile.fileName,
                ...serializableResponse,
                processedAt: new Date().toISOString()
              };

              // Save extractedData, rollNumber and studentId to the database for each page
              await this.scannedArtefactsService.updateScannedArtefact(uploadedFile.scannedArtefactId, {
                extractedData,
                rollNumber,
                studentId
              });

              const matchedStudentName = await this.getMatchedStudentName(studentId);
              const newArtefact = {
                classroomId,
                institutionId,
                programmeId,
                fileName: uploadedFile.fileName,
                storagePath: uploadedFile.storagePath,
                studentId,
                docId: uploadedFile.scannedArtefactId,
                extractedData,
                rollNumber,
                matchedStudentName,
              };
              this.scannedArtefacts.push(newArtefact);

              // Update local data references to keep in sync (prevents overwrite on next upload)
              if (!this.data.step.scannedArtefacts) {
                this.data.step.scannedArtefacts = [];
              }
              if (!this.data.step.scannedArtefacts.includes(uploadedFile.scannedArtefactId)) {
                this.data.step.scannedArtefacts.push(uploadedFile.scannedArtefactId);
              }
              if (!this.data.scannedArtefacts) {
                this.data.scannedArtefacts = [];
              }
              if (!this.data.scannedArtefacts.includes(uploadedFile.scannedArtefactId)) {
                this.data.scannedArtefacts.push(uploadedFile.scannedArtefactId);
              }
            };
          } else {
            console.error('uploadedFiles not present in response body: ' + responseBody);
          }
        } else {
          // Upload file to storage FIRST before calling extraction
          const filePath = this.storage.ref(storagePath);
          await filePath.put(file, { customMetadata: { original_name: fileName } });

          // Create scanned artefact document
          const scannedArtefact = {
            classroomId,
            institutionId,
            programmeId,
            learningUnitId,
            workflowId: workflow?.workflowId || '',
            fileName,
            storagePath,
            studentId: '',
          }
          const scannedArtefactId = await this.scannedArtefactsService.addNewScannedArtefact(scannedArtefact);

          const latestWorkflowSteps = workflow?.workflowSteps || [];
          const stepIndex = latestWorkflowSteps.findIndex(
            (step: any) => step.sequenceNumber === this.data.step.sequenceNumber
          );

          if (stepIndex !== -1) {
            if (!latestWorkflowSteps[stepIndex].scannedArtefacts) {
              latestWorkflowSteps[stepIndex].scannedArtefacts = [];
            }

            if (!latestWorkflowSteps[stepIndex].scannedArtefacts.includes(scannedArtefactId)) {
              latestWorkflowSteps[stepIndex].scannedArtefacts.push(scannedArtefactId);
            }

            await this.workflowsService.updateWorkflowSingleField(
              this.data.workflow.workflowId,
              'workflowSteps',
              latestWorkflowSteps
            );

            // Update local workflow reference to stay in sync
            workflow.workflowSteps = latestWorkflowSteps;
          }

          // Call extraction function AFTER file is uploaded
          const uploadedFile = { fileName, storagePath, scannedArtefactId };
          const extractionResponse = await this.sharedService.sendToCloudFunction(textExtractionUrl, uploadedFile);

          const index = (existingCount + i + 1).toString().padStart(3, '0');
          const rollNumber = `${institutionCode}${classroomCode}${index}`;

          const studentId = await this.updateStudentDetails(rollNumber, extractionResponse, storagePath);

          // Build extractedData as flat structure with fileName as key-value
          // Remove non-serializable properties before saving to Firestore
          const { headers, ok, status, statusText, url, type, ...serializableResponse } = extractionResponse;
          const extractedData = {
            fileName,
            ...serializableResponse,
            processedAt: new Date().toISOString()
          };

          // Save extractedData, rollNumber and studentId to the database
          await this.scannedArtefactsService.updateScannedArtefact(scannedArtefactId, {
            extractedData,
            rollNumber,
            studentId
          });

          const matchedStudentName = await this.getMatchedStudentName(studentId);
          const newArtefact = {
            ...scannedArtefact,
            studentId,
            docId: scannedArtefactId,
            extractedData,
            rollNumber,
            matchedStudentName,
          };
          this.scannedArtefacts.push(newArtefact);

          // Update local data references to keep in sync (prevents overwrite on next upload)
          if (!this.data.step.scannedArtefacts) {
            this.data.step.scannedArtefacts = [];
          }
          if (!this.data.step.scannedArtefacts.includes(scannedArtefactId)) {
            this.data.step.scannedArtefacts.push(scannedArtefactId);
          }
          if (!this.data.scannedArtefacts) {
            this.data.scannedArtefacts = [];
          }
          if (!this.data.scannedArtefacts.includes(scannedArtefactId)) {
            this.data.scannedArtefacts.push(scannedArtefactId);
          }
        };
      }
      this.uiService.alertMessage('Success', 'Successfully uploaded scanned artefacts', 'success');
      this.loadingSpinner = false;
    }
  }

  async updateStudentDetails(rollNumber: string, extractionResponse: any, storagePath?: string): Promise<string> {
    const customAuthentication: any = await lastValueFrom(this.customAuthenticationService.getByAccessCodeOnce(rollNumber));
    const studentId = customAuthentication?.[0]?.docId || '';
    if (studentId.length) {
      const { name } = extractionResponse.studentInfo || {};
      const [firstName, ...lastNameParts] = name ? name.split(' ') : ['', ''];
      const lastName = lastNameParts.join(' ');

      const { classroomId, programmeId, step, workflow } = this.data;
      const { assignmentId } = step?.contents?.[0] || {};
      const workflowId = workflow?.workflowId || '';

      try {
        if (storagePath) {
          const [utcDate, ip] = await this.deviceInfoService.getTime();
          const submissionMeta = { clientIp: ip, submissionTime: utcDate };
          const submissionId = 1;
          const type = 'IMAGE';
          const submissionEntries = [storagePath].map((submissionPath, index) => {
            const key = `submissionId_${submissionId}_${index}`;
            return { key, submissionPath, type };
          });

          const studentObj = {
            classroomId,
            programmeId,
          };
          const studentSubmissionRef = await lastValueFrom(this.assignmentService.getResources(studentId, studentObj));
          if (!studentSubmissionRef.exists) {
            const createObj: any = {
              studentId,
              createdAt: serverTimestamp(),
              submissionMeta: arrayUnion(submissionMeta),
              [`workflowId_${workflowId}`]: {
                [`assignmentId_${assignmentId}`]: {
                  lastAttemptTime: serverTimestamp(),
                  userAgent: navigator.userAgent,
                  clientIp: ip,
                  submissions: {}
                }
              },
              versions: {
                [`workflowId_${workflowId}`]: {
                  [`assignmentId_${assignmentId}`]: {}
                }
              }
            };
            await this.assignmentService.updateInSubmission(createObj, studentId, classroomId, programmeId);
          };

          // ✅ Update only the specific assignment + specific keys
          const updateObj: any = {
            [`workflowId_${workflowId}.assignmentId_${assignmentId}.lastAttemptTime`]: serverTimestamp(),
            [`workflowId_${workflowId}.assignmentId_${assignmentId}.userAgent`]: navigator.userAgent,
            [`workflowId_${workflowId}.assignmentId_${assignmentId}.clientIp`]: ip,
            submissionMeta: arrayUnion(submissionMeta)
          };

          // Add each file key separately (NO overwrite of other keys)
          for (const entry of submissionEntries) {
            const { key, submissionPath, type } = entry;
            updateObj[`workflowId_${workflowId}.assignmentId_${assignmentId}.submissions.${key}`] = {
              submissionPath,
              type
            };
          }

          const previousAttempts = studentSubmissionRef.exists && studentSubmissionRef.data()?.['versions'] && studentSubmissionRef.data()?.['versions'][`workflowId_${workflowId}`] && studentSubmissionRef.data()?.['versions']?.[`workflowId_${workflowId}`]?.[`assignmentId_${assignmentId}`]
            ? Object.keys(studentSubmissionRef.data()?.['versions']?.[`workflowId_${workflowId}`]?.[`assignmentId_${assignmentId}`])?.length
            : 0;

          // Versions per attempt (store the same submission keys)
          const attemptKey = `attempt${previousAttempts + 1}`;
          updateObj[`versions.workflowId_${workflowId}.assignmentId_${assignmentId}.${attemptKey}`] = {
            attemptNumber: previousAttempts + 1,
            lastAttemptTime: serverTimestamp(),
            userAgent: navigator.userAgent,
            clientIp: ip,
            submissions: submissionEntries.reduce((acc: any, e) => {
              acc[e.key] = { submissionPath: e.submissionPath, type: e.type };
              return acc;
            }, {})
          };
          await this.assignmentService.updateInSubmission(updateObj, studentId, classroomId, programmeId);
          await this.studentsService.updateSingleFieldInStudent(studentId, 'attemptedAssignments', arrayUnion(assignmentId));
        }

        await this.studentsService.updateSingleFieldInStudent(studentId, 'studentMeta.firstName', firstName);
        await this.studentsService.updateSingleFieldInStudent(studentId, 'studentMeta.lastName', lastName);
        this.uiService.alertMessage('Success', `Updated student name ${firstName} ${lastName}`, 'success');
        const contestRefs = await lastValueFrom(this.contestService.getAllContests());
        await Promise.all(contestRefs.docs.map(async doc => {
          const contestId = doc.id;
          const studentContestRef = await lastValueFrom(this.contestService.getStudentByContestAndDocId(studentId, contestId));
          const studentContest = studentContestRef.exists ? studentContestRef.data() : null;
          if (studentContest) {
            await this.contestService.updateStudentFieldInContest(studentId, contestId, 'firstName', firstName);
            await this.contestService.updateStudentFieldInContest(studentId, contestId, 'lastName', lastName);
            this.uiService.alertMessage('Success', `Updated student name in contest ${doc.get('contestName')}`, 'success');
          }
        }));
      } catch (error) {
        console.error('Error updating student info:', error);
        this.uiService.alertMessage('Error', `Failed to update student information for ${rollNumber} ${firstName} ${lastName}`, 'error');
      }
    }
    return studentId;
  }

  toggleDetails(artefact: any) {
    if (this.expandedArtefactId === artefact.docId) {
      this.expandedArtefactId = null;
    } else {
      this.expandedArtefactId = artefact.docId;
    }
  }

  isExpanded(artefact: any): boolean {
    return this.expandedArtefactId === artefact.docId;
  }

  getExtractedData(artefact: any): any {
    // Access the flattened extractedData object directly
    const extractedData = artefact?.extractedData;
    if (!extractedData || typeof extractedData !== 'object') return null;
    return extractedData;
  }

  getTableData(artefact: any): any[] {
    const extractedData = this.getExtractedData(artefact);
    if (!extractedData?.tableData) return [];

    const tableData = extractedData.tableData;
    const rows: any[] = [];

    Object.keys(tableData).forEach(rowKey => {
      if (rowKey !== 'raw' && rowKey !== 'temperatures') {
        const row = tableData[rowKey];
        if (row.raw) {
          rows.push({
            rowIndex: rowKey,
            raw: row.raw
          });
        }
        if (row.values) {
          Object.keys(row.values).forEach(valueKey => {
            rows.push({
              rowIndex: rowKey,
              columnIndex: valueKey,
              value: row.values[valueKey]
            });
          });
        }
      }
    });

    return rows;
  }

  getTemperatures(artefact: any): any[] {
    const extractedData = this.getExtractedData(artefact);
    if (!extractedData?.tableData?.temperatures) return [];

    const temperatures = extractedData.tableData.temperatures;
    const tempArray: any[] = [];

    Object.keys(temperatures).forEach(key => {
      tempArray.push({
        index: key,
        value: temperatures[key]
      });
    });

    return tempArray;
  }

  getRawText(artefact: any): string {
    const extractedData = this.getExtractedData(artefact);
    return extractedData?.rawText || 'No text extracted';
  }

  getStudentInfo(artefact: any): any {
    const extractedData = this.getExtractedData(artefact);
    return extractedData?.studentInfo || null;
  }

  getConfidence(artefact: any): number | null {
    const extractedData = this.getExtractedData(artefact);
    return extractedData?.confidence || null;
  }

  getTokenUsage(artefact: any): any {
    const extractedData = this.getExtractedData(artefact);
    return extractedData?.tokenUsage || null;
  }

  getProcessedAt(artefact: any): string {
    const extractedData = artefact?.extractedData;
    if (!extractedData || typeof extractedData !== 'object') return '';
    return extractedData.processedAt || '';
  }

  getFileName(artefact: any): string {
    return artefact?.fileName || '';
  }

  async matchToStudent(artefact: any) {
    this.editingArtefactId = artefact.docId;
    const extractedData = this.getExtractedData(artefact);
    this.editingStudentName = extractedData?.studentInfo?.name || '';
    // Use the artefact's rollNumber (the one stored at top level) as the editable value
    this.editingRollNumber = artefact?.rollNumber || '';
    // Reset validation state
    this.rollNumberValid = false;
    this.rollNumberValidating = false;
    this.rollNumberValidationMessage = '';
    // Validate the initial roll number
    if (this.editingRollNumber) {
      await this.validateRollNumber();
    }
  }

  isEditing(artefact: any): boolean {
    return this.editingArtefactId === artefact.docId;
  }

  cancelEdit() {
    this.editingArtefactId = null;
    this.editingStudentName = '';
    this.editingRollNumber = '';
    this.rollNumberValid = false;
    this.rollNumberValidating = false;
    this.rollNumberValidationMessage = '';
  }

  async validateRollNumber(): Promise<void> {
    if (!this.editingRollNumber || this.editingRollNumber.trim().length === 0) {
      this.rollNumberValid = false;
      this.rollNumberValidationMessage = 'Roll number is required';
      return;
    }

    this.rollNumberValidating = true;
    this.rollNumberValidationMessage = '';

    try {
      const customAuthentication: any = await lastValueFrom(
        this.customAuthenticationService.getByAccessCodeOnce(this.editingRollNumber.trim())
      );

      if (customAuthentication && customAuthentication.length > 0 && customAuthentication[0].docId) {
        this.rollNumberValid = true;
        this.rollNumberValidationMessage = '';
      } else {
        this.rollNumberValid = false;
        this.rollNumberValidationMessage = 'Roll number not available in classroom';
      }
    } catch (error) {
      console.error('Error validating roll number:', error);
      this.rollNumberValid = false;
      this.rollNumberValidationMessage = 'Error validating roll number';
    } finally {
      this.rollNumberValidating = false;
    }
  }

  async confirmEdit(artefact: any) {
    // Ensure roll number is valid before proceeding
    if (!this.rollNumberValid) {
      this.uiService.alertMessage('Error', 'Please enter a valid roll number', 'error');
      return;
    }

    try {
      // Initialize flattened structure if it doesn't exist
      if (!artefact.extractedData) {
        artefact.extractedData = {};
      }
      if (!artefact.extractedData.studentInfo) {
        artefact.extractedData.studentInfo = {};
      }

      // Update the flattened object with new name only (rollNumber is stored at top level, not in extractedData)
      artefact.extractedData.studentInfo.name = this.editingStudentName;

      // Build extractionResponse object to pass to updateStudentDetails
      const extractionResponse = {
        studentInfo: {
          name: this.editingStudentName
        }
      };

      // Call updateStudentDetails to update student name in students and contests collections
      const studentId = await this.updateStudentDetails(this.editingRollNumber, extractionResponse);

      // Update the scanned artefact with new extractedData, rollNumber, and studentId
      await this.scannedArtefactsService.updateScannedArtefact(artefact.docId, {
        extractedData: artefact.extractedData,
        rollNumber: this.editingRollNumber,
        studentId
      });

      // Update local artefact object
      artefact.rollNumber = this.editingRollNumber;
      artefact.studentId = studentId;
      // Update matched student name from the student document
      artefact.matchedStudentName = await this.getMatchedStudentName(studentId);

      this.uiService.alertMessage('Success', 'Student information updated successfully', 'success');
      this.cancelEdit();
    } catch (error) {
      console.error('Error updating student info:', error);
      this.uiService.alertMessage('Error', 'Failed to update student information', 'error');
    }
  }

}
