import { FormControl } from '@angular/forms';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DownloadDirectiveDirective } from 'app/shared/directives/download-directive.directive';
import { ActivatedRoute } from '@angular/router';
import { first, lastValueFrom } from 'rxjs';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';

@Component({
  selector: 'app-contest-assignment',
  templateUrl: './contest-assignment.component.html',
  providers: [DownloadDirectiveDirective],
  styleUrls: ['./contest-assignment.component.scss']
})
export class ContestAssignmentComponent implements OnInit, OnChanges {
  @Input() workflow;
  @Input() selectedStageSubm;
  @Input() workflowId;
  contestType;
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
  constructor(
    private route: ActivatedRoute,
    private contestService: ContestService,
  ) { }
  async ngOnInit(): Promise<void> {
    const { contestId } = await lastValueFrom(this.route.queryParams.pipe(first()));
    const selectedContest = await lastValueFrom(this.contestService.getContestByIdOnce(contestId));
    this.contestType = selectedContest.get('type');
  }
  ngOnChanges(changes: SimpleChanges): void {
    // console.log(this.workflow);
  }
}
