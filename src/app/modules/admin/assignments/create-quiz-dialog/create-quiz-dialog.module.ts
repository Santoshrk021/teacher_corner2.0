import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateQuizDialogComponent } from './create-quiz-dialog.component';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { CreateQuizStepComponent } from './create-quiz-step/create-quiz-step.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreateQuestionStepComponent } from './create-question-step/create-question-step.component';
import { MatRippleModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { QuillModule } from 'ngx-quill';
import { ReviewQuizComponent } from './review-quiz/review-quiz.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DurationInputComponent } from './duration-input/duration-input.component';
import { BackgroundInfoStepComponent } from './background-info-step/background-info-step.component';



@NgModule({
  declarations: [
    CreateQuizDialogComponent,
    CreateQuizStepComponent,
    CreateQuestionStepComponent,
    ReviewQuizComponent,
    DurationInputComponent,
    BackgroundInfoStepComponent
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatStepperModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatRippleModule,
    MatMenuModule,
    MatTooltipModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    MatProgressSpinnerModule,
    QuillModule.forRoot({

      customOptions: [
        {
          import: 'formats/font',
          whitelist: ['mirza', 'roboto', 'aref', 'serif', 'sansserif', 'monospace']
        }

      ]
    }),
  ]
})
export class CreateQuizDialogModule { }
