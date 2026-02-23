import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRippleModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { QuizComponent } from './quiz.component';
import { VideoModule } from '../media/video/video.module';
import { PDFModule } from '../media/pdf.module';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from '../../shared/shared.module';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormatTimePipe } from './pipes/format-time.pipe';
import { QuillModule } from 'ngx-quill';
import { ConfirmSubmitDialogComponent } from './confirm-submit-dialog/confirm-submit-dialog.component';
import { KitSelectDialogComponent } from './kit-select-dialog/kit-select-dialog.component';
import { StudentMappingDialogComponent } from './student-mapping-dialog/student-mapping-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RemoteSetupDialogComponent } from './remote-setup-dialog/remote-setup-dialog.component';
import { RemoteReassignDialogComponent } from './remote-reassign-dialog/remote-reassign-dialog.component';
import { DialogModule } from '../admin/components/dialog/dialog.module';
import { QuizCaseStudyComponent } from './quiz-case-study/quiz-case-study.component';
import { CaseStudyDialogComponent } from './case-study-dialog/case-study-dialog.component';


@NgModule({
  declarations: [
    QuizComponent,
    FormatTimePipe,
    ConfirmSubmitDialogComponent,
    KitSelectDialogComponent,
    StudentMappingDialogComponent,
    RemoteSetupDialogComponent,
    RemoteReassignDialogComponent,
    QuizCaseStudyComponent,
    CaseStudyDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    // RouterModule.forChild(quizRoutes),
    QuillModule.forRoot(),
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatRippleModule,
    MatSidenavModule,
    MatStepperModule,
    MatTabsModule,
    VideoModule,
    PDFModule,
    SharedModule,
    AngularFireStorageModule,
    NgApexchartsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DialogModule
  ],
  exports: [
    QuizComponent
  ]
})
export class QuizModule { }
