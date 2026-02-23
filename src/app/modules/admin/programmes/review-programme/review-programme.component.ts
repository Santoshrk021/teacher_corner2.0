import { Component, Input, OnInit } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UiService } from 'app/shared/ui.service';
import { ProgramInfoComponent } from '../program-info/program-info.component';
import { MatDialogRef } from '@angular/material/dialog';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { take } from 'rxjs';
import { MasterService } from 'app/core/dbOperations/master/master.service';
interface program {
  programmeName: string;
  programmeDesc: string;
  programmeStatus: string;
  programmeImage: string;
  selectedLearninglist: [];
  selectedAssignments: {};
  type: string;
}

@Component({
  selector: 'app-review-programme',
  templateUrl: './review-programme.component.html',
  styleUrls: ['./review-programme.component.scss']
})
export class ReviewProgrammeComponent implements OnInit {
  @Input() stepperData: BehaviorSubject<program>;
  @Input() stepper: MatStepper;
  @Input() addNewProgramFlag: string;

  programData: any;
  loginSpinner: boolean = false;

  constructor(
    private programmeService: ProgrammeService,
    public dialogRef: MatDialogRef<ProgramInfoComponent>,
    private uiService: UiService,
    private configService: ConfigurationService,
    private masterService: MasterService
  ) { }

  ngOnInit(): void {
    this.stepperData.subscribe((data) => {
      this.programData = data;
    });
  }

  async programSave() {
    this.loginSpinner = true;
    const {
      age,
      assignmentIds,
      displayName,
      grades,
      institutionId,
      institutionName,
      programmeCode,
      programmeDesc: programmeDescription,
      programmeImage: programmeImagePath,
      programmeName,
      programmeStatus,
      selectedLearninglist,
      type,
    } = this.programData;

    const learningUnitsIds = selectedLearninglist?.map((d: any) => d['docId']);

    const programmeData = {
      age,
      assignmentIds,
      displayName,
      grades,
      institutionId,
      institutionName,
      learningUnitsIds,
      masterDocId: '',
      programmeCode,
      programmeDescription,
      programmeImagePath: programmeImagePath ?? '',
      programmeName,
      programmeStatus,
      type,
    };

    const programmeMasterData = {
      assignmentIds,
      displayName,
      docId: '',
      grades,
      institutionId,
      institutionName,
      learningUnitsIds,
      programmeCode,
      programmeDescription,
      programmeId: '',
      programmeImagePath: programmeImagePath ?? '',
      programmeName,
      programmeStatus,
      type,
    };

    try {
      const programmeId = await this.programmeService.addNewProgramme(programmeData);
      programmeMasterData.programmeId = programmeId;
      programmeMasterData.docId = programmeId;
      const masterDocId = await this.masterService.addNewObjectToMasterMap('PROGRAMME', 'programmes', programmeMasterData);
      programmeData.masterDocId = masterDocId;
      await this.programmeService.updateProgrammeSingleField(programmeId, 'masterDocId', masterDocId);

      // // increment programme code only once
      this.programmeCodeIncrement();

      // Display success message and close the dialog
      this.uiService.alertMessage('Successful', 'Programme Created Successfully', 'success');
      this.loginSpinner = false;
      this.dialogRef.close(programmeMasterData);
    } catch (error) {
      // Handle error
      console.error('Error saving programme:', error);
      this.uiService.alertMessage('Error', 'Failed to create programme', 'error');
      this.loginSpinner = false;
    }
  }

  programmeCodeIncrement() {
    this.configService.getCounters().pipe(take(1)).subscribe((res) => {
      const pCode = this.addOne(res.programmeCode);
      this.configService.incrementProgrammeCodeCounter(pCode);
    });
  }

  addOne(s) {
    let newNumber = '';
    let continueAdding = true;
    for (let i = s.length - 1; i >= 0; i--) {
      if (continueAdding) {
        const num = parseInt(s[i], 10) + 1;
        if (num < 10) {
          newNumber += num;
          continueAdding = false;
        } else {
          newNumber += '0';
        }
      } else {
        newNumber += s[i];
      }
    }
    return newNumber.split('').reverse().join('');
  }

}
