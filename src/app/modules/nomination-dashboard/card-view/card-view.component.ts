import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddNominationComponent } from '../add-nomination/add-nomination.component';
import { lastValueFrom } from 'rxjs';
import { RamanAwardService } from 'app/core/dbOperations/ramanAward2023/ramanAward.service';
import { Router } from '@angular/router';
import { NominationService } from '../nomination.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';

@Component({
  selector: 'app-card-view',
  templateUrl: './card-view.component.html',
  styleUrls: ['./card-view.component.scss']
})
export class CardViewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() grade;
  @Input() stageInfo;
  @Input() nominatedObjSub;
  @Input() institutionInfo;
  @Input() contest;

  nominatedObj: any;
  nSub: any;

  isNominationException: boolean = false;
  teacherCountryCode: string;
  today: number;

  constructor(
    public dialog: MatDialog,
    private constestService: ContestService,
    private router: Router,
    private nominationService: NominationService,
    private teacherService: TeacherService,
    private afAuth: AngularFireAuth,
  ) { }

  ngOnDestroy(): void {
    this.nSub.unsubscribe();
  }

  async ngOnInit(): Promise<void> {
    const teacherDetails = this.teacherService?.currentTeacher?.value === null ? await this.getCurrentTeacherDetails() : this.teacherService?.currentTeacher?.value;
    const countryCode = teacherDetails?.teacherMeta?.countryCode;
    this.teacherCountryCode = countryCode;
    this.isNominationException = teacherDetails?.stage2_nomination_exception;
    this.nSub = this.nominatedObjSub.subscribe((res) => {
      this.nominatedObj = res;
    });
  }

  ngOnChanges() {


    this.today = Date.now() / 1000;
    const currentYear = new Date(this.today * 1000).getFullYear();
    if (this.contest?.contestTitle !== `Raman Award ${currentYear}`) {
      this.isNominationException = false;
    };
  }

  async getCurrentTeacherDetails() {
    const currentUser = await this.afAuth.currentUser;
    const teacherDetails = await lastValueFrom(this.teacherService.getTeacherByIdOnce(currentUser.uid));
    return teacherDetails.data();
  }

  async addNomination() {

    await import('../add-nomination/add-nomination.module').then(() => {
      const contestColName = this.contest.contestTitle.replace(
        /\s/g,
        ''
      );
      this.dialog.open(AddNominationComponent, {
        data: { grade: this.grade.grade, institutionInfo: this.institutionInfo, nominationNo: this.nominatedObj[this.grade.grade], newStudent: true, collName: contestColName, contestInfo: this.contest }
      }).afterClosed().subscribe(async () => {

        if (this.institutionInfo) {

          const nInstituteDoc: any = await this.getInstitutionDoc(this.institutionInfo.institutionId);

          if (nInstituteDoc) {
            this.nominatedObjSub.next(nInstituteDoc.nominationsByClasses);
          }

        }
      });
    });
  }

  async getInstitutionDoc(institutionId) {
    const contestId = this.contest.docId;
    return this.constestService.getInstitutionDoc(institutionId, contestId);
  }

  viewNomination() {

    // this.router.navigate(['nomination-dashboard', 'nominations'], { queryParamsHandling: "merge" })
    this.router.navigate(['nominations'], { queryParamsHandling: 'merge' });
    this.nominationService.nominationViewGrade.next(this.grade.grade);
    this.nominationService?.institutionId.next(this.institutionInfo?.institutionId);
  }

  addNominationTooltip(nominationsExceeded: any) {
    if (this.isNominationException) {
      return '';
    };

    if (nominationsExceeded && this.today < this.stageInfo?.endDate?.seconds) {
      return 'You Have Reached Maximum Nominations';
    }

    if (this.today > this.stageInfo?.nominationEndDate?.seconds) {
      // const day = this.contest?.contestStartDate?.seconds.getDate();
      // const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.contest?.contestStartDate?.seconds);
      // const year = this.contest?.contestStartDate?.seconds.getFullYear();
      const seconds = this.stageInfo?.nominationEndDate?.seconds;
      let day; let month; let year;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
      ];
      if (seconds != null) {
        const date = new Date(seconds * 1000); // Convert seconds to milliseconds
        day = date.getDate();
        month = monthNames[date.getMonth()]; // Months are zero-based
        year = date.getFullYear();
      } else {
        day = month = year = null; // Handle the case where seconds is undefined or null
      }
      return `Nominations to Stage 2 ended on the ${day}th of ${month}, ${year}; no additions are possible at this time`;
    }
  }

  setFallbackImage(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '../../../assets/images/logo/Thinktac-circle-logo.png';
  }
}
