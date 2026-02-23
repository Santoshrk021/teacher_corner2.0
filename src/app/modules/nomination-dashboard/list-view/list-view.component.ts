import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddNominationComponent } from '../add-nomination/add-nomination.component';
import { lastValueFrom } from 'rxjs';
import { RamanAwardService } from 'app/core/dbOperations/ramanAward2023/ramanAward.service';
import { Router } from '@angular/router';
import { NominationService } from '../nomination.service';

@Component({
  selector: 'app-list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss']
})
export class ListViewComponent implements OnInit,OnChanges ,OnDestroy{
  @Input() grade;
  @Input() stageInfo;
  @Input() nominatedObjSub;
  @Input() institutionInfo;
  @Input() contest;

  nominatedObj: any;
  nSub: any;

  constructor(
    public dialog: MatDialog,
    private ramanAwardService: RamanAwardService,
    private router: Router,
    private nominationService: NominationService

    ) { }
  ngOnDestroy(): void {
    this.nSub.unsubscribe();
  }
  gradeList = ['3', '4', '5', '6', '7', '8', '9', '10'];

  ngOnInit(): void {
  this.nSub= this.nominatedObjSub.subscribe((res) => {
      this.nominatedObj = res;
    });
  }

  ngOnChanges(){
    console.log(this.nominatedObj);

  }
  async addNomination(grade) {
    await import('../add-nomination/add-nomination.module').then(() => {
      this.dialog.open(AddNominationComponent, {
        data: { grade: grade, institutionInfo: this.institutionInfo, nominationNo: this.nominatedObj[grade] }
      }).afterClosed().subscribe(async () => {
        if (this.institutionInfo) {
          const nInstituteDoc: any = await this.getInstitutionDoc(this.institutionInfo.institutionId);
          this.nominatedObjSub.next(nInstituteDoc.data()?.nominationsByClasses);
        }
      });
    });
  }
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  async getInstitutionDoc(institutionId) {
    const contestColName = this.contest.contestTitle.replace(
        /\s/g,
        ''
    );
    if(contestColName=='RamanAward2024'){
        const raman2024='RamanAward2024/--InstitutionNomination--/Institutions';
        return await lastValueFrom(this.ramanAwardService.getInstitutionDoc(institutionId,raman2024));

    }
    else{
        const raman2023='RamanAward2023/InstitutionNomination/Institutions';
        return await lastValueFrom(this.ramanAwardService.getInstitutionDoc(institutionId,raman2023));
    }
    // return await lastValueFrom(this.ramanAwardService.getInstitutionDoc(institutionId))
  }
  viewNomination(grade) {
    this.router.navigate(['nomination-dashboard', 'nominations'], { queryParamsHandling: 'merge' });
    this.nominationService.nominationViewGrade.next(grade);
    this.nominationService.institutionId.next(this.institutionInfo?.institutionId);
  }
}
