import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { environment } from 'environments/environment';
import { first, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-assignment-submit',
  templateUrl: './assignment-submit.component.html',
  styleUrls: ['./assignment-submit.component.scss']
})
export class AssignmentSubmitComponent implements OnInit {

  assignment: any;
  isAssignmentUi: boolean = false;
  environment = environment;

  constructor(
    private route: ActivatedRoute,
    private assignmentService: AssignmentsService,
    private router: Router,
  ) { }

  async ngOnInit(): Promise<void> {
    const {assignmentId} = await this.getFromParams();
    const assignment = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(assignmentId));
    if(!assignment.exists) {
      this.isAssignmentUi = false;
    } else {
      this.isAssignmentUi = true;
      this.assignment = assignment.data();
    }
  }

  async getFromParams() {
    return await lastValueFrom(this.route.queryParams.pipe(first()));
  }

  async goBack() {
    const {institutionId, classroomId, programmeId} = await this.getFromParams();
    this.router.navigate([`dashboard/${classroomId}`],
      {
        queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: programmeId }
      },
    );
    // history.back();
  }

}
