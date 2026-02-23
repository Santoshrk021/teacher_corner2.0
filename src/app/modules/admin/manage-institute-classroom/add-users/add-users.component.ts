import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UiService } from 'app/shared/ui.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { first, lastValueFrom } from 'rxjs';
import { environment } from 'environments/environment';
import { UserService } from 'app/core/dbOperations/user/user.service';
@Component({
  selector: 'app-add-users',
  templateUrl: './add-users.component.html',
  styleUrls: ['./add-users.component.scss']
})
export class AddUsersComponent implements OnInit {
  userForm: FormGroup;
  teacher: Boolean;
  classrooms: any[] = [];
  instituteClassroomObj: any = {};
  countryCode: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any,
    private httpClient: HttpClient,
    private uiService: UiService,
    private dialogRef: MatDialog,
    private afAuth: AngularFireAuth,
    private userService: UserService,
  ) { }

  signUpForm: FormGroup;

  async ngOnInit(): Promise<void> {
    const {countryCode, phoneNumber} = await this.userService.getPhone();
    this.countryCode = countryCode;

    this.userForm = new FormGroup({
      'name': new FormControl('', Validators.required),
      'phone': new FormControl('', Validators.required),
      'email': new FormControl('', Validators.email),
      'classroom': new FormControl(`${this.data?.classroomName}, ${this.data?.institutionName}` || '', Validators.required),
    });
    this.teacher = this.data.isTeacher;
    this.classrooms = this.data.allClassrooms;
    this.selectClassroom(this.data);
  }

  selectClassroom(cls: any) {
    this.instituteClassroomObj = {
      institutionId: cls.institutionId,
      institutionName: cls.institutionName,
      classroomId: cls.classroomId,
      classroomName: cls.classroomName,
    };
  }

  onSubmit() {
    const userDetailsWithClassroom = {
      isTeacher: this.teacher,
      institutionId: this.instituteClassroomObj.institutionId,
      institutionName: this.instituteClassroomObj.institutionName,
      classroomId: this.instituteClassroomObj.classroomId,
      classroomName: this.instituteClassroomObj.classroomName,
      name: this.userForm.value.name,
      countryCode: this.countryCode,
      phoneNumber: this.userForm.value.phone,
      email: this.userForm.value.email,
    };
    this.userForm.disable();
    this.addUsers(userDetailsWithClassroom);
  }

  addUsers(userClassroom) {
    // userClassroom.phone = this.countryCode + userClassroom.phone.slice(-10)
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/users_add_into_classrooms`;

    const formData = {
      userClassroomDetails: userClassroom
    };
    const httpOption: any = {
      responseType: 'application/json'
    };

    this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then((response) => {
      console.log(response);
      this.dialogRef.closeAll();
      this.uiService.alertMessage('Successful', 'Institutions Successfully Uploaded', 'success');
      if (this.teacher) {
        this.uiService.alertMessage('Successful', 'Teacher Added To Classroom Successfully', 'success');
      }
      if (!this.teacher) {
        this.uiService.alertMessage('Successful', 'Student Added To Classroom Successfully', 'success');
      }
      this.userForm.enable();
    }).catch((error) => {
      console.error(error);
      this.uiService.alertMessage('Error', error, 'error');
      this.userForm.enable();
    });
  }

}
