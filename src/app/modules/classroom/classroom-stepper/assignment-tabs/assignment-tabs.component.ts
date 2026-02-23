import { ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { Subject, takeUntil } from 'rxjs';



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
  selector: 'app-assignment-tabs',
  templateUrl: './assignment-tabs.component.html',
  styleUrls: ['./assignment-tabs.component.scss']
})
export class AssignmentTabsComponent implements OnInit {
  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;
  @Input() inputData: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();


  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  currentStep: number = 0;


  course: Course = {
    'id': '694e4e5f-f25f-470b-bd0e-26b1d4f64028',
    'title': 'Basics of Angular',
    'slug': 'basics-of-angular',
    'description': 'Introductory course for Angular and framework basics',
    'category': 'web',
    'duration': 30,
    'totalSteps': 7,

    'featured': true,
    'progress': {
      'currentStep': 1,
      'completed': 1
    },
    'steps': [
      {
        'order': 0,
        'title': 'Assignments',
        'subtitle': 'subtitle',
      },
      {
        'order': 1,
        'title': 'observation sheet',
        'subtitle': 'subtitle',
      },
      {
        'order': 2,
        'title': 'Additional Resources',
        'subtitle': 'subtitle',
      },
      {
        'order': 3,
        'title': 'Quick Guide',
        'subtitle': 'subtitle',
      }, {
        'order': 4,
        'title': 'Material Required',
        'subtitle': 'subtitle',
      },
      {
        'order': 5,
        'title': 'Associated TACs',
        'subtitle': 'subtitle',
      },
      {
        'order': 6,
        'title': 'Video',
        'subtitle': 'subtitle',
      },

    ]
  };
  pdfLink = 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RamanAward2022%2F8dUv5c4YCCbcvzB6YDcmE0kr1gs1-Adhabfgww5QHagvpBvuC%2Fachary-obs-sheet?alt=media&token=bc6cfe70-5aac-4ccf-9791-3edb3abff3c1';

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _fuseMediaWatcherService: FuseMediaWatcherService,

  ) { }

  ngOnInit(): void {
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
}
