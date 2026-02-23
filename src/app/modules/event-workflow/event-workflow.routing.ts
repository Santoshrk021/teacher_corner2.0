import { Route } from '@angular/router';
import { EventWorkflowComponent } from './event-workflow.component';
import { EventCardComponent } from './event-card/event-card.component';


export const eventRoutes: Route[] = [{
    path: '',
    component: EventWorkflowComponent,
    children: [
        {
            path: '',
            pathMatch: 'full',
            component: EventCardComponent
        },
        {
            path: 'workflow',
            loadChildren: () => import('app/modules/event-workflow/event-configure-workflow/event-configure-workflow.module').then(m => m.EventConfigureWorkflowModule)
        },
    ]
}];

