import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormatTimePipe } from './pipes/format-time.pipe';
import { FormatTimeConditionalPipe } from './pipes/format-time-conditional.pipe';
import { StandardQuillTextInputFieldComponent } from './components/standard-quill-text-input-field/standard-quill-text-input-field.component';
import { QuillModule } from 'ngx-quill';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StarRatingComponent } from './components/star-rating/star-rating.component';
import { RomanNumeralPipe } from './pipes/roman-numeral.pipe';
import { HttpClientModule } from '@angular/common/http';
import { ScannedDocumentManagerComponent } from './components/scanned-document-manager/scanned-document-manager.component';
import { MatDialogModule } from '@angular/material/dialog';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

@NgModule({
    declarations: [
        FormatTimePipe,
        FormatTimeConditionalPipe,
        StandardQuillTextInputFieldComponent,
        StarRatingComponent,
        RomanNumeralPipe,
        ScannedDocumentManagerComponent,
    ],
    imports: [
        CommonModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        AngularFireStorageModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatProgressSpinnerModule,
        QuillModule.forRoot({
            customOptions: [
                {
                    import: 'formats/font',
                    whitelist: ['mirza', 'roboto', 'aref', 'serif', 'sansserif', 'monospace']
                }
            ]
        }),
    ],
    exports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        FormatTimePipe,
        FormatTimeConditionalPipe,
        StandardQuillTextInputFieldComponent,
        StarRatingComponent,
        RomanNumeralPipe,
    ]
})
export class SharedModule {
}
