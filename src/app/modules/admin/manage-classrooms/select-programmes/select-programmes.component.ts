import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { LearningDetailsComponent } from './learning-details/learning-details.component';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { deleteField } from '@angular/fire/firestore';

@Component({
  selector: 'app-select-programmes',
  templateUrl: './select-programmes.component.html',
  styleUrls: ['./select-programmes.component.scss']
})
export class SelectProgrammesComponent implements OnInit {
  @Input() stepper: MatStepper;
  @Input() stepperData: BehaviorSubject<any>;
  @Input() inputSelectedClsSub: BehaviorSubject<any>;
  @Input() allProgrammes;
  @Input() allClassrooms;
  @Output() onSubmitAlert: EventEmitter<any> = new EventEmitter();
  currentProgrammesChanged: any[] = [];
  checked: boolean = false;
  filteredProgrammes;
  selectedProgrammes: any[] = [];
  previousProgrammes: any;
  filterProgrammes: any[] = [];
  selectProgrammeForm: FormGroup;
  clonedArray;
  allprogramsCopy;

  constructor(
    private fb: FormBuilder,
    private classroomService: ClassroomsService,
    private uiService: UiService,
    private masterService: MasterService,
    private teacherService: TeacherService,
    private studentService: StudentsService,
    private institutionService: InstitutionsService,
    private dialog: MatDialog,
    private learningUnitService: LearningUnitsService,

  ) {
  }

  async ngOnInit() {
    this.allprogramsCopy = this.allProgrammes;
    const updatedPro = this.allProgrammes.filter(e => e?.institutionId == this.inputSelectedClsSub.value.institutionId && e?.grades.includes(this.inputSelectedClsSub.value.grade));
    this.filteredProgrammes = updatedPro;
    this.allProgrammes = updatedPro;
    this.allProgrammes = this.allProgrammes.map(prog => ({ programmeName: prog.programmeName, programmeId: prog.programmeId, programmeCode: prog.programmeCode, displayName: prog.displayName ? prog.displayName : prog.programmeName }));
    this.selectProgrammeForm = this.fb.group({
      selectedProgrammeList: [[], [Validators.required]],
    });
    const classroom = await lastValueFrom(this.classroomService.getClassroomByIdOnce(this.inputSelectedClsSub.value.docId));
    const currentClassroom = classroom.data();
    const merged = { ...this.inputSelectedClsSub.value, ...currentClassroom };
    this.setSelectedClsProg(this.inputSelectedClsSub?.value, merged);
  }

  setSelectedClsProg(cls, merged) {
    const selectedclassroom: any = merged;
    const selectedProgrammeList = [];
    for (const [key, value] of Object.entries(selectedclassroom.programmes)) {
      selectedProgrammeList.push(value);
    }
    this.clonedArray = JSON.parse(JSON.stringify(selectedProgrammeList));
    this.selectProgrammeForm?.patchValue({
      selectedProgrammeList: selectedProgrammeList
    });
    const filterProgArr = this.allProgrammes.filter(elem => !selectedProgrammeList.find(({ programmeId }) => elem.programmeId === programmeId));/* .filter(prog => prog['programmeId'] != selectedProgrammeList.find(sCls => sCls.programmeId)) */
    this.allProgrammes = filterProgArr;
    this.filterProgrammes = filterProgArr;
    this.filteredProgrammes = this.filteredProgrammes.filter(elem => !selectedProgrammeList.find(({ programmeId }) => elem.programmeId === programmeId));
    this.selectedProgrammes = selectedProgrammeList;
    this.previousProgrammes = selectedProgrammeList;
  }

