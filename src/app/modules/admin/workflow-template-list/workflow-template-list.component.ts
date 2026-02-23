import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { WorkflowTemplatesService } from '../workflow-template/workflow-template.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MatDialog } from '@angular/material/dialog';
import { WorkflowTemplateComponent } from '../workflow-template/workflow-template.component';
import { template } from 'lodash';
import { ManageWorkflowTemplateTrashComponent } from '../workflow-template/manage-workflow-template-trash/manage-workflow-template-trash.component';
// import { FuseDrawerService } from '@fuse/components/drawer';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { first, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { FuseConfirmationService } from '@fuse/services/confirmation/confirmation.service';
import { UiService } from 'app/shared/ui.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { MatSort, Sort } from '@angular/material/sort';
import { SortingService } from 'app/shared/sorting.service';


@Component({
    selector: 'app-workflow-template-list',
    templateUrl: './workflow-template-list.component.html',
    styleUrls: ['./workflow-template-list.component.scss']
})
export class WorkflowTemplateListComponent implements OnInit {
    data: any;
    constructor(
        private workflowTemplateService: WorkflowTemplatesService,
        private configurationService: ConfigurationService,
        public dialog: MatDialog,
        private drawerService: FuseDrawerService,
        private fuseConfirmationService: FuseConfirmationService,
        private uiService: UiService,
        private masterService: MasterService,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private teacherService: TeacherService,
        private sortingService: SortingService,
    ) {
        this.drawerService.drawerOpenTrashWorkflowTemplateSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe(res => {
            this.drawerOpened = res
            if (!res) {

            }
        })
    }

