import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QuizzerService {

  constructor() { }

  getTACQuesMarks(questions) {
    const quizObj = {
      maxScore: 0,
      studentScore: 0,
    };
    questions.forEach((ques) => {
      // Check if question has sub-parts
      if (ques.hasSubParts && ques.subParts && ques.subParts.length > 0) {
        // For questions with sub-parts, use sum of sub-part marks
        const subPartMarks = this.calculateSubPartMarks(ques.subParts);
        quizObj.maxScore = quizObj.maxScore + subPartMarks.maxScore;
        quizObj.studentScore = quizObj.studentScore + subPartMarks.studentScore;
      } else {
        // For regular questions without sub-parts
        quizObj.maxScore = quizObj.maxScore + ques.marks;
        quizObj.studentScore = quizObj.studentScore + this.calculateMarks(ques);
      }
    });
    return quizObj;
  }

  /**
   * Calculate marks for sub-parts
   * Each sub-part is evaluated individually and gets its own marks
   */
  calculateSubPartMarks(subParts: any[]): { maxScore: number; studentScore: number } {
    let maxScore = 0;
    let studentScore = 0;

    subParts.forEach((subPart) => {
      const subPartMaxMarks = subPart.marks || 1;
      maxScore += subPartMaxMarks;

      // Check if all options in sub-part are correctly answered
      if (subPart.options && subPart.options.length > 0) {
        let correctCount = 0;
        for (const option of subPart.options) {
          if (option.isCorrect === option.attemptedOption) {
            correctCount++;
          }
        }
        // Full marks for sub-part only if all options match
        if (correctCount === subPart.options.length) {
          studentScore += subPartMaxMarks;
        }
      }
    });

    return { maxScore, studentScore };
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
