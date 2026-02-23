import { Route } from '@angular/router';
import { InitialDataResolver } from 'app/app.resolvers';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent } from 'app/layout/layout.component';
import { CheckClassroomsGuard } from './core/auth/guards/check-classrooms.guard';
import { CheckPermissionGuard } from './core/auth/guards/check-permission.guard';
import { PartnerListModule } from './modules/admin/partner-list/partner-list.module';
// import { DatamakeComponent } from './datamake/datamake.component';
import { DatadetailsComponent } from './datadetails/datadetails.component';
export const appRoutes: Route[] = [

    // Redirect empty path to '/example'
    // { path: '', pathMatch: 'full', redirectTo: 'example' },
    { path: '', pathMatch: 'full', redirectTo: 'registration-page' },

    // {
    //     path:'sagar', component:DatamakeComponent
    // },


    // Redirect signed in user to the '/example'
    //
    // After the user signs in, the sign in page will redirect the user to the 'signed-in-redirect'
    // path. Below is another redirection for that path to redirect the user to the desired
    // location. This is a small convenience to keep all main routes together here on this file.
    { path: 'signed-in-redirect', pathMatch: 'full', redirectTo: 'example' },

    // Auth routes for guests
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {
                path: 'confirmation-required', loadChildren: () =>
                    import('app/modules/auth/confirmation-required/confirmation-required.module').then(m => m.AuthConfirmationRequiredModule)
            },
            { path: 'forgot-password', loadChildren: () => import('app/modules/auth/forgot-password/forgot-password.module').then(m => m.AuthForgotPasswordModule) },
            { path: 'login', loadChildren: () => import('app/modules/auth/exotel-sms-otp-login/exotel-sms-otp-login.module').then(m => m.ExotelSmsOtpLoginModule) },
            // { path: 'login', loadChildren: () => import('app/modules/auth/phone-login/phone-login.module').then(m => m.PhoneLoginModule) },
            { path: 'outreach/:code', loadChildren: () => import('app/modules/outreach-teacher-registration/outreach-teacher-registration.module').then(m => m.OutreachTeacherRegistrationModule) },
            { path: 'outreach-teacher-registration/:code', loadChildren: () => import('app/modules/outreach-teacher-registration/outreach-teacher-registration.module').then(m => m.OutreachTeacherRegistrationModule) },
            { path: 'reset-password', loadChildren: () => import('app/modules/auth/reset-password/reset-password.module').then(m => m.AuthResetPasswordModule) },
            { path: 'sign-in', loadChildren: () => import('app/modules/auth/sign-in/sign-in.module').then(m => m.AuthSignInModule) },
            { path: 'sign-up', loadChildren: () => import('app/modules/auth/sign-up/sign-up.module').then(m => m.AuthSignUpModule) },
            { path: 'impersonation', loadChildren: () => import('app/modules/auth/impersonation/impersonation.module').then(m => m.ImpersonationModule) },

        ]
    },

    // Auth routes for authenticated users
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            { path: 'sign-out', loadChildren: () => import('app/modules/auth/sign-out/sign-out.module').then(m => m.AuthSignOutModule) },
            { path: 'unlock-session', loadChildren: () => import('app/modules/auth/unlock-session/unlock-session.module').then(m => m.AuthUnlockSessionModule) },
            // { path: 'registration', loadChildren: () => import('app/modules/registration/registration.module').then(m => m.RegistrationModule) },

        ]
    },

    // Landing routes
    {
        path: '',
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            { path: 'home', loadChildren: () => import('app/modules/landing/home/home.module').then(m => m.LandingHomeModule) },
            {
                path: 'contests/:contestId', loadChildren: () =>
                    import('app/modules/admin/contests/all-nominations-info/all-nominations-info.module').then(m => m.AllNominationsInfoModule)
            },
        ]
    },

    // Classroom deshboard view
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        resolve: {
            initialData: InitialDataResolver,
        },
        children: [
            { path: 'example', loadChildren: () => import('app/modules/admin/example/example.module').then(m => m.ExampleModule) },
            { path: 'dashboard', loadChildren: () => import('app/modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
            { path: 'dashboard/:classroomId', loadChildren: () => import('app/modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
            // { path: 'dashboard/:classroomId/class-contests', loadChildren: () =>
            // import('app/modules/class-level-contest-list/class-level-contest-list.module').then(m => m.ClassLevelContestListModule) },
            // { path: 'dashboard/:programmeId', loadChildren: () => import('app/modules/dashboard/programme-list/programme-list.module').then(m => m.ProgrammeListModule) },
            // { path: 'dashboard/:programmeId/:clasId', loadChildren: () =>
            // import('app/modules/dashboard/programme-list/programme-list.module').then(m => m.ProgrammeListModule) },
            { path: 'my-tactivities', loadChildren: () => import('app/modules/my-tactivity/my-tactivity.module').then(m => m.MyTACtivityModule) },
            { path: 'my-tactivities/:tacCode/:tacVersion', loadChildren: () => import('app/modules/tactivity/tctivity.module').then(m => m.TactivityModule) },
            // { path: 'dashboard/programme/:tacDocId', loadChildren: () => import('app/modules/classroom/classroom.module').then(m => m.ClassRoomModule) },
            {
                path: 'dashboard/:classroomId/programme/:tacDocId',
                loadChildren: () => import('app/modules/classroom/classroom.module').then(m => m.ClassRoomModule)
            },
            // { path: 'dashboard/:classroomId/stem-club/:tacDocId', loadChildren: () =>
            // import('app/modules/stem-club-workflow/stem-club-workflow.module').then(m => m.StemClubWorkflowModule) },

            /* Assignments & Submissions */
            {
                path: 'dashboard/:classroomId/upload-submissions',
                loadChildren: () => import('app/modules/assignments-upload/assignments-upload.module')
                    .then(m => m.AssignmentsUploadModule)
            },
            {
                path: 'dashboard/:classroomId/upload-submissions/:studentId',
                loadChildren: () => import('app/modules/assignments-upload/upload-submission-attempts-table/upload-submission-attempts-table.module')
                    .then(m => m.UploadSubmissionAttemptsTableModule)
            },
            {
                path: 'dashboard/:classroomId/quiz-submissions',
                loadChildren: () => import('app/modules/assignments-quiz/assignments-quiz.module').then(m => m.AssignmentsQuizModule)
            },
            {
                path: 'dashboard/:classroomId/quiz-submissions/:studentId',
                loadChildren: () => import('app/modules/assignments-quiz/quiz-submission-attempts-table/quiz-submission-attempts-table.module')
                    .then(m => m.QuizSubmissionAttemptsTableModule)
            },
            {
                path: 'dashboard/:classroomId/submit-assignment',
                loadChildren: () => import('app/modules/assignment-submit/assignment-submit.module').then(m => m.AssignmentSubmitModule)
            },

            { path: 'my-classrooms', loadChildren: () => import('app/modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
            { path: 'contests-config/:contestId', loadChildren: () => import('app/modules/contest-workflow/contest-workflow.module').then(m => m.ContestWorkflowModule) },
            { path: 'events-config', loadChildren: () => import('app/modules/event-workflow/event-workflow.module').then(m => m.EventWorkflowModule) },

            { path: 'no-programme', loadChildren: () => import('app/modules/no-programmes/no-programmes.module').then(m => m.NoProgrammesModule) },
            { path: 'no-classroom', loadChildren: () => import('app/modules/no-classroom/no-classroom.module').then(m => m.NoClassroomModule) },
            {
                path: 'nomination-dashboard/:contestId', loadChildren: () =>
                    import('app/modules/nomination-dashboard/nomination-dashboard.module').then(m => m.NominationDashboardModule)
            },
            { path: 'nominations', loadChildren: () => import('app/modules/nomination-dashboard/nomination-table/nomination-table.module').then(m => m.NominationTableModule) },
            // { path: 'nomination-dashboard/nominations', loadChildren: () =>
            // import('app/modules/nomination-dashboard/nomination-table/nomination-table.module').then(m => m.NominationTableModule) },

            { path: 'events', loadChildren: () => import('app/modules/events/events.module').then(m => m.EventsModule) },
            // components routing
            { path: 'components', loadChildren: () => import('../app/modules/admin/components/components.module').then(m => m.ComponentsModule) },
            // WhatsApp bulk sender
            { path: 'whatsapp-manager', loadChildren: () => import('app/whatsapp-bulk/whatsapp-bulk.module').then(m => m.WhatsappBulkModule) },
        ]
    },
    // Admin View for accesslevel 10 and above
    {
        path: '',
        canActivate: [AuthGuard, CheckPermissionGuard],
        canActivateChild: [AuthGuard],
        data: { access: { minimum: 10 } },
        component: LayoutComponent,
        resolve: {
            initialData: InitialDataResolver,
        },
        children: [
            { path: 'tools', loadChildren: () => import('app/modules/tools/tools.module').then(m => m.ToolsModule) },
            { path: 'programmes', loadChildren: () => import('app/modules/admin/programmes/programmes.module').then(m => m.ProgrammesModule) },
            {
                path: 'programme-templates',
                loadChildren: () => import('app/modules/admin/manage-programme-templates/manage-programme-templates.module').then(m => m.ManageProgrammeTemplatesModule)
            },
            // {
            //     path: 'manage', loadChildren: () => import('app/modules/admin/manage-institute-classroom/manage-institute-classroom.module')
            //         .then(m => m.ManageInstituteClassroomModule)
            // },
            { path: 'classrooms', loadChildren: () => import('app/modules/admin/manage-classrooms/manage-classrooms.module').then(m => m.ManageClassroomsModule) },
            // { path: 'stem-clubs', loadChildren: () => import('app/modules/admin/manage-stem-clubs/manage-stem-clubs.module').then(m => m.ManageStemClubsModule) },
            { path: 'learning-units', loadChildren: () => import('app/modules/admin/learning-units/learning-units.module').then(m => m.LearningUnitsModule) },
            { path: 'student-manager', loadChildren: () => import('app/modules/admin/manage-students/manage-students.module').then(m => m.ManageStudentsModule) },
            { path: 'assignments', loadChildren: () => import('app/modules/admin/assignments/assignments.module').then(m => m.AssignmentsModule) },
            { path: 'institutions-list', loadChildren: () => import('app/modules/admin/institutions-list/institutions-list.module').then(m => m.InstitutionsListModule) },
            { path: 'partner-list', loadChildren: () => import('app/modules/admin/partner-list/partner-list.module').then(m => m.PartnerListModule) },
            { path: 'vendor-list', loadChildren: () => import('app/modules/admin/vendor-list/vendor-list.module').then(m => m.VendorListModule) },
            { path: 'visit-list', loadChildren: () => import('app/modules/admin/visit-list/visit-list.module').then(m => m.VisitListModule) },
            // { path: 'contests', loadChildren: () => import('app/modules/admin/contests/contests.module').then(m => m.ContestsModule) },
            { path: 'events-admin', loadChildren: () => import('app/modules/admin/events/events.module').then(m => m.EventsModule) },
            // { path: 'workflow-template', loadChildren: () => import('app/modules/admin/workflow-template/workflow-template.module').then(m => m.WorkflowTemplateModule) },

            {
                path: 'workflow-templates', loadChildren: () => import('app/modules/admin/workflow-template-list/workflow-template-list.module')
                    .then(m => m.WorkflowTemplateListModule)
            },
            // components routing

            { path: 'components', loadChildren: () => import('../app/modules/admin/components/components.module').then(m => m.ComponentsModule) },
            { path: 'remote-pannel', loadChildren: () => import('app/modules/admin/remote-connect/remoteConnect.module').then(m => m.RemoteConnectModule) },
            { path: 'master-manager', loadChildren: () => import('app/datadetails/datadetails.module').then(m => m.DatadetailsModule) },
            { path: 'whatsapp-manager', loadChildren: () => import('app/whatsapp-bulk/whatsapp-bulk.module').then(m => m.WhatsappBulkModule) },
            { path: 'kit-manager', loadChildren: () => import('app/modules/admin/kit/kit.module').then(m => m.KitModule) },
            { path: 'outreach', loadChildren: () => import('app/modules/admin/outreach/outreach.module').then(m => m.OutreachModule) },
        ]
    },
    // Admin View for accesslevel 9
    {
        path: '',
        canActivate: [AuthGuard, CheckPermissionGuard],
        canActivateChild: [AuthGuard],
        // data: { access: { allowed: [9] } },
        data: { access: { minimum: 9 } },
        component: LayoutComponent,
        resolve: {
            initialData: InitialDataResolver,
        },
        children: [
            { path: 'manage', loadChildren: () => import('app/modules/admin/manage-institute-classroom/manage-institute-classroom.module').then(m => m.ManageInstituteClassroomModule) },
            { path: 'contests', loadChildren: () => import('app/modules/admin/contests/contests.module').then(m => m.ContestsModule) },
        ]
    },
    {
        path: 'registration-page',
        canActivate: [AuthGuard, CheckClassroomsGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        resolve: {
            initialData: InitialDataResolver,
        },
        loadChildren: () => import('app/modules/registration/registration.module').then(m => m.RegistrationModule)

    },
    {
        path: 'approval-page',
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        loadChildren: () => import('app/modules/registration/classroom-approval/classroom-approval.module').then(m => m.ClassroomApprovalModule)
    },


    {
        path: 'approval-rejection',
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        loadChildren: () => import('app/modules/registration//classroom-approval-rejection/classroom-approval-rejection.module').then(m => m.ClassroomApprovalRejectionModule)
    },
    // {
    //     path: 'registration',
    //     canActivate: [AuthGuard],
    //     canActivateChild: [AuthGuard],
    //     component: LayoutComponent,
    //     data: {
    //         layout: 'empty'
    //     }, resolve: {
    //         initialData: InitialDataResolver,
    //     },
    //     loadChildren: () => import('app/modules/registration/registration.module').then(m => m.RegistrationModule)

    // },

    {
        path: '404-not-found',
        data: {
            layout: 'empty'
        },
        pathMatch: 'full',
        loadChildren: () => import('app/modules/error404/error404.module').then(m => m.Error404Module)
    },
    // Not Matched URL
    {
        path: '**',
        redirectTo: '',
    }
    // { path: '**', redirectTo: '404-not-found' },
];
