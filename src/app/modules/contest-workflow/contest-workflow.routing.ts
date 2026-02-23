import { Route } from '@angular/router';
import { ContestCardComponent } from './contest-card/contest-card.component';
import { ContestWorkflowComponent } from './contest-workflow.component';

export const contestRoutes: Route[] = [{
    path: '',
    component: ContestWorkflowComponent,
    children: [
        {
            path: '',
            pathMatch: 'full',
            component: ContestCardComponent
        },
        {
            path: 'workflow',
            loadChildren: () => import('app/modules/contest-workflow/contest-configure-workflow/contest-configure-workflow.module').then(m => m.ContestConfigureWorkflowModule)
        },
    ]
}];

