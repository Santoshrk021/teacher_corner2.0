import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { BulkComposerComponent } from './bulk-composer/bulk-composer.component';

// ⬇️ ADD THIS
import { WhatsappBulkRoutingModule } from './whatsapp-bulk-routing.module';

// Fuse
import { FuseDrawerModule } from '@fuse/components/drawer';

// Firebase
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

// Angular Material
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// History Module
import { HistoryModule } from './bulk-composer/history/history.module';

@NgModule({
  declarations: [BulkComposerComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // ⬇️ ADD THIS so the '' route renders BulkComposerComponent
    WhatsappBulkRoutingModule,

    // Fuse
    FuseDrawerModule,

    // Firebase
    AngularFireStorageModule,

    // History
    HistoryModule,

    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
})
export class WhatsappBulkModule {}
