import { FormControl } from '@angular/forms';
import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { take } from 'rxjs';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
// import { DownloadDirectiveDirective } from 'app/shared/directives/download-directive.directive';

@Component({
  selector: 'app-contest-assignment',
  templateUrl: './contest-assignment.component.html',
  // providers: [DownloadDirectiveDirective],
  styleUrls: ['./contest-assignment.component.scss']
})
export class ContestAssignmentComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() workflow;
  @Input() selectedStageSubm;
  @Input() workflowId;
  quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline',],        // toggled buttons
        [{ 'size': ['small', false, 'large'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, false] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
      ],
    }
  };
  params: any;
  studentId: any;
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private studentService: StudentsService,
    private assignmentsService: AssignmentsService,

  ) { }
  ngAfterViewInit(): void {
    this.checkResourcePath(this.studentId);
    // console.log(this.selectedStageSubm);

  }
  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
  }


  checkResourcePath(studentId) {
    const stageId = this?.params.stageId;
    const submissionId = this?.params.submId;
    // this.assignmentsService.getContestSubmissions(studentId, this.params.contestId).pipe(take(1)).subscribe((res: any) => {
    //   console.log(res);
    //   const submissionMeta = res.data()?.[`stageId-${stageId}`]?.[`submId-${submissionId}`]
    //   this.studentService.contestSubmissionMeta.next(submissionMeta)
    // })

    /* Here Checking the Submission values */

  }
}
