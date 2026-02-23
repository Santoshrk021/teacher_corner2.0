import { Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { SideNavigationService } from 'app/shared/navigation.service';
import { UserService } from 'app/shared/user.service';
import { Subject, take, takeUntil } from 'rxjs';

export interface Course {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  duration?: number;
  steps?: {
    order?: number;
    title?: string;
    subtitle?: string;
    content?: string;
  }[];
  totalSteps?: number;
  updatedAt?: number;
  featured?: boolean;
  progress?: {
    currentStep?: number;
    completed?: number;
  };
}
@Component({
  selector: 'app-tactivity-stepper',
  templateUrl: './tactivity-stepper.component.html',
  styleUrls: ['./tactivity-stepper.component.scss']
})
export class TactivityStepperComponent implements OnInit {



  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;

  private _unsubscribeAll: Subject<any> = new Subject<any>();


  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  currentStep: number = 0;

  test1 = [
    {
      'Resource': [
        {
          'ShortDescription': '',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBA21%2FTBA21APN3ENV17%20Goniometer%20Model.pptx?alt=media&token=b3ee7cf8-b559-446b-bddf-c47e18c7c31c',
          'Type': 'ppt',
          'Title': 'Concept Connect PPT'
        },
        {
          'URL': 'https://youtu.be/NmViht9tYyY',
          'Publish': true,
          'ShortDescription': '',
          'Title': 'Concept Connect Video',
          'Type': 'video'
        }
      ]
    },
    {
      'Stackable TACs': {},
      'Prerequisite TACs': {},
      'Replacement TACs': {},
      'Variation List.version': {
        'version': {
          'Short desc': ''
        }
      },
      'Part of Composite TACs': {}
    },
    {
      'AlternateShortDescription': '',
      'ShortDescription': 'Measure angles of body joints with cardboard goniometer model',
      'TinyDescription': '',
      'LongDescription': 'The goniometer is an instrument that either measures an angle or allows an object to be rotated to a precise angular position. Let us create one with just cardboard, a template and a small piece of binding wire to measure the various angles of our many body joints!',
      'AlternateLongDescription': ''
    },
    {
      'HeadlineImage': '',
      'OtherImages': '',
      'QRCode': ''
    },
    {
      'Lesson Plan (Doc)': '',
      'Graphics Folder': '',
      'Photo Folder': '',
      'Lesson Plan Videos (unedited by Educators)': '',
      'Assessment Questions': '',
      'VAR Video': '',
      'Main TAC Guide (PDF)': '',
      'TAC Video': '',
      'VAR Guide (Dozuki login)': '',
      'Topic Guide': '',
      'Forum Link': '',
      'Lesson Plan (PDF)': '',
      'Topic Video': '',
      'VAR TAC Guide (PDF)': '',
      'Observation Sheet (Doc)': '',
      'Main Quick Guide (Dozuki link)': '',
      'VAR Print Guide (PDF)': '',
      'Observation Sheet (PDF)': ''
    },
    {
      'Common Materials': '',
      'Materials': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBA21%2FV1%2FMaterials_TBA21TAMTENV18%20Goniometer%20Model(mat).pdf?alt=media&token=f5f361d2-9017-4d3a-aa35-a928ecc14973',
      'Household Materials': ''
    },
    {
      'Topic Video*': '',
      'Topic Guide (PDF)*': '',
      'Forum Link': '',
      'VAR Video': '',
      'Lesson Plan (PDF)*': '',
      'Main TAC Guide': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBA21%2FV1%2FMain%20TAC%20Guide_TBA21TA52ENV18%20Goniometer%20Model(guide).pdf?alt=media&token=a3a24379-c8aa-4156-8c56-cc7e4a568827',
      'Observation Sheet (PDF)*': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBA21%2FV1%2FObservation%20Sheet%20(PDF)*_TBA21CDN2ENV17%20Goniometer%20Model(obs).pdf?alt=media&token=27af9390-8870-4056-b447-c8488b2953a8',
      'VAR Guide': '',
      'TAC Video': 'https://www.youtube.com/watch?v=3tmgeLHItCE'
    },
    {
      'Short description': '',
      'version': ''
    }
  ];
  test2 = [
    {
      'Resource': [
        {
          'URL': '',
          'Title': 'Concept Connect PPT',
          'Publish': true,
          'Type': 'ppt',
          'ShortDescription': ''
        }
      ]
    },
    {
      'LongDescription': 'Chemical and natural pesticides have been used by farmers and gardeners around the world for time immemorial to prevent their crops or plants from being jeopardised by so-called "pests". While the negative effects of chemical fertilisers are well-known, certain herbal pesticides may still be effective and useful without being harmful. In this TACtivity, we make one such concoction out of neem oil and soap water',
      'TinyDescription': '',
      'ShortDescription': '',
      'AlternateShortDescription': '',
      'AlternateLongDescription': ''
    },
    {
      'Materials': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBP04%2FTBP04MTENV25%20DIY%20Herbal%20Pesticide.docx.pdf?alt=media&token=e0848007-cdde-44d8-901e-9b49d7888675'
    },
    {
      'TAC Video': 'https://www.youtube.com/watch?v=zBl60fYotRc',
      'Observation Sheet (PDF)*': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBP04%2FTBP04CDN2ENV25%20DIY%20Herbal%20Pesticide.pdf?alt=media&token=eadf6004-a08f-4b96-810a-d2042cfb2f6d',
      'VAR Guide': '',
      'Topic Video*': '',
      'Topic Guide (PDF)*': '',
      'Lesson Plan (PDF)*': '',
      'Forum Link': '',
      'VAR Video': '',
      'Main TAC Guide': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBP04%2FTBP04T51ENV24%20DIY%20Herbal%20Pesticide.pdf?alt=media&token=35236abf-edcb-4a3c-a87f-fd4dce879a03'
    }
  ];
  course: Course = {
    'id': '694e4e5f-f25f-470b-bd0e-26b1d4f64028',
    'title': 'Resources',
    'slug': 'basics-of-angular',
    'description': 'Introductory course for Angular and framework basics',
    'category': 'web',
    'duration': 30,
    'totalSteps': 3,

    'featured': true,
    'progress': {
      'currentStep': 1,
      'completed': 1
    },
    'steps': [
      {
        'order': 0,
        'title': 'Learn And Make',
        'subtitle': 'subtitle',
      },
      {
        'order': 1,
        'title': 'Resources',
        'subtitle': 'subtitle',
      },
      {
        'order': 2,
        'title': 'Assignment',
        'subtitle': 'subtitle',
      },
      {
        'order': 3,
        'title': 'Quiz',
        'subtitle': 'subtitle',
      }


    ]
  };
  pdfLink = 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RamanAward2022%2F8dUv5c4YCCbcvzB6YDcmE0kr1gs1-Adhabfgww5QHagvpBvuC%2Fachary-obs-sheet?alt=media&token=bc6cfe70-5aac-4ccf-9791-3edb3abff3c1';
  routerData: any;
  tacData: any;
  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private router: Router,
    private afs: AngularFirestore,
    private userService: UserService,
    private _location: Location,
    private route: ActivatedRoute,
    private teachersService: TeacherService,
    private sideNavigationService: SideNavigationService

  ) {
    this.routerData = this.router.getCurrentNavigation()?.extras?.state || '';
  }

  ngOnInit() {
    if (this.routerData) {
      this.userService.getTacDetails(this.routerData?.tacCode, this.routerData?.tacVersion).pipe(take(1)).subscribe((res) => {
        this.tacData = res;
      });

      // creating classroom side navigation
      // this.creatClassroomNav()
    }

    else {
      this.route.paramMap.subscribe((res: any) => {
        const tacCode = res?.params?.tacCode;
        const tacVersion = res?.params?.tacVersion;
        this.userService.getTacDetails(tacCode, tacVersion).pipe(take(1)).subscribe((res) => {
          this.tacData = res;
        });

        // creating classroom side navigation
        // this.creatClassroomNav()
      });
    }

    // Subscribe to media changes
    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {

        // Set the drawerMode and drawerOpened
        if (matchingAliases.includes('lg')) {
          this.drawerMode = 'side';
          this.drawerOpened = true;
        }
        else {
          this.drawerMode = 'over';
          this.drawerOpened = false;
        }

        // Mark for check
        this._changeDetectorRef.markForCheck();
      });
  }


  creatClassroomNav() {
    const classId = this.getStudentQueryInfo().classroomId;
    const url = localStorage.getItem('classroomUrl');
    this.sideNavigationService.classroomSidenavWithLink(classId, url);
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  goToStep(step: number): void {
    // Set the current step
    this.currentStep = step;

    // Go to the step
    this.courseSteps.selectedIndex = this.currentStep;

    // Mark for check
    this._changeDetectorRef.markForCheck();
  }

  /**
   * Go to previous step
   */
  goToPreviousStep(): void {
    // Return if we already on the first step
    if (this.currentStep === 0) {
      return;
    }

    // Go to step
    this.goToStep(this.currentStep - 1);

    // Scroll the current step selector from sidenav into view
    this._scrollCurrentStepElementIntoView();
  }

  /**
   * Go to next step
   */
  goToNextStep(): void {
    // Return if we already on the last step
    if (this.currentStep === this.course.totalSteps - 1) {
      return;
    }

    // Go to step
    this.goToStep(this.currentStep + 1);

    // Scroll the current step selector from sidenav into view
    this._scrollCurrentStepElementIntoView();
  }


  private _scrollCurrentStepElementIntoView(): void {
    // Wrap everything into setTimeout so we can make sure that the 'current-step' class points to correct element
    setTimeout(() => {

      // Get the current step element and scroll it into view
      const currentStepElement = document.getElementsByClassName('current-step')[0];
      if (currentStepElement) {
        currentStepElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  }

  // goBack() {
  //   const url = localStorage.getItem('classroomUrl')
  //   this.router.navigateByUrl(url)
  // }


  getStudentQueryInfo() {
    return JSON.parse(localStorage.getItem('studentInfo'));
  }


}
