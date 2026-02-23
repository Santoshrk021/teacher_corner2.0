import { Component, Input, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { UiService } from 'app/shared/ui.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-external-resource',
  templateUrl: './external-resource.component.html',
  styleUrls: ['./external-resource.component.scss']
})
export class ExternalResourceComponent implements OnInit {
  @Input('luDetailsInput') luDetails: any;
  @Input('trashUINotEditableInput') trashUINotEditable: any;

  storageBucket = 'learningUnits';
  externalResourcedUpdate: any;
  externalResourceCopy: any;
  fileSelected = false;
  enableForm = false;
  externalResourcePath = {
    guidePath: '',
    materialPath: '',
    observationPath: '',
    videoUrl: '',
    templatePath: '',
    topicGuidePath: '',
    topicVideoUrl: '',
    varVideoUrl: '',
    varGuidePath: '',
  };
  uploadProgress = {
    guide: 0,
    material: 0,
    observationSheet: 0,
    template: 0,
    topicGuide: 0,
    varGuide: 0,
  };
  loader = false;
  filename;
  bytesTransferred;
  matTooltipMsg = 'This field isn\'t editable as this learning unit or version has been deleted. Please restore to edit this field';

  constructor(
    private afStore: AngularFireStorage,
    private uiService: UiService,
    private learningUnitService: LearningUnitsService,
    private sharedService: SharedService,
  ) { }

  ngOnInit() {
    this.externalResourcePath = {
      guidePath: this.luDetails.resources?.guidePath || '',
      materialPath: this.luDetails.resources?.materialPath || '',
      observationPath: this.luDetails.resources?.observationPath || '',
      videoUrl: this.luDetails.resources?.videoUrl || '',
      templatePath: this.luDetails.resources?.templatePath || '',
      topicVideoUrl: this.luDetails.resources?.topicVideoUrl || '',
      topicGuidePath: this.luDetails.resources?.topicGuidePath || '',
      varVideoUrl: this.luDetails.resources?.varVideoUrl || '',
      varGuidePath: this.luDetails.resources?.varGuidePath || '',
    };
    this.externalResourcedUpdate = JSON.parse(JSON.stringify(this.externalResourcePath));
    this.externalResourceCopy = JSON.parse(JSON.stringify(this.externalResourcePath));

    if (JSON.stringify(this.externalResourceCopy) !== JSON.stringify(this.externalResourcedUpdate)) {
      this.enableForm = true;
    } else {
      this.enableForm = false;
    }
  }

  async selectFile(event: any, type: string) {
    this.fileSelected = true;
    if (this.externalResourcePath.varVideoUrl != '' || this.externalResourcePath.videoUrl != '' ||
      this.externalResourcePath.topicVideoUrl != '') {
      this.enableForm = true;
    }
    else {
      this.enableForm = false;
    }
    this.loader = true;
    this.filename = event.target.files[0].name;

    const isValid = this.pdfTypeAndSizeCheck(event.target.files[0]);
    if (isValid) {
      const bucketPath = `${this.storageBucket}/${this.luDetails.docId}/${type}.` + this.filename.split('.').slice(-1).pop();
      const ref = this.afStore.ref(bucketPath);
      const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();

      task.subscribe(async (uploadedSnapshot) => {
        const bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
        this.uploadProgress[`${type}`] = bytesTransferred;
        if (uploadedSnapshot.state === 'success') {
          this.updateDB(bucketPath, type, true);
          this.uiService.alertMessage('successful', 'Uploaded successfully', 'success');
          this.loader = false;
        }
      });
    }
  }

  async updateDB(bucketPath?, type?, fileselected: boolean = false) {
    let fieldUpdated: string = '';
    switch (type) {
      case 'guide': {
        this.externalResourcePath.guidePath = bucketPath;
        fieldUpdated = 'guidePath';
        break;
      }
      case 'observationSheet': {
        this.externalResourcePath.observationPath = bucketPath;
        fieldUpdated = 'observationPath';
        break;
      }
      case 'material': {
        this.externalResourcePath.materialPath = bucketPath;
        fieldUpdated = 'materialPath';
        break;
      }
      case 'template': {
        this.externalResourcePath.templatePath = bucketPath;
        fieldUpdated = 'templatePath';
        break;
      }
      case 'topicGuide': {
        this.externalResourcePath.topicGuidePath = bucketPath;
        fieldUpdated = 'topicGuidePath';
        break;
      }
      case 'varGuide': {
        this.externalResourcePath.varGuidePath = bucketPath;
        fieldUpdated = 'varGuidePath';
        break;
      }
      default: {
        break;
      }
    }

    try {
      this.learningUnitService.updateLU(this.luDetails.docId, { resources: this.externalResourcePath });
      const { Maturity: maturity, learningUnitName, learningUnitId } = this.luDetails;
      const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
      const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
      const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
      const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
      const messageContent = `A new resource '${this.filename}' has been uploaded for '${fieldUpdated}', '${maturity}' maturity in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
      this.uiService.alertMessage('Saved', 'Successfully Updated', 'success');
      await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
      if (!fileselected) {
        this.enableForm = false;
      }
      else {
        this.fileSelected = true;
      }
    } catch (error) {
      this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
    }
  }



  pdfTypeAndSizeCheck(event) {
    const allowedExtensions = /(\.pdf)$/i;
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid file type', 'Only allowed .pdf file type', 'warn');
      this.filename = '';
      isValid = false;
    }
    else if (event.size > 3145728) {
      this.uiService.alertMessage('Invalid file type', 'maximum image size should be 3MB', 'warn');
      this.filename = '';
      isValid = false;
    }
    else {
      isValid = true;
    }
    return isValid;
  }

  onInputChange(value: any, extraArg: string) {
    this.externalResourcedUpdate[extraArg] = value;

    if (JSON.stringify(this.externalResourceCopy) !== JSON.stringify(this.externalResourcedUpdate)) {
      this.enableForm = true;
    } else {
      this.enableForm = false;
    }
  }

}
