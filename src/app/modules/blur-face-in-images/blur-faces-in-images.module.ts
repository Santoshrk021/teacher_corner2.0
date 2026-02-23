import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { StudentsCustomCertificateComponent } from './students-custom-certificate.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { StudentnamePdfEditComponent } from '../studentname-pdf-edit/studentname-pdf-edit.component';
import { StudentsCertificateRawpdfUploadComponent } from '../students-certificate-rawpdf-upload/students-certificate-rawpdf-upload.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FuseCardModule } from '@fuse/components/card';
import { FuseAlertModule } from '@fuse/components/alert';
import { SharedModule } from 'app/shared/shared.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectInfiniteScrollModule } from 'ng-mat-select-infinite-scroll';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { textTransformPipeModule } from '@fuse/pipes/textTransform/textTransform.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BlurFacesInImagesComponent } from './blur-faces-in-images/blur-faces-in-images.component';

@NgModule({
  declarations: [
    BlurFacesInImagesComponent
    // StudentsCustomCertificateComponent,
    // StudentnamePdfEditComponent,
    // StudentsCertificateRawpdfUploadComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatStepperModule,
    MatTooltipModule,
    MatDialogModule,
    MatSelectInfiniteScrollModule,
    FuseCardModule,
    FuseAlertModule,
    SharedModule,
    AngularFirestoreModule,
    textTransformPipeModule,
    DragDropModule,
    MatSlideToggleModule

  ],
//   exports: [
//     StudentsCustomCertificateComponent,
//     StudentnamePdfEditComponent,
//     StudentsCertificateRawpdfUploadComponent,
//   ]
})
export class BlurFacesInImageModule { }