  drop(event: CdkDragDrop<string[]>) {
    setTimeout(async () => {
      // if programme is added from programme list (left -> right)
      if (parseInt(event?.container?.id?.slice(-1)) - 1 === parseInt(event?.previousContainer?.id?.slice(-1))) {
        const title = 'Set locking details for this programme\'s learning units';
        const programmeDetails = await this.openDialogAndGetDetailsOnClose(title, event?.container?.data[event?.currentIndex]);
        if (programmeDetails && Object.keys(programmeDetails).length > 0) {
          // add the programmeDetails to the classroom's programmes list
          // this.classroom.programmes = programmeDetails;
        };
      };
    }, 0);
    // if programme is removed (left <- right)
    if (parseInt(event?.container?.id?.slice(-1)) + 1 === parseInt(event?.previousContainer?.id?.slice(-1))) {
      const programmeToDelete = event.previousContainer.data[event.previousIndex]['programmeId'];
      // delete this.classroom.programmes[programmeToDelete];
    };
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer?.data,
        event?.container.data,
        event?.previousIndex,
        event?.currentIndex);
    }
  }
  // operation = (list1, list2, isUnion = false) =>
  //   list1.filter(a => isUnion === list2.some(b => a.userId === b.userId));

  async editLearningUnitDetails(programme: any) {
    const title = 'Edit locking details for this programme\'s learning units';
    const programmeDetails = await this.openDialogAndGetDetailsOnClose(title, programme);
    // let assignmentDetails: any;
    // if (this.addNewTemplateFlag) {
    //   assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, { ...assignment, ...this.assignment[assignment.docId][assignment.docId] });
    // } else {
    //   assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, assignment);
    // };
    // if (assignmentDetails && Object.keys(assignmentDetails).length > 0) {
    //   const assignmentId = assignmentDetails.assignmentId;
    //   if (!this.addNewTemplateFlag) {
    //     this.templateDetails.assignmentIds[assignmentId] = assignmentDetails;
    //   } else {
    //     this.assignment[assignmentId] = assignmentDetails;
    //   };
    // };
  }

  async openDialogAndGetDetailsOnClose(title: string, programmeData: any) {
    const importDialogModule = await import('../../manage-classrooms/select-programmes/learning-details/learning-details.module');
    if (Object.keys(importDialogModule).includes('LearningDetailsModule')) {
      const dialogRef = this.dialog.open(LearningDetailsComponent, {
        data: {
          title: title,
          programmeData,
          classroomDetails: this.inputSelectedClsSub.value
        }
      });
      dialogRef.afterClosed().subscribe((result) => {
        const currentProgramchanged = this.learningUnitService.currentLearningUnitinLockinginterface.value;
        const index = this.selectProgrammeForm.get('selectedProgrammeList').value.findIndex((prog: any) => prog.programmeId == currentProgramchanged.programmeId);
        if (index > -1) {
          // this.selectProgrammeForm.get('selectedProgrammeList').value[index].workflowLocked = currentProgramchanged.workflowLocked
          this.selectProgrammeForm.get('selectedProgrammeList').value[index].workflowIds = currentProgramchanged.workflowIds;
          this.selectProgrammeForm.get('selectedProgrammeList').value[index].sequentiallyLocked = currentProgramchanged.sequentiallyLocked;

          // Update individual fields in the FormGroup
          this.selectProgrammeForm.patchValue({
            // sequentiallyLocked: currentProgramchanged.sequentiallyLocked,
            // workflowIds: currentProgramchanged.workflowIds
            selectedProgrammeList: this.selectProgrammeForm.get('selectedProgrammeList').value
          });
        }
      });
      return await lastValueFrom(dialogRef.afterClosed());
    };
  }

  onSlideToggleChange(event: any, index: any) {
    this.selectProgrammeForm.get('selectedProgrammeList').value[index].sequentiallyLocked = event.checked;
  }

  checkNonExistProgramme(currentArray: [], previousArray: []) {
    let filterArray = [];
    if (!currentArray.length && !previousArray.length) {
      filterArray = [];
    }
    if (currentArray.length && previousArray.length) {
      previousArray.forEach((pDoc: any) => {
        const i = currentArray.findIndex((cDoc: any) => cDoc.programmeId == pDoc.programmeId);
        if (i == -1) {
          filterArray.push(pDoc);
        }
      });
    }
    if (!currentArray.length && previousArray.length > 0) {
      filterArray = previousArray;
    }
    if (currentArray.length && !previousArray.length) {
      filterArray = [];
    }
    return filterArray;
  }

  async checkProgrammeInTeacherAndStuduent(filterArray: []) {
    const clsId = this.inputSelectedClsSub.value['classroomId'];
    const query: QueryFn = (ref: CollectionReference) =>
      ref.where(`classrooms.${clsId}.classroomId`, '==', clsId);
    const teacherDocsArr: [] = await lastValueFrom(this.teacherService.getWithQuery(query));
    if (teacherDocsArr.length) {
      teacherDocsArr.forEach((doc: any) => {
        const pr = doc.classrooms[clsId];
        if (pr.hasOwnProperty('programmes'))
          {filterArray.forEach((programme: any) => {
            const pId = programme.programmeId;

            const i = pr['programmes'].findIndex(programmeObj => programmeObj.programmeId == pId);

            if (i > -1) {
              pr['programmes'].splice(i, 1);
            }
            if (!pr['programmes'].length) {
              delete doc.classrooms[clsId];
            }
          });}
        this.teacherService.setTeacher(doc.docId, doc).catch((err) => {
          console.error(err);
        });
      });
    }
    const stuedntDocsArr: [] = await lastValueFrom(this.studentService.getWithQuery(query));
    if (stuedntDocsArr.length) {
      for (const studentDoc of stuedntDocsArr) {
        const doc: any = studentDoc;
        const pr = doc?.classrooms[clsId];
        if (pr.hasOwnProperty('programmes'))
          {filterArray.forEach((programme: any) => {
            const pId = programme.programmeId;
            const i = pr['programmes'].findIndex(programmeObj => programmeObj.programmeId == pId);
            if (i > -1) {
              pr['programmes'].splice(i, 1);
            }
          });}
        this.studentService.setStudent(doc.docId, doc).catch((err) => {
          console.error(err);
        });
      }
      // stuedntDocsArr.forEach((doc: any) => {
      // const pr = doc.classrooms[clsId]
      // if (pr.hasOwnProperty('programmes'))
      //   filterArray.forEach((programme: any) => {
      //     const pId = programme.programmeId
      //     const i = pr['programmes'].findIndex(programmeObj => {
      //       return programmeObj.programmeId == pId
      //     })
      //     if (i > -1) {
      //       pr['programmes'].splice(i, 1)
      //     }
      //   })
      // this.studentService.setStudent(doc.docId, doc).catch(err => {
      //   console.error(err)
      // })
      // })
    }
  }

  async onSubmit(form) {
    const currentArr = form.value['selectedProgrammeList'];
    const previousArr = this.clonedArray;
    const filterArray: any = this.checkNonExistProgramme(currentArr, previousArr);
    this.checkProgrammeInTeacherAndStuduent(filterArray);
    const updatedProgrammes = form.value['selectedProgrammeList'];
    const programmes = {};
    const programmesforMaster = {};

    updatedProgrammes.map((prog) => {
      programmes[`${prog.programmeId}`] = {
        programmeName: prog.programmeName,
        programmeId: prog.programmeId,
        programmeCode: prog.programmeCode,
        displayName: prog.displayName ? prog.displayName : prog.programmeName,
        workflowIds: prog.workflowIds || [],
        sequentiallyLocked: prog.sequentiallyLocked || false
      };

      programmesforMaster[`${prog.programmeId}`] = {
        programmeName: prog.programmeName,
        programmeId: prog.programmeId,
        programmeCode: prog.programmeCode,
        displayName: prog.displayName ? prog.displayName : prog.programmeName
      };
    });

    const updateProgramme = {
      programmes: programmes
    };

    const updateProgrammeforRepresentatvies = {
      programmes: programmesforMaster
    };

    try {
      this.updateRepresentative(updateProgrammeforRepresentatvies);
      const clsId = this.inputSelectedClsSub.value['classroomId'];
      const updatedCls = Object.assign(this.inputSelectedClsSub.value, { programmes: programmesforMaster });
      const pr = updatedCls.programmes;
      const keys = Object.keys(pr);
      // keys.forEach(k => {
      //   if (pr[k].hasOwnProperty('workflowIds')) {
      //     delete pr[k]['workflowIds']
      //   }
      // })

      // const masterClsDoc = this.allClassrooms
      // const indexNum = masterClsDoc.findIndex(doc => doc.docId == updatedCls.docId);
      // masterClsDoc[indexNum] = Object.assign(masterClsDoc[indexNum], updatedCls)
      // await this.updateMasterDoc(updatedCls, masterClsDoc)
      await this.classroomService.updateClsProgrammes(updateProgramme, clsId);
      const masterClsDoc = this.allClassrooms;
      const indexNum = masterClsDoc.findIndex(doc => doc.docId == updatedCls.docId);
      masterClsDoc[indexNum] = Object.assign(masterClsDoc[indexNum], updatedCls);
      const programmesToRemove = this.allProgrammes.map((prog: any) => prog.programmeId);
      await this.updateMasterDoc(updatedCls, programmesToRemove);
      this.uiService.alertMessage('Successful', 'Updated Classroom-Programmes', 'success');
      this.inputSelectedClsSub.next(updatedCls);
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error updating Classroom-Programmes', 'error');
      console.error('Error updating  Classroom-Programmes: ', error);
    }

    this.onSubmitAlert.emit(this.inputSelectedClsSub.value);
  }

  updateRepresentative(programmes) {
    const institutionId = this.inputSelectedClsSub.value.institutionId;
    this.institutionService.getWithIdWithGetMethod(institutionId).subscribe(async (res) => {
      const query: QueryFn = (ref: CollectionReference) =>
        ref.where('teacherMeta.countryCode', '==', res?.data()?.representativeCountryCode).where('teacherMeta.phoneNumber', '==', res?.data()?.representativePhoneNumber);
      const teacherDocsArr = await lastValueFrom(this.teacherService.getWithQuery(query));

      if (teacherDocsArr.length) {
        const representativeDoc = teacherDocsArr[0];
        const clsId = this.inputSelectedClsSub.value['classroomId'];

        if (representativeDoc.classrooms.hasOwnProperty(clsId)) {
          representativeDoc.classrooms[clsId]['programmes'] = programmes;
          delete representativeDoc.updatedAt;
          this.teacherService.updateTeacher(representativeDoc, representativeDoc.docId).catch((err) => {
            console.error(err);
          });
        }

      }

    });
  }

  onCheckboxChange(event) {
    if (!this.checked) {
      this.allProgrammes = this.filteredProgrammes.map(prog => ({ programmeName: prog?.programmeName, programmeId: prog.programmeId, programmeCode: prog.programmeCode, displayName: prog?.displayName ? prog?.displayName : prog?.programmeName }));
    } else {
      this.allProgrammes = this.allprogramsCopy.map(prog => ({ programmeName: prog?.programmeName, programmeId: prog.programmeId, programmeCode: prog.programmeCode, displayName: prog?.displayName ? prog?.displayName : prog?.programmeName }));
    }
  }

  async updateMasterDoc(selectedClassroom: any, programmesToBeRemoved: any) {
    const { docId, masterDocId, programmes } = selectedClassroom;
    for (const programmeId in programmes) {
      this.masterService.updateMasterDocField(masterDocId, docId, 'classrooms', `programmes.${programmeId}`, programmes[programmeId]);
    };
    programmesToBeRemoved.forEach((progId: any) => {
      this.masterService.updateMasterDocField(masterDocId, docId, 'classrooms', `programmes.${progId}`, deleteField());
    });
  }

  searchProgrammeInput(ev: any) {
    const val = ((ev?.target?.value)?.toString()).toLowerCase();
    if (val && val.trim() != '' && this.checked) {
      this.allProgrammes = this.allprogramsCopy.filter(item => item.programmeName.toLowerCase().includes(val.toLowerCase()));
    }
    else {
      this.allProgrammes = this.allprogramsCopy;
    }
  }

}
