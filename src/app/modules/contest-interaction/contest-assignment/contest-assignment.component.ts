import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { take } from 'rxjs';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ContestSubmissionsService } from 'app/core/dbOperations/contestSubmissions/contestSubmissions.service';
import { ContestInteractionService } from '../contest-interaction.service';

@Component({
  selector: 'app-contest-assignment',
  templateUrl: './contest-assignment.component.html',
  styleUrls: ['./contest-assignment.component.scss']
})
export class ContestAssignmentComponent implements OnInit, AfterViewInit {
  @Input() workflow
  @Input() isOldContest
  @Input() isLastStep
  @Input() selectedStageSubm
  @Input() workflowId
  @Input() rawWorkflowInfo
  @Input() contestInfo
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
  }
  params: any;
  studentId: any;
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private studentService: StudentsService,
    private contestSubmissionsService: ContestSubmissionsService,
    private contestInteractionService: ContestInteractionService,
  ) { }

  async ngAfterViewInit(): Promise<void> {
    await this.getCurrentStudent()
  }

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
    })

    const typesToAvoid = ['TEXTBLOCK'];
    const isTextBlockOrResources = this.workflow.contents.every((content: any) => typesToAvoid.includes(content.assignmentType));
    if (isTextBlockOrResources) {
      this.contestInteractionService.unlockedSteps.next(this.workflow.sequenceNumber);
    };
  }

  async getCurrentStudent() {
    const studentId = this.studentService.currentStudentId.value
    if (studentId) {
      this.checkResourcePath(studentId)
      this.studentId = studentId
      return
    }
    await (await this.userService.getCurrentStudentInfo()).pipe(take(1)).subscribe(res => {
      this.studentId = res.currentStudentInfo.studentId
      this.checkResourcePath(this.studentId)
    })
  }

  checkResourcePath(studentId) {
    const stageId = this?.params.stageId
    const submissionId = this?.params.submId
    // this.assignmentsService.getContestSubmissions(studentId, this.params.contestId).pipe(take(1)).subscribe((res: any) => {
    //   const submissionMeta = res.data()?.[`stageId-${stageId}`]?.[`submId-${submissionId}`]
    //   this.studentService.contestSubmissionMeta.next(submissionMeta)
    // })

    /* Here Checking the Submission values */
    this.contestSubmissionsService.getContestSubmValuChanges(studentId, this.params.contestId).subscribe(async (res: any) => {
      const submissionMeta = await res?.[`stageId-${stageId}`]?.[`submId-${submissionId}`]
      this.studentService.contestSubmissionMeta.next(submissionMeta)
    })
  }

  onTabChange(index) {
    const typesToAvoid = ['RESOURCES'];
    const isTextBlockOrResources = this.workflow.contents.every((content: any) => typesToAvoid.includes(content.contentType));
    if (isTextBlockOrResources && this.workflow.contents.length === index + 1) {
      this.contestInteractionService.unlockedSteps.next(this.workflow.sequenceNumber);
    };
  }

}
