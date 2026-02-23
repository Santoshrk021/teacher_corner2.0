import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-video-link-form',
  templateUrl: './video-link-form.component.html',
  styleUrls: ['./video-link-form.component.scss']
})
export class VideoLinkFormComponent implements OnInit {
  @Input() contentInfo;
  videoForm: FormGroup;
  constructor(private fb: FormBuilder, private assignmentService: AssignmentsService) {

  }

  ngOnInit(): void {
    // const assignmentId = this.contentInfo.assignmentId;
    this.videoForm = this.fb.group({
      videoLink: [''],
    });
    // this.assignmentService.getWithId(assignmentId).pipe(take(1)).subscribe(res => {
    //   console.log(res);
    // })
  }

}