    types: any;
    maturities: any;
    subjectTypes: any;
    typeCode: any;
    workflowTemplatesData: any[] = [];
    component: any;
    drawerOpened: any = false;
    workflowTypes: any;
    workflowTemplates: any[] = [];
    teacherFullName: any;
    savedSortEvent: any;
    @ViewChild(MatSort) sort: MatSort;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    templateMode: any;
    async ngOnInit() {

        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        const teacher = await lastValueFrom(this.teacherService.getWithId(currentUser?.id || currentUser?.docId));
        this.teacherFullName = teacher.teacherMeta['firstName'] + ' ' + teacher.teacherMeta['lastName'];

        this.configurationService.getLearningUnitTypes().subscribe((res: any) => {
            const LUtypes = res.Types;
            this.types = Object.values(LUtypes);
            this.typeCode = this.types.map((type: any) => {
                return type.code;
            })
        })

        this.configurationService.getWorkflowTypes().subscribe((res: any) => {
            this.workflowTypes = res.workflowTypes;
        }
        )

        this.configurationService.getMaturity().subscribe((res: any) => {
            this.maturities = res.maturity;
        })

        this.configurationService.getlearningunitSubjecttypes().subscribe((res: any) => {
            this.subjectTypes = res.subjectTypes;
        })


        this.workflowTemplateService.getTemplates().get().subscribe(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data() as { templateName?: string };
                if (data.templateName) {
                    const templateWords = data.templateName
                        .toLowerCase()
                        .match(/\(([^)]+)\)|\b\w+\b/g)
                        ?.map(word => word.replace(/[()]/g, '').trim()) || [];
                }
            })

        })

        this.extractTemplateName();
        this.getAllWorkflowTemplates();
        this.workflowTemplateService.templateMode$.subscribe(mode => {
            this.templateMode = mode;
        });

    }

    extractTemplateName() {
        this.workflowTemplateService.getTemplates().get().subscribe(snapshot => {
            const updatedTemplates: any[] = [];
            snapshot.forEach(doc => {
                const templateData = doc.data() as any;
                // console.log(templateData.type, templateData.createdAt, templateData.updatedAt, templateData.templateId, 'templateData');
                const data = doc.data() as { templateName?: string };
                if (data.templateName) {
                    // console.log("Template Name:", data.templateName, "ID:", doc.id);
                    let extractedData = {} as any;
                    const regex = /\((.*?)\)/g;
                    const matches = [...data.templateName.matchAll(regex)].map(match => match[1]);

                    if (matches.length >= 3) {
                        // Case 1: Parentheses Format
                        extractedData = {
                            learningUnitType: matches[0],
                            subject: matches[1],
                            maturity: matches[2]
                        };
                    } else {
                        const words = data.templateName.split(" ").slice(1);
                        if (words.length >= 3) {
                            extractedData = {
                                learningUnitType: words[0],
                                subject: words[1],
                                maturity: words[2]
                            };
                        } else {
                            // console.warn("Template format incorrect:", data.templateName);
                        }
                    }


                    if (extractedData.learningUnitType) {
                        const typeObj = this.types.find((type: any) => type.code === extractedData.learningUnitType);
                        if (typeObj) {
                            extractedData.learningUnitType = typeObj.name;
                        }
                    }

                    if (!extractedData.learningUnitType) {
                        extractedData.learningUnitType = "Not Available";
                    }
                    if (!extractedData.subject) {
                        extractedData.subject = "Not Available";
                    }
                    if (!extractedData.maturity) {
                        extractedData.maturity = "Not Available";
                    }

                    this.workflowTemplatesData.push({
                        id: doc.id,
                        templateName: data.templateName,
                        extractedData,
                        type: templateData.type,
                        createdAt: templateData.createdAt,
                        updatedAt: templateData?.updatedAt || '',
                        templateId: templateData.templateId
                    });

                }
            });

        });
    }


    onEdit(workflowData: any, workflowId: any) {
        let wfType;
        let wfDisplayValue;
        let selectedWfType;
        let wfTypeCode;

        this.workflowTemplateService.getWorkflowTemplate(workflowId).valueChanges().subscribe((data: any) => {
            wfType = data.type;
            wfDisplayValue = this.workflowTypes.filter((type: any) => type.code === data.type);

            selectedWfType = this.workflowTypes.find((type: any) => type.code === data.type);

            wfTypeCode = selectedWfType ? selectedWfType.code : '';  // Extract code

        });


        const dialogRef = this.dialog.open(WorkflowTemplateComponent, {
            data: {
                learningUnitType: workflowData.learningUnitType,
                maturity: workflowData.maturity,
                subject: workflowData.subject,
                templateName: workflowData.templateName,
                templateId: workflowId,
                // wfType: wfDisplayValue,
                // wfType: selectedWfType ? selectedWfType.code : '', 
                type: workflowData.type,
                isNewWorkflowTemplate: false,
                templateMode: workflowData.templateType
            }
        });

        // dialogRef.afterClosed().subscribe(result => {


        // });

        // dialogRef.afterClosed().subscribe(result => {
        //     if (result?.templateMode) {
        //         console.log('🟢 Template Mode saved:', result.templateMode);
        //         this.templateMode = result.templateMode;
        //     }
        // });

        // dialogRef.afterOpened().subscribe(() => {
        //     if (dialogRef.componentInstance?.templateModeChanged) {
        //         dialogRef.componentInstance.templateModeChanged.subscribe((mode: string) => {
        //             console.log('🟢 Received template mode from child:', mode);
        //             this.templateMode = mode;
        //             // You can now update your toggle here
        //         });
        //     }
        // })

    }

    createWorkflowTemplate() {
        const dialogRef = this.dialog.open(WorkflowTemplateComponent, {
            data: {
                type: '',
                maturity: '',
                subject: '',
                isNewWorkflowTemplate: true
            }
        });

        dialogRef.afterClosed().subscribe(result => {

        });
    }

    onDelete(id: any, workflowData: any) {
        const name = workflowData.templateName;
        let config = {
            title: 'Delete Workflow Template',
            // message: 'Are you sure you want to delete this assignment?',
            message: `<br><p class="">Are you sure you want to delete "${name}..."?</p>`,
            icon: {
                name: 'mat_outline:delete'
            }
        }

        const dialogRef = this.fuseConfirmationService.open(config);

        dialogRef.afterClosed().subscribe(async (result) => {
            let workflowDataSentToTrash: any;
            if (result == 'confirmed') {
                const snapshot = await lastValueFrom(this.workflowTemplateService.getTemplates().get());
                snapshot.forEach(doc => {
                    const data = doc.data() as any;

                    if (doc.id === id) {
                        workflowDataSentToTrash = data;
                        workflowDataSentToTrash['trashedBy'] = this.teacherFullName;
                    }
                }
                )
                this.workflowTemplateService.toTrash(id, workflowDataSentToTrash);
                this.workflowTemplateService.deleteInWorkflowTemplate(id);
                this.masterService.deleteWorkflowTemplateFromMasterById(id);
                this.uiService.alertMessage('Deleted', `Successfully Deleted`, 'warn');

            };
        });
    }

    async goToTrash() {
        await import('../workflow-template/manage-workflow-template-trash/manage-workflow-template-trash.module').then(() => {
            this.component = ManageWorkflowTemplateTrashComponent
            this.drawerService.drawerOpenTrashWorkflowTemplateSubject.next(true)
        })
    }


    getAllWorkflowTemplates(): void {
        this.masterService.getAllWorkflowTemplates()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res: any[]) => {
                    const allTemplates = this.flattenProgrammes(res);
                    this.workflowTemplates = allTemplates;
                    this.getWorkflowdata(this.workflowTemplates);
                    this.workflowTemplates.forEach((template: any) => {
                        if (template.learningUnitType) {
                            const typeObj = this.types.find((type: any) => type.code === template.learningUnitType);
                            if (typeObj) {
                                template.learningUnitType = typeObj.name;
                            }
                        }
                    })

                    this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'createdAt', 'desc') as Sort);

                },
                error: (err) => {
                    console.error('Error fetching programmes:', err);
                }
            });
    }

    private flattenProgrammes(response: any[]): any[] {
        return response.flatMap(doc => {
            if (doc.workflowTemplates && typeof doc.workflowTemplates === 'object' && Object.keys(doc.workflowTemplates).length > 0) {
                return Object.values(doc.workflowTemplates).map((temp: any) => ({
                    ...temp,
                    masterDocId: doc.docId
                }

                )
                );
            } else {
                console.warn('Empty or invalid programmes object:', doc.workflowTemplates);
                return [];
            }
        });
    }

    getWorkflowdata(data: any[]) {
        this.workflowTemplates = data.sort((x, y) => {
            const createdX = x.createdAt?.seconds || 0;
            const createdY = y.createdAt?.seconds || 0;
            return createdY - createdX; // Sort descending (latest first)
        });
    }


    sortData(sort: Sort) {
        const key = sort.active;
        const direction = sort.direction === 'asc' ? 1 : -1;

        this.workflowTemplates.sort((a, b) => {
            let valueA = a[key] || '';
            let valueB = b[key] || '';

            // Handle date fields
            if (key === 'createdAt' || key === 'updatedAt') {
                valueA = a[key]?.seconds || 0;
                valueB = b[key]?.seconds || 0;
            }
            // Handle string fields (case insensitive sorting)
            else if (typeof valueA === 'string' && typeof valueB === 'string') {
                return valueA.localeCompare(valueB) * direction;
            }
            // Handle numeric sorting
            return (valueA - valueB) * direction;
        });
    }


}