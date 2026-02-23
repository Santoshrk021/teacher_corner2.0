import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';

@Component({
    selector: 'app-edit-resource-files',
    templateUrl: './edit-resource-files.component.html',
    styleUrls: ['./edit-resource-files.component.scss']
})
export class EditResourceFilesComponent implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<EditResourceFilesComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private afStore: AngularFireStorage,
        private uiService: UiService,
        private learningUnitResourcesService: LearningUnitResourcesService,
        private sharedService: SharedService,
    ) { }

    fileList = [];
    loading = {};
    storageBucket = 'learningUnits';

    async ngOnInit() {
        const mValue = (String(this.data.learningUnitDetails.Maturity)).toLowerCase();
        const files = this.data.learningUnitDetails.resources[mValue][this.data.componentName][this.data.childName];
        const filesdata = files.map((d => ({ name: d.split('/')[3], url: d })));
        filesdata.forEach((d) => {
            this.loading[d.name] = false;
        });
        this.fileList = filesdata;
    }

    close() {
        this.dialogRef.close();
    }

    async getFileNames(sourcePath: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const sourceRef = this.afStore.ref(sourcePath);
            sourceRef.listAll().subscribe((listResult) => {
                Promise.all(
                    listResult.items.map(itemRef => itemRef.getDownloadURL().then(url => ({ name: itemRef.name, url: url })))
                ).then((files) => {
                    this.fileList = files;
                    resolve(this.fileList);
                }).catch((error) => {
                    reject(error);
                });
            }, (error) => {
                reject(error);
            });
        });
    }

    deleteFile(url) {
        const mValue = (String(this.data.learningUnitDetails.Maturity)).toLowerCase();
        this.fileList = this.fileList.filter(e => e.url != url);
        const fileList = this.fileList.filter(e => e.url != url).map(l => l.url);
        this.data.learningUnitDetails.resources[mValue][this.data.componentName][this.data.childName] = fileList;
        this.deleteURL(url);
    }

    deleteURL(url) {
        const filepath = this.afStore.ref(url);
        filepath.delete().subscribe(() => {
            this.uiService.alertMessage('successful', 'deleted successfully', 'success');
            this.updateDB(url);
        });
    }

    async updateDB(bucketPath?, fileselected: boolean = false) {
        try {
            this.learningUnitResourcesService.updateLUResources({ resources: { [this.data.componentName]: this.data.catObject } }, this.data.listedMaturties[this.data.learningUnitDetails.Maturity.toLowerCase()]);
            const { componentName: category, childName: subCategory, learningUnitDetails } = this.data;
            const { Maturity: maturity, learningUnitName, learningUnitId } = learningUnitDetails;
            const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
            const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
            const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
            const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
            const messageContent = `A new resource '${bucketPath}' has been removed from '${maturity}' maturity, '${category}' category, '${subCategory}' sub-category in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
            await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
            this.uiService.alertMessage('Saved', 'Successfully Updated', 'success');
        } catch (error) {
            this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
        }
    }

    selectFile(event, filename) {
        this.loading[filename] = true;
        const bucketPath = `${this.storageBucket}/${this.data.learningUnitDetails.docId}/${this.data.childName}/${filename.split('.')[0]}.` + filename.split('.').slice(-1).pop();
        const ref = this.afStore.ref(bucketPath);
        const task = ref.put(event.target.files[0], { customMetadata: { original_name: filename } }).snapshotChanges();
        task.subscribe(async (uploadedSnapshot) => {
            if (uploadedSnapshot.state === 'success') {
                const { componentName: category, childName: subCategory, learningUnitDetails } = this.data;
                const { Maturity: maturity, learningUnitName, learningUnitId } = learningUnitDetails;
                const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
                const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
                const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
                const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
                const messageContent = `A new resource '${filename}' has been uploaded for '${maturity}' maturity, '${category}' category, '${subCategory}' sub-category in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
                await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
                this.uiService.alertMessage('successful', 'Uploaded successfully', 'success');
                this.loading[filename] = false;
            }
        });
    }

}
