import { Component, Input, OnInit } from '@angular/core';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-textblock-view',
  templateUrl: './textblock-view.component.html',
  styleUrls: ['./textblock-view.component.scss']
})
export class TextblockViewComponent implements OnInit {
  @Input() formId: string;
  @Input() contentInfo: any;
  @Input() workflowId: string;
  @Input() assignmentIdwithtabchange: string;

  @Input() currentData: any;


  content: any;

  constructor(
    private assignmentService: AssignmentsService,
  ) { }

  ngOnInit(): void {
    this.getFormDetails();
  }

  async getFormDetails() {
    const formDetails = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(this.formId));
    this.content = formDetails.data();
  }

}
