import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExtraOptions, PreloadAllModules, RouterModule } from '@angular/router';
import { FuseModule } from '@fuse';
import { FuseAlertModule } from '@fuse/components/alert';
import { FuseMockApiModule } from '@fuse/lib/mock-api';
import { FuseConfigModule } from '@fuse/services/config';
import { AppComponent } from 'app/app.component';
import { appRoutes } from 'app/app.routing';
import { appConfig } from 'app/core/config/app.config';
import { CoreModule } from 'app/core/core.module';
import { LayoutModule } from 'app/layout/layout.module';
import { mockApiServices } from 'app/mock-api';
import { MarkdownModule } from 'ngx-markdown';
import { GraphQLModule } from './graphql.module';
import { DatabaseModule } from './modules/firebase/database/database.module';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { QuillModule } from 'ngx-quill';
import { NgxMatMomentModule } from '@angular-material-components/moment-adapter';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { environment } from 'environments/environment';
import { ServiceWorkerModule } from '@angular/service-worker';
const routerConfig: ExtraOptions = {
  preloadingStrategy: PreloadAllModules,
  scrollPositionRestoration: 'enabled',
  // onSameUrlNavigation: 'reload'
};
@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes, routerConfig),
    FuseAlertModule,
    // Fuse, FuseConfig & FuseMockAPI
    FuseModule,
    FuseConfigModule.forRoot(appConfig),
    FuseMockApiModule.forRoot(mockApiServices),
    CoreModule,
    // Layout module of your application
    LayoutModule,
    // 3rd party modules that require global configuration via forRoot
    MarkdownModule.forRoot({}),
    QuillModule.forRoot({
      // customModules: [
      //   {
      //     implementation: CustomBlockBlot,
      //     path: 'modules/customBlotFormatter', // Update the path if necessary
      //   }
      // ],
      customOptions: [
        {
          import: 'formats/font',
          whitelist: ['mirza', 'roboto', 'aref', 'serif', 'sansserif', 'monospace']
        }
      ]
    }),
    // Firebase Module
    DatabaseModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    }),
    MatSelectModule,
    GraphQLModule,
    HttpClientModule,
    MatSnackBarModule,
    NgxMatMomentModule,
    MatNativeDateModule,
    MatDatepickerModule,
  ],
  bootstrap: [
    AppComponent
  ],
})
export class AppModule { }