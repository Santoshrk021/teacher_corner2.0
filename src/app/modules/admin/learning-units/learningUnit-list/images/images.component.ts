import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';

@Component({
    selector: 'app-images',
    templateUrl: './images.component.html',
    styleUrls: ['./images.component.scss']
})
export class ImagesComponent implements OnInit {
    @Input() allLUList: any;
    @Input('luDetailsInput') luDetails: any;
    @Input('trashUINotEditableInput') trashUINotEditable: any;
    @Output() updatedHeadlineImgPathEvent = new EventEmitter<string>();

    storageBucket = 'learningUnits';
    loader = false;
    filename;
    bytesTransferred;
    isUpdateHeadlineImage: boolean = false;
    matTooltipMsg = 'This field isn\'t editable as this learning unit or version has been deleted. Please restore to edit this field';

    constructor(
        private learningUnitService: LearningUnitsService,
        private uiService: UiService,
        private masterService: MasterService,
        private afStore: AngularFireStorage,
        private cdRef: ChangeDetectorRef,
    ) { }

    async ngOnInit(): Promise<void> {
    }

    async selectFile(event: any, type: string) {
        this.loader = true;
        this.filename = event.target.files[0].name;
        const isValid = this.imageTypeAndSizeCheck(event.target.files[0]);
        if (isValid) {
            const bucketPath = `${this.storageBucket}/${this.luDetails.docId}/${type}.` + this.filename.split('.').slice(-1).pop();
            const ref = this.afStore.ref(bucketPath);
            const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();

            await lastValueFrom(task).then((uploadedSnapshot) => {
                this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100;
                if (uploadedSnapshot.state === 'success') {
                    this.updateDB(bucketPath, type);
                    this.uiService.alertMessage('successful', 'Uploaded successfully', 'success');
                    this.loader = false;
                }
            });
        }
    }

    async updateDB(bucketPath?, type?) {
        try {
            const { docId, masterDocId } = this.luDetails;
            if (type === 'learningUnitImage') {
                await this.learningUnitService.updateSingleField(docId, type, bucketPath);
                this.luDetails.learningUnitImage = bucketPath;
                const learningUnitPreviewImage = `${bucketPath.split('.')[0]}_200x200.${bucketPath.split('.')[1]}`;
                await this.learningUnitService.updateSingleField(docId, 'learningUnitPreviewImage', learningUnitPreviewImage);
                await this.masterService.updateMasterDocField(masterDocId, docId, 'tacNames', 'learningUnitPreviewImage', learningUnitPreviewImage);
                this.luDetails.learningUnitPreviewImage = learningUnitPreviewImage;
                this.updatedHeadlineImgPathEvent.emit(bucketPath);
            } else {
                await this.learningUnitService.updateSingleField(docId, `resources.${type}`, bucketPath);
                this.luDetails.resources[type] = bucketPath;
            };
            this.uiService.alertMessage('Success', 'Learning Unit Images Successfully Updated', 'success');
            this.cdRef.detectChanges();
        } catch (error) {
            this.uiService.alertMessage('Error', 'Error Updating Learning Unit Images', 'error');
            console.error('Error updating learning unit images: ', error);
        };
    }

    imageTypeAndSizeCheck(event) {
        const allowedExtensions = /(\.jpeg|\.png|\.jpg)$/i;
        let isValid = false;
        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage('Invalid file type', 'Only allowed .jpeg, .png, .jpg file types', 'warn');
            // this.elementRef.nativeElement.value = "";
            this.filename = '';
            isValid = false;
        }
        else if (event.size > 3145728) {
            this.uiService.alertMessage('Invalid file type', 'maximum image size should be 3mb', 'warn');
            // this.elementRef.nativeElement.value = "";
            this.filename = '';
            isValid = false;
        }
        else {
            isValid = true;
        }
        return isValid;
    }

}
