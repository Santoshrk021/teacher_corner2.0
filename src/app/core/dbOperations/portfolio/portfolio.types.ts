import firebase from "firebase/compat/app";
export interface Portfolio {
    createdAt: firebase.firestore.Timestamp;
    docId: string;
    studentId: string;
    studentName: string;
    updatedAt: firebase.firestore.Timestamp;
    contestSubmissions?: ContestSubmissions;
    classroomSubmissions?: ClassroomSubmissions;
    eventSubmissions?: EventSubmissions;
}

export interface ClassroomSubmissions {
    [classroomId: string]: Classroom;
}

export interface ContestSubmissions {
    [contestId: string]: Contest;
}

export interface EventSubmissions {
    [eventId: string]: Event;
}

interface Classroom {
    classroomId: string;
    classroomName: string;
    institutionId: string;
    institutionName: string;
    programmes: Programmes;
}

interface Programmes {
    [programmeId: string]: Programme;
}

interface Programme {
    programmeId: string;
    programmeName: string;
    learningUnits: LearningUnits;
}

interface LearningUnits {
    [learningUnitId: string]: LearningUnit;
}

interface LearningUnit {
    learningUnitId: string;
    learningUnitName: string;
    workflowId: string;
    workflowTemplateName: string;
    assignments: Assignments;
}

interface Assignments {
    [assignmentId: string]: Assignment;
}

interface Assignment {
    assignmentId: string;
    assignmentName: string;
    assignmentType: "FORM" | "UPLOAD" | "QUIZ";
    fileType: "IMAGE" | "PDF";
    submissionPath: string;
}

interface Contest {
    contestId: string;
    contestName: string;
    stages: Stages;
}

interface Stages {
    [stageId: string]: Stage;
}

interface Stage {
    stageId: string;
    stageName: string;
    submissions: Submissions;
}

interface Submissions {
    [submissionId: string]: Submission;
}

interface Submission {
    submissionId: string;
    submissionName: string;
    workflowId: string;
    workflowTemplateName: string;
    assignments: Assignments;
}

interface Event {
    contestId: string;
    contestName: string;
    batches: Batches;
}

interface Batches {
    [batchId: string]: Batch;
}

interface Batch {
    batchId: string;
    batchName: string;
    submissions: Submissions;
}