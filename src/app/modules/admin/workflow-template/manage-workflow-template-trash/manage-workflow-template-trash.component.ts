import { Component, OnInit } from '@angular/core';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { WorkflowTemplatesService } from '../workflow-template.service';
import { UiService } from 'app/shared/ui.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { firstValueFrom, map, Observable, take } from 'rxjs';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';


@Component({
  selector: 'app-manage-workflow-template-trash',
  templateUrl: './manage-workflow-template-trash.component.html',
  styleUrls: ['./manage-workflow-template-trash.component.scss']
})
export class ManageWorkflowTemplateTrashComponent implements OnInit {
  deletedAssignments: any[] = [];
  deletedWorkflowTemplates: any[] = [];
  constructor(
    private drawerService: FuseDrawerService,
    private workflowTemplateService: WorkflowTemplatesService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private masterService: MasterService,
    private afs: AngularFirestore
  ) { }

  ngOnInit(): void {
    this.workflowTemplateService.getDeletedTemplates().valueChanges().subscribe((data) => {
      this.deletedWorkflowTemplates = data;
    }
    )
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashWorkflowTemplateSubject.next(false)
  }


  deleteTemplate(doc) {
    // let name= doc.templateName;
    let config = {
      title: 'Delete Workflow Template',
      message: `Are you sure you want to delete ${doc.templateName} permanently ?`,
      icon: {
        name: 'mat_outline:delete'
      }
    }
    const dialogRef = this.fuseConfirmationService.open(config)
    dialogRef.afterClosed().subscribe((result) => {
      if (result == 'confirmed') {
        this.workflowTemplateService.deleteInTrash(doc?.docId).then(() => {
          // this.updateInstitutesOnDelete(doc.docId)
          this.uiService.alertMessage('Successful', 'Workflow template Deleted Permanently', 'success');
        })
      }
    });
    // this.workflowTemplateService.deleteInTrash(docId).then(() => {
    //   this.uiService.alertMessage('Successful', 'Deleted workflow template permanently', 'success');
    // })
  }

  // checkForWorkflowTemplateNames(docId) {
  //   this.workflowTemplateService.getTemplates().valueChanges().subscribe((data) => {
  //     console.log(data, 'data');
  //     data.forEach((doc: any) => {
  //       console.log(doc.templateName, 'doc.templateName');
  //       if (docId === doc.docId) {
  //         console.log('same');
  //       }
  //       this.deletedWorkflowTemplates.forEach((data: any) => {
  //         console.log(data.templateName, 'data.templateName');
  //         if (doc.templateName == data.templateName) {
  //           console.log(doc.templateName, 'doc.templateName');
  //           console.log(data.templateName, 'data.templateName');
  //           console.log('exists');
  //           this.uiService.alertMessage('Error', 'Workflow template with same name already exists', 'error');
  //         } else {
  //           console.log('not exists');
  //         }
  //       });
  //     });
  //   }
  //   )
  // }


  checkForWorkflowTemplateNames(templateName: string): Observable<boolean> {
    return this.workflowTemplateService.getTemplates().valueChanges().pipe(
      take(1),
      map((data: any[]) => {

        const templateExists = data.some((doc) =>
          this.deletedWorkflowTemplates.some((deleted) => deleted.templateName === doc.templateName)
        );

        if (templateExists) {
          this.uiService.alertMessage('Error', 'Workflow template with same name already exists', 'error');
        }

        return templateExists;
      })
    );
  }

