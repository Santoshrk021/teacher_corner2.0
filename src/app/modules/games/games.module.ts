import { AfterViewInit, ChangeDetectorRef, Component, HostListener, Input, NgModule, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Route } from '@angular/router';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UiService } from 'app/shared/ui.service';
import { update } from 'lodash';
@Component({
  selector: 'app-game',
  template: `
  <div class="img">
  <iframe [src]="gameURL" frameborder="20" height="400" width="700" scrolling="no" id="ifr" ></iframe>

  </div>
  <!-- <button color="primary"(click)="submitTeachersGamedata()">update</button> -->

  `,
  // styles: ['']
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() gameUrl: string;
  @Input() content: any;
  @Input() assignmentId: any;
  @Input() index: number;
  @Input() gameIndex: number;
  @Input() workflowContents: number;
  subscriptions = [];
  studentObj;
  gameURL: any;
  changedGamedata: any;
  userName;
  allGames: any[] = [];
  userData;
  newURL;
  userPhone;
  currentGameId: string;
  currentPlayinggame;
  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private userService: UserService,
    private assignmentService: AssignmentsService,
    private afAuth: AngularFireAuth,
    private uiService: UiService
  ) {
    this.allGames;
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((elem) => {
      elem.unsubscribe();
    });
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.cdr.detectChanges();
  }

  ngOnChanges(changes): void {
    if (changes.gameIndex) {
      this.newURL = this.workflowContents[this.gameIndex]?.resourcePath;
      this.assignmentId = this.workflowContents[this.gameIndex]?.assignmentId;
      this.getCredentials();
      this.getUserCurrentData();
      this.cdr.detectChanges();
    }
  }

  getUserCurrentData() {
    const subscription1 = this.assignmentService.getTeachersResources(this.userData).subscribe((d: any) => {
      if (typeof (d.data()) !== 'undefined') {
        if (typeof (d.data().game) != 'undefined' || d.data().game != null) {
          this.allGames = d.data().game;
          this.getUserPlayedgamedata(d.data().game);
          if (this.currentPlayinggame != null) {
            this.uiService.alertMessage('Message', `Welcome back ${this.userName}. Your progress as of ${this.currentPlayinggame[this.assignmentId].LastSaved} has been restored`, 'primary');
          }
          else {
            this.uiService.alertMessage('Message', `Welcome ${this.userName}.`, 'primary');
          }
        }
        else {
          this.allGames = [];
          this.getUserPlayedgamedata(this.allGames);
          this.uiService.alertMessage('Message', `Welcome ${this.userName}.`, 'primary');
        }
      } else {
        this.allGames = [];
        this.getUserPlayedgamedata(this.allGames);
        this.uiService.alertMessage('Message', `Welcome ${this.userName}.`, 'primary');
      }
    });
    this.subscriptions.push(subscription1);
    this.cdr.detectChanges();
  }

  async getUserPlayedgamedata(games: any) {
    const currentgameId = '';
    let gameIndex;
    //----------------------------handling arrays method 2---------------------//
    const game = games.find(elem => elem[Object.keys(elem)[0]].gameId == this.workflowContents[this.gameIndex].assignmentId);
    if (game) {
      this.currentPlayinggame = game;
    }
    else {
      this.currentPlayinggame = null;
    }
    //-------------------------------------------------------------------------//
    setTimeout(() => {
      const updatedUserdata = {
        userCredentials: this.userData,
        currentGamedata: this.currentPlayinggame,
        gamesData: this.allGames
      };
      this.sendUserCredentials(updatedUserdata);
    }, 1500);
    this.cdr.detectChanges();
  }

  getCredentials() {
    const subscription4 = this.userService.user$
      .pipe()
      .subscribe((user: any) => {
        this.userPhone = (user.teacherMeta.countryCode + user.teacherMeta.phoneNumber);
        this.userName = user.teacherMeta.fullNameLowerCase;
      });
    this.subscriptions.push(subscription4);
    let subscription2;
    this.gameURL = this.sanitizer.bypassSecurityTrustResourceUrl(this.gameUrl);
    subscription2 = this.route.queryParams.subscribe((params: any) => {
      this.studentObj = {
        institutionId: params['institutionId'],
        classroomId: params['classroomId'],
        programmeId: params['programmeId'],
      };
    });
    this.subscriptions.push(subscription2);
    const subscription3 = this.userService.user$.subscribe((data: any) => {
      this.userData = {
        institutionId: this.studentObj.institutionId,
        classroomId: this.studentObj.classroomId,
        programmeId: this.studentObj.programmeId,
        docId: data.docId,
        assignmentId: this.assignmentId,
        url: this.newURL,
        phone: this.userPhone
      };
    });
    this.currentGameId = this.workflowContents[this.gameIndex]?.assignmentId;
    this.subscriptions.push(subscription3);
    this.cdr.detectChanges();
  }

  sendUserCredentials(data: any) {
    if (this.index == 0) {
      const iframeId = 'ifr';
      const iframe = document.getElementById(iframeId);
      const iWindow = (iframe as HTMLIFrameElement).contentWindow;
      console.log('data posted');
      console.log(data);
      setTimeout(() => {
        iWindow.postMessage(data, this.newURL);
      }, 2000);
    }
    this.cdr.detectChanges();
  }

  @HostListener('window:message', ['$event'])
  onWindowMessage(event: MessageEvent): void {
    const lastSlashIndex = this.newURL.lastIndexOf('/');
    const reducedUrl = this.newURL.substring(0, lastSlashIndex);
    if (event.origin == this.newURL) {
      const data = event.data;
      if (typeof (event.data) == 'object') {
        this.assignmentService.updateTeachersSubmission(event.data, this.studentObj);
      }
      // Process the data as needed
    }
    this.cdr.detectChanges();

  }
}

@NgModule({
  declarations: [GameComponent],
  imports: [
    CommonModule
  ],
  exports: [
    GameComponent
  ]
})
export class GamesModule { }
