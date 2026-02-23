import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Route, RouterModule } from '@angular/router';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { QuillModule } from 'ngx-quill';

import { FuseCardModule } from '@fuse/components/card';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { FuseDrawerModule } from '@fuse/components/drawer';

import { AdditionalResourcesComponent } from './learningUnit-list/additional-resources/additional-resources.component';
import { AssociatedLUComponent } from './learningUnit-list/associated-lu/associated-lu.component';
import { BasicInfoComponent } from './learningUnit-list/basic-info/basic-info.component';
import { DescriptionComponent } from './learningUnit-list/description/description.component';
import { DuplicateLearningUnitComponent } from './learningUnit-list/duplicate-learning-unit/duplicate-learning-unit.component';
import { ExternalResourceComponent } from './learningUnit-list/external-resource/external-resource.component';
import { FilterLearningUnitComponent } from './filter-learning-Unit/filter-learning-unit.component';
import { ImagesComponent } from './learningUnit-list/images/images.component';
import { InsertLearningunittypeComponent } from './insert-learningunittype/insert-learningunittype.component';
import { LearningunitdialogComponent } from './learningunitdialog/learningunitdialog.component';
import { LearningUnitlistComponent } from './learningUnit-list/learningunit-list.component';
import { LearningUnitsComponent } from './learning-units.component';
import { ResourcesComponent } from './learningUnit-list/resources/resources.component';
import { VersionChangesComponent } from './learningUnit-list/version-changes/version-changes.component';
import { ComponentModule } from './learningUnit-list/component/component.module';
import { ComponentComponent } from './learningUnit-list/component/component.component';

const routes: Route[] = [
  {
    path: '',
    title: 'Manage Learning units',
    component: LearningUnitsComponent
  }
];
@NgModule({
  declarations: [
    AdditionalResourcesComponent,
    AssociatedLUComponent,
    BasicInfoComponent,
    DescriptionComponent,
    DuplicateLearningUnitComponent,
    ExternalResourceComponent,
    FilterLearningUnitComponent,
    ImagesComponent,
    InsertLearningunittypeComponent,
    LearningunitdialogComponent,
    LearningUnitlistComponent,
    LearningUnitsComponent,
    ResourcesComponent,
    VersionChangesComponent,
  ],
  imports: [
    RouterModule.forChild(routes),
    MatTableModule,
    MatCardModule,
    MatDialogModule,
    MatAutocompleteModule,
    CommonModule,
    MatPaginatorModule,
    MatSelectModule,
    MatIconModule,
    MatSortModule,
    ComponentModule,
    QuillModule.forRoot({
      customOptions: [
        {
          import: 'formats/font',
          whitelist: ['mirza', 'roboto', 'aref', 'serif', 'sansserif', 'monospace']
        }

      ]
    }),
    FuseCardModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatListModule,
    MatTabsModule,
    MatChipsModule,
    MatCheckboxModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    FuseConfirmationModule,
    FuseDrawerModule,
    InfiniteScrollModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    ComponentModule
  ],
  exports: [
    BasicInfoComponent,
    DescriptionComponent,
    ExternalResourceComponent,
    AssociatedLUComponent,
    ImagesComponent,
    AdditionalResourcesComponent,
    VersionChangesComponent,
    MatTableModule,
    MatCardModule,
    MatAutocompleteModule,
    CommonModule,
    MatPaginatorModule,
    MatSelectModule,
    MatIconModule,
    MatSortModule,
    FuseCardModule,
    MatFormFieldModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatListModule,
    MatTabsModule,
    MatChipsModule,
    MatCheckboxModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    FuseConfirmationModule,
    FuseDrawerModule,
    MatProgressBarModule
  ]
})
export class LearningUnitsModule { }
