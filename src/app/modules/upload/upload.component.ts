import { Component, Input, OnInit } from '@angular/core';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { environment } from 'environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {
  @Input() contentInfo: any;
  isAssignmentUi: boolean = false;
  assignments: any;
  environment = environment;

  constructor(
    private assignmentsService: AssignmentsService,
  ) { }

  ngOnInit(): void {
    // this.getAssignments();
  }

  async getAssignments() {
    const assId = this.contentInfo.assignmentId;
    const assignment = await lastValueFrom(this.assignmentsService.getAssignmentByIdOnce(assId));
    if (!assignment.exists) {
      this.isAssignmentUi = false;
      return;
    };
    assignment.get('assignments').map(data => data['dueDate'] = this.contentInfo['assignmentDueDate']);
    this.assignments = assignment.data();
  }

}
