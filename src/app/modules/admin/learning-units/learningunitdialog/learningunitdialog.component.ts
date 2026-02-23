import { Component, OnInit, Inject, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { tactivity } from 'app/core/dbOperations/learningUnits/learningUnits.types';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
export interface tac {
  docId: string;
  code: string;
  displayName: string;
  headlineImage: string;
  isoCode: string;
  status: string;
  tacArchitect: string;
  tacMentor: string;
  tacOwner: string;
  version: string;
  creationDate: Date;
  checked: boolean;
}

@Component({
  selector: 'app-learningunitdialog',
  templateUrl: './learningunitdialog.component.html',
  styleUrls: ['./learningunitdialog.component.scss']
})

export class LearningunitdialogComponent implements OnInit, AfterViewInit {
  action: string;
  filteredData: tac[] = [];
  allLUList: tac[] = [];
  selectedLUCopy: any[];
  selectedLUtype: string;
  iscontentChanged = false;
  removeArray: any[] = [];
  selectedLu: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<LearningunitdialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: tactivity[],
    private LUservice: LearningUnitsService
  ) {
    this.allLUList = data['allLUList'];
    this.selectedLu = data['selectedLUList'];
    this.selectedLUCopy = JSON.parse(JSON.stringify(this.selectedLu));
    this.filteredData = data['allLUList'];
    this.selectedLUtype = data['luType'];
    this.LUservice.isassociatedContentChanged.next(this.selectedLUCopy);
  }
  checkSelected(el) {
    return this.selectedLu.filter(d => el.docId == d?.docId)?.length ? true : false;
  }

  ngOnInit(): void {
    this.allLUList = this.allLUList.map((obj) => {
      this.selectedLu.forEach(function(data) {
        if (obj.docId == data.docId) {
          obj['checked'] == true;
        }
        else {
          obj['checked'] == false;
        }
      });
      return obj;
    });
  }

  ngAfterViewInit(): void {
  }

  tactivitySearchInput(event: any) {
    const searchInput = event.target.value.toLowerCase();

    this.filteredData = this.allLUList?.filter((tac: any) => tac.learningUnitName.toLowerCase().includes(searchInput)
      || tac.learningUnitCode.toString().toLowerCase().includes(searchInput));
  }

  close() {
    if (this.selectedLUCopy.length != this.selectedLu.length) {
      this.iscontentChanged = true;
    }
    else {
      this.iscontentChanged = false;
    }
    this.action = 'add';
    this.dialogRef.close({ event: this.action, data: this.selectedLu, contentChanged: this.iscontentChanged });
  }

  toggleSelection(checkbox: any, data: any) {
    if (checkbox.checked) {
      this.action = 'add';
      this.allLUList.forEach((obj) => {
        if (obj.docId == data.docId) {
          this.selectedLu.push(data);
        }
      });
    }
    else {
      this.action = 'remove';
      this.removeArray.push(data);
      this.allLUList.map((obj) => {
        if (obj.docId == data.docId) {
          this.selectedLu = this.selectedLu.filter((elem) => {
            if (data.docId.includes(elem.docId)) {
              return false;
            } else {
              return true;
            }
          });
        }
      });
    }
    if (this.selectedLUCopy.length != this.selectedLu.length) {
      this.iscontentChanged = true;
    }
    else {
      this.iscontentChanged = false;
    }
    this.LUservice.isassociatedContentChanged.next({ selectedLU: this.selectedLu, type: this.selectedLUtype, action: this.action, removeLUs: this.removeArray });
  }

}
