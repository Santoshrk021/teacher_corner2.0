import { NgModule } from '@angular/core';
import { ProfilesMergeComponent } from './profiles-merge.component';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const routes: Route[] = [
    {
      path: '',
      title: '',
      component: ProfilesMergeComponent
    }
  ];

@NgModule({
    declarations: [
       ProfilesMergeComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        MatRadioModule,
        FormsModule,
        MatSelectModule ,
        MatButtonModule  ,
        MatIconModule
    ],
    exports:[

    ],
    providers: [
    ]
})
export class ProfilesMergeModule {
}
