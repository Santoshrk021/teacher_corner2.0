import { Component, Input, OnInit } from '@angular/core';
import { arrayUnion, serverTimestamp } from '@angular/fire/firestore';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { first, lastValueFrom, take } from 'rxjs';

@Component({
  selector: 'app-video-form',
  templateUrl: './video-form.component.html',
  styleUrls: ['./video-form.component.scss']
})
export class VideoFormComponent implements OnInit {
  @Input() contentInfo;
  videoForm = this.fb.group({
    videoLink: [''],
  });

  params: any;
  assignmentId: any;
  teacherId: any;
  constructor(
    private fb: FormBuilder,
    private assignmentService: AssignmentsService,
    private route: ActivatedRoute,
    private deviceInfoService: DeviceInfoService,
    private userService: UserService,
    private uiService: UiService,
    private teacherService: TeacherService

  ) {

    this.videoForm.get('videoLink').valueChanges.subscribe((res) => {

      if (res.length) {
        this.isActive = true;
      }
      else {
        this.isActive = false;

      }
    });
  }
  isActive = false;

  async ngOnInit(): Promise<void> {
    this.assignmentId = this.contentInfo.assignmentId;

    // this.assignmentService.getWithId(assignmentId).pipe(take(1)).subscribe(res => {
    //   console.log(res);
    // })
    this.teacherId = await this.userService.getUid();

    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
    });
  }

  async onSave() {
    // const [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const d = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

    const obj = {
      [`batchId-${this.params.batchId}`]: {
        [`submId-${this.params.submId}`]: {
          [`assignmentId-${this.assignmentId}`]: {
            videoLink: this.videoForm.get('videoLink').value
          }
        }
      },
      submissionMeta: arrayUnion(d)
    };

    this.assignmentService.updateEventSubmission(this.params.eventId, this.teacherId, obj).then(async () => {
      this.uiService.alertMessage('successful', 'video saved successfully', 'success');
    });
    this.saveFlagInTeacherDoc();
    this.isActive = false;
  }

  saveFlagInTeacherDoc() {
    const obj = {
      eventSubmissions: {
        [`eventId_${this.params.eventId}`]: {
          [`batchId_${this.params.batchId}`]: {
            [`submId_${this.params.submId}`]: {
              isSubmitted: true,
              submittedAt: serverTimestamp()
            }
          }
        }
      }
    };

    this.teacherService.updateTeacher(obj, this.teacherId);
  }
}