  /*
  restoreTemplate(templateName: string, docId: string) {
    console.log('Trying to restore:', templateName);
  
    // Find the deleted template by templateName
    const foundTemplate = this.deletedWorkflowTemplates.find((data) => data.templateName === templateName);
  
    if (!foundTemplate) {
      this.uiService.alertMessage('Error', 'Template not found in deleted templates', 'error');
      return;
    }
  
    this.workflowTemplateService.getTemplates().valueChanges().pipe(take(1)).subscribe((existingTemplates: any[]) => {
      console.log(existingTemplates, 'Existing Templates');
  
      // Check if the templateName already exists in getTemplates() data
      const templateExists = existingTemplates.some((doc) => doc.templateName === templateName);
  
      if (templateExists) {
        this.uiService.alertMessage('Error', 'Cannot restore as workflow template with same name already exists', 'error');
      } else {
        delete foundTemplate['trashAt'];
        delete foundTemplate['trashedBy'];
        let restoreTemplateInMaster = {...foundTemplate};
        delete restoreTemplateInMaster['masterDocId'];
        this.workflowTemplateService.restore(foundTemplate.docId, foundTemplate);
        //  this.masterService.addNewWfTemplate(docId, foundTemplate);
    
        // this.masterService.updateWorkflowTemplateInMasterById(foundTemplate.docId, foundTemplate);
       this.masterService.addNewObjectToMasterMap('WORKFLOW_TEMPLATE', 'workflowTemplates', restoreTemplateInMaster);
       const masterDocId =  this.masterService.addNewObjectToMasterMap('WORKFLOW_TEMPLATE', 'workflowTemplates', restoreTemplateInMaster);

      
        this.uiService.alertMessage('Successful', 'Restored workflow template successfully', 'success');
      }
    });
  }
  */

  async restoreTemplate(templateName: string, docId: string) {

    // Find the deleted template by templateName
    const foundTemplate = this.deletedWorkflowTemplates.find((data) => data.templateName === templateName);
    if (!foundTemplate) {
      this.uiService.alertMessage('Error', 'Template not found in deleted templates', 'error');
      return;
    }

    // Get existing templates using `firstValueFrom()` to avoid `subscribe()`
    const existingTemplates = await firstValueFrom(this.workflowTemplateService.getTemplates().valueChanges());

    // Check if the templateName already exists in getTemplates() data
    const templateExists = existingTemplates.some((doc: any) => doc.templateName === templateName);
    if (templateExists) {
      this.uiService.alertMessage('Error', 'Cannot restore as workflow template with the same name already exists', 'error');
      return;
    }

    // Remove trash metadata
    delete foundTemplate.trashAt;
    delete foundTemplate.trashedBy;
    foundTemplate['updatedAt'] = new Date();

    // Remove unnecessary fields before adding to master
    let restoreTemplateInMaster = { ...foundTemplate };
    delete restoreTemplateInMaster.masterDocId;
    delete restoreTemplateInMaster.workflowSteps;

    await this.workflowTemplateService.restore(foundTemplate.docId, foundTemplate);

    // Add template to master and wait for masterDocId
    const masterDocId = await this.masterService.addNewObjectToMasterMap(
      'WORKFLOW_TEMPLATE',
      'workflowTemplates',
      restoreTemplateInMaster
    );


    if (!masterDocId) {
      console.error('❌ Failed to get masterDocId.');
      return;
    }

    // 🔹 Fetch existing Master Data after ensuring masterDocId exists
    const masterDocRef = this.afs.collection(this.masterService.collectionName).doc(masterDocId);
    const masterDocSnapshot = await firstValueFrom(masterDocRef.get()); // ✅ Use firstValueFrom instead of toPromise()

    if (masterDocSnapshot?.exists) {
      let masterData: any = masterDocSnapshot.data();
      // 🔹 Check if `workflowTemplates` exists and update it
      if (masterData?.workflowTemplates?.[foundTemplate.docId]) {
        // delete masterData.workflowTemplates[foundTemplate.docId]?.createdAt;
        delete masterData.workflowTemplates[foundTemplate.docId]?.creationDate;
        masterData.workflowTemplates[foundTemplate.docId].createdAt = foundTemplate.createdAt;
      }

      // 🔹 Update Firestore without `updatedAt`
      await masterDocRef.update(masterData);
    } else {
      console.error('❌ Master document does not exist.');
    }

    this.uiService.alertMessage('Successful', 'Restored workflow template successfully', 'success');

  }


  emptyTrash() {
    let config = {
      title: 'Empty Trash',
      message: 'Are you sure you want to delete All the Workflow Templates permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    }
    const dialogRef = this.fuseConfirmationService.open(config)
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        // this.workflowTemplateService.emptyTrash();
        this.deletedWorkflowTemplates.forEach(i => {
          this.workflowTemplateService.emptyTrash(i.docId)
        });
        this.uiService.alertMessage('Deleted', 'All Workflow Templates Deleted Successfully', 'success')
      }
    });
  }
}



