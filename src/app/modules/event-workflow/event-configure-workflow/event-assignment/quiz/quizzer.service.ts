import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuizzerService {

  isNotQuizUi=true;
  constructor() { }

  getTACQuesMarks(questions) {
    const quizObj = {
      maxScore: 0,
      studentScore: 0,
    };
    questions.forEach((ques) => {
      quizObj.maxScore = quizObj.maxScore ? quizObj.maxScore + ques.marks : ques.marks;
      quizObj.studentScore = quizObj.studentScore ? quizObj.studentScore + this.calculateMarks(ques) : this.calculateMarks(ques);
    });
    return quizObj;
  }

  calculateMarks(ques) {

    let count = 0;
    if (ques.questionType === 'MCQ') {
      for (const option of ques.options) {
        if (option.isCorrect === option.attemptedOption) {
          count++;
        }
      }
      if (count === ques.options.length) {
        return ques.marks;
      } else {
        return 0;
      }
    } else if (ques.questionType === 'FILL_IN_THE_BLANKS' || ques.questionType === 'RICH_BLANKS') {

      const totalMarks = ques.marks;
      const totalBlank = Object.entries(ques.blanksObj).length;

      for (const blankName of Object.keys(ques.blanksObj)) {
        if (ques[blankName]['selectedOption'].isCorrect) {
          count++;
        }
      }
      let marksObtained = totalMarks / totalBlank * count;
      if (marksObtained.toString().includes('.')) {
        marksObtained = Number((marksObtained).toFixed(2));
      }
      return marksObtained;
    } else if (ques.questionType === 'TEXT') {
      if (ques?.text) {
        return ques.marks;
      } else {
        return 0;
      }
    }

  }
}
