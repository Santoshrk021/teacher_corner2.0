import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UiService } from 'app/shared/ui.service';

@Component({
  selector: 'app-quiz-interface',
  templateUrl: './quiz-interface.component.html',
  styleUrls: ['./quiz-interface.component.scss']
})
export class QuizInterfaceComponent implements OnInit {

  @Input() quizInfo
  @Input() indexObj;
  @Input() allQuestionsFormGroup;
  @Input() qusBehaviorSub;
  @Input() lastStep;
  @Output() studentResponceEmitter = new EventEmitter();

  allQuestionsFormArr: any[] = []
  questionsFormGroup: FormGroup;
  constructor(public fb: FormBuilder, private uiService: UiService) {
    this.questionsFormGroup = this.fb.group({
      questions: this.fb.array([])
    });

    // this.questionsFormGroup.get('questions').valueChanges.subscribe(d=>{
    //   console.log(d);

    // })



  }
  ngOnInit(): void {
    // console.log(this.quizInfo);
    // qustionArr.forEach(qus => {
    // console.log(this.allQuestionsFormGroup); 
    // })
    if (this.allQuestionsFormGroup !=undefined) {
      this.allQuestionsFormArr = this.allQuestionsFormGroup;
      
    }
    // console.log(this.allQuestionsFormArr);
    
  }
  onEmitter(event){
    this.studentResponceEmitter.emit(event)
  }
 
}
