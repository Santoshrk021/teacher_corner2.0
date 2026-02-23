export interface Category {
    id?: string;
    title?: string;
    slug?: string;
}

export interface FirstStageSubmType {
    id?: string;
    title?: string;
    imagePath?: string;
    slug?: string;
    description?: string;
    category?: string;
    duration?: number;
    steps?: {
        order?: number;
        title?: string;
        subtitle?: string;
        content?: string;
    }[];
    totalSteps?: number;
    updatedAt?: number;
    featured?: boolean;
    progress?: {
        currentStep?: number;
        completed?: number;
    };
}

/* Courses Contents */

// export const firstStageJunior = [{
//     category: 'category test',
//     description: 'description Junior',
//     duration: '',
//     featured: true,
//     id: 'junior',
//     progress: {
//         completed: 2,
//         currentStep: 3,
//     },
//     slug: 'Basic',
//     title: 'Junior TACtivity',
//     totalSteps: 11,
//     updatedAt: "Jun 28, 2021",
// }]
// export const firstStageIntermediate = [{
//     category: 'category test',
//     description: 'description intermediate',
//     duration: '',
//     featured: true,
//     id: 'intermediate',
//     progress: {
//         completed: 2,
//         currentStep: 3,
//     },
//     slug: 'Basic',
//     title: 'Intermediate TACtivity',
//     totalSteps: 11,
//     updatedAt: "Jun 28, 2021",
// }]
// export const firstStageSenior = [{
//     category: 'category test',
//     description: 'description Senior',
//     duration: '',
//     featured: true,
//     id: 'senior',
//     progress: {
//         completed: 2,
//         currentStep: 3,
//     },
//     slug: 'Basic',
//     title: 'Senior TACtivity',
//     totalSteps: 11,
//     updatedAt: "Jun 28, 2021",
// }]
export const firstStageAllCourses: FirstStageSubmType[] = [

    {
        category: 'TACtivity',
        description: 'description Junior',
        duration: 30,
        featured: true,
        id: 'XfkoEfV3Pid7vZaFPGcc',
        imagePath:'contests-images/FtFYXXZIpGjkyU5fe9eY.png',
        progress: {
            completed: 2,
            currentStep: 0, /* Less than one */
        },
        title: 'Junior TACtivity',
        totalSteps: 6,
        updatedAt: Date.now(),

        steps: [
            {
                order: 0,
                title: 'Instructions',
                subtitle: 'Introducing the library and how it works',
                content: `<div class="card-body fiftyVH pt-0 mt-2">

                <ul>
                  <b>You need to complete four (4) assignments to complete your Stage 1 Raman Award entry. Please read
                    the instructions below, carefully, and complete the assignments, in the specific order given
                    before the 31st of July 2022. </b>
                  <li>Under the Resources tab, you will find the instruction guide and video, observation sheet and
                    material list for the given activity
                  </li>
                  <li>Please implement the activity, as instructed in the guide/video
                  </li>
                  <li>Take two (2) pictures of your completed activity from two different angles, with you present in
                    the picture (i.e. face has to be visible)
                  </li>
                  <li><strong>Assignment 1</strong> - Upload the 2 pictures in the relevant Assignment under the
                    Submission tab
                  </li>
                  <li>Take a video (no longer than 2 min) of you playing with your activity. You may speak etc while
                    demonstrating the activity; this can be in any language
                  </li>
                  <li>The video should then be uploaded on youtube, as a public video, and the URL generated
                  </li>
                  <li><strong>Assignment 2</strong> - Paste the URL in the space provided in the Assignment section
                    under the
                    Submission tab
                  </li>
                  <li>Download and complete the Observation Sheet by clicking "Download template" under the submission
                    tab. This sheet can be filled in digitally using any PDF reader, e.g. Adobe.
                  </li>
                  <li><strong>Assignment 3</strong> - Save the filled observation sheet, and upload it into the
                    relevant Assignment
                    under the Submission tab
                  </li>
                  <li> <strong>Assignment 4 </strong>- Finally, complete the Quiz Assignment under the Submission tab.
                    This quiz is
                    timed at 30 minutes total and must be attempted in one go.
                  </li>
                </ul>


              </div>`,
            },
            {
                order: 1,
                title: 'Resources',
                subtitle: 'Where to find the sample code and how to access it',
                content: ''
            },
            {
                order: 2,
                title: 'Innovation Pictures',
                subtitle: 'Where to find the sample code and how to access it',
                content: ''
            },
            {
                order: 3,
                title: 'Observation Sheet',
                subtitle: 'Where to find the sample code and how to access it',
                content: ''
            },
            {
                order: 4,
                title: 'Innovation Video',
                subtitle: 'Where to find the sample code and how to access it',
                content: ''
            },
            {
                order: 5,
                title: 'Quiz',
                subtitle: 'Where to find the sample code and how to access it',
                content: ''
            },
        ]
    },
    // {
    //     category: 'TACtivity',
    //     description: 'description intermediate',
    //     duration: 20,
    //     featured: true,
    //     id: 'intermediate',
    //     progress: {
    //         completed: 1,
    //         currentStep: 1,
    //     },
    //     title: 'Intermediate TACtivity',
    //     totalSteps: 2,
    //     updatedAt: Date.now(),
    //     steps: [],
    // },
    // {
    //     category: 'TACtivity',
    //     description: 'description Senior',
    //     duration: 20,
    //     featured: true,
    //     id: 'senior',
    //     progress: {
    //         completed: 2,
    //         currentStep: 1,
    //     },
    //     title: 'Senior TACtivity',
    //     totalSteps: 2,
    //     updatedAt: Date.now(),
    //     steps: [],
    // }
  ];

