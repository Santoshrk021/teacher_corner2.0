import { Injectable } from '@angular/core';
import { ClassroomOld } from 'app/core/dbOperations/classrooms/classroom.types';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DummyService {
  tactivities = [
    {
      'id': '694e4e5f-f25f-470b-bd0e-26b1d4f64028',
      'name': 'Explore Binocular Vision',
      'description': 'Introductory course for Angular and framework basics',
      'category': 'science',

    },
    {
      'id': 'f924007a-2ee9-470b-a316-8d21ed78277f',
      'name': 'Blubber Model',
      'description': 'Beginner course for Typescript and its basics',
      'category': 'science',

    },
    {
      'id': '0c06e980-abb5-4ba7-ab65-99a228cab36b',
      'name': 'Reaction - Acids and Bases',
      'description': 'Step by step guide for Android N: Quick Settings',
      'category': 'science',

    },
    {
      'id': '1b9a9acc-9a36-403e-a1e7-b11780179e38',
      'name': 'Balloon Propeller',
      'description': 'Dive deep into Google Assistant apps using Firebase',
      'category': 'mathematics',

    },
    {
      'id': '1b9a9acc-9a36-403e-a1e7-b117801798',
      'name': 'CD Top',
      'description': 'Dive deep into Google Assistant apps using Firebase',
      'category': 'mathematics',

    }

  ];
  tacCategories = [
    {
      'id': '5648a630-979f-4403-8c41-fc9790dea8cd',
      'name': 'Science',
      'slug': 'science'
    },
    {
      'id': '02f42092-bb23-4552-9ddb-cfdcc235d48f',
      'name': 'Mathematics',
      'slug': 'mathematics'
    },

  ];

  quizQus = [
    {
      'Title': 'We are often told that the like poles of a magnet repel each other and that the unlike poles attract. We also know that when we hold a magnetic compass, its North pole points towards the geographic North, and that the Earth acts like a large bar magnet. What does that tell us about the orientation of this ‘Earth bar magnet’?',
      'OneCorrectOption': true,
      'QuestionType': 'MCQ',
      'PedagogyType': 'FA',
      'Marks': 1,
      'TACtivity': {
        'displayName': 'Potometer Model',
        'TAC_Code': 'BP36'
      },
      'Options': [
        {
          'Correct': false,
          'Title': 'Earth’s geographic north pole is near its magnetic north pole',
          'AttemptedOption': false
        },
        {
          'Title': 'Earth’s magnetic south pole is near its geographic south pole',
          'Correct': false,
          'AttemptedOption': false
        },
        {
          'Title': 'Earth’s magnetic north pole is near its geographic south pole',
          'Correct': true,
          'AttemptedOption': false
        },
        {
          'Correct': false,
          'Title': 'None of the above',
          'AttemptedOption': false
        }
      ],
      'Resources': [],
      'TimeBound': 0,
      'TimeTaken': 0
    },
    {
      'Title': '<p>Refer to the information on the right and answer. In Table 2.2, some of the variables have been marked as independent/dependent/controlled for each of the two experiments. Fill the blank spaces with appropriate types of variables depending on whether that variable should be varied/observed/kept constant for that experiment.</p><p>Row 1→ CA: __(a)__ IO: __(b)__ TE: __(c)__ TI: __(d)__&nbsp;<br>Row 2→ CB: __(e)__ FS: __(f)__ SA: __(g)__ TI: __(h)__&nbsp;</p>',
      'OneCorrectOption': true,
      'QuestionType': 'Rich blanks',
      'PedagogyType': 'FA',
      'Marks': 1,
      'TACtivity': {
        'displayName': 'Potometer Model',
        'TAC_Code': 'BP36'
      },
      'Blanks': {
        'Blank a': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],
        'Blank b': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],
        'Blank c': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],
        'Blank d': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],
        'Blank e': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],
        'Blank f': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],
        'Blank g': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],
        'Blank h': [
          {
            'Correct': true,
            'Title': 'dependent'
          },
          {
            'Correct': true,
            'Title': 'controlled'
          },
          {
            'Correct': false,
            'Title': 'independent'
          }

        ],

      },

      'Resources': [
        {
          'DisplayTitle': 'RYSI',
          'URL': 'https://www.youtube.com/embed/Vtv0tY_dMbg',
          'Type': 'video'
        },
        {
          'DisplayTitle': 'pdf',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/Science-Literacy%2FCBE-Grade10%2FCBE%20Case%20Study%20-%20Life%20Processes%20-%20Nutrition%20in%20Human%20Beings%2FLife%20Process%20-%20Q3%20-%20Resource%20.pdf?alt=media&token=6d555a18-d00f-4181-b985-80302d6ec231',
          'Type': 'pdf'
        },

        {
          'DisplayTitle': 'image',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RYSI2022Resources%2FquizzesResources%2Fstage2%2FIntermediateQus11-12.png?alt=media&token=2c89e57a-9170-4861-8b85-c73f8201625f',
          'Type': 'image'
        }
      ],
      'TimeBound': 0,
      'TimeTaken': 0
    },
    {
      'Title': 'Refer to the information on the right and answer. Based on the observations related to the effect of amount of saliva and temperature on the digestion time, fill the following two blanks:1.	Time taken by food to digest is <<blank>> to the amount of saliva added to the food2.	Time taken by food to digest is <<blank>> to the temperature of food sample',
      'OneCorrectOption': true,
      'QuestionType': 'Fill in the Blanks',
      'PedagogyType': 'FA',
      'Marks': 1,
      'TACtivity': {
        'displayName': 'Potometer Model',
        'TAC_Code': 'BP36'
      },
      'Blanks': {
        'Blank1': [
          {
            'Correct': false,
            'Title': 'directly propertional'
          },
          {
            'Correct': true,
            'Title': 'inversly propertional'
          },
          {
            'Correct': false,
            'Title': 'no'
          }

        ],

        'Blank2': [
          {
            'Correct': false,
            'Title': 'directly propertional'
          },
          {
            'Correct': true,
            'Title': 'inversly propertional'
          },
          {
            'Correct': false,
            'Title': 'no'
          }

        ]

      },

      'Resources': [
        {
          'DisplayTitle': 'RYSI',
          'URL': 'https://www.youtube.com/embed/Vtv0tY_dMbg',
          'Type': 'video'
        },
        {
          'DisplayTitle': 'pdf',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/Science-Literacy%2FCBE-Grade10%2FCBE%20Case%20Study%20-%20Life%20Processes%20-%20Nutrition%20in%20Human%20Beings%2FLife%20Process%20-%20Q3%20-%20Resource%20.pdf?alt=media&token=6d555a18-d00f-4181-b985-80302d6ec231',
          'Type': 'pdf'
        },

        {
          'DisplayTitle': 'image',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RYSI2022Resources%2FquizzesResources%2Fstage2%2FIntermediateQus11-12.png?alt=media&token=2c89e57a-9170-4861-8b85-c73f8201625f',
          'Type': 'image'
        }
      ],
      'TimeBound': 0,
      'TimeTaken': 0
    },
    {
      'Title': 'Write the names of the variables in your experiment setup. If you want help in understanding what are variables, go through the recording of the RYSI BootCamp session on variables and constants.',
      'QuestionType': 'Text',
      'PedagogyType': 'FA',
      'Marks': 1,
      'TACtivity': {
        'TAC_Code': 'PE05',
        'displayName': 'Wind Turbine Model (Bottle)'
      },
      'Text': '',
      'Answer': 'variables are',
      'MaxCharLength': 1000,
      'Resources': [
        {
          'DisplayTitle': 'RYSI BootCamp Session Recording',
          'URL': 'https://www.youtube.com/embed/Vtv0tY_dMbg',
          'Type': 'video'
        }
      ],
      'TimeBound': 0,
      'TimeTaken': 0
    },
    {
      'Title': 'Jimmy made cardboard boats which would drift upon placing in water even if the water is completely stationary. The trick was to attach magnets below each boat. The magnets would exert force on one another and make the boats move. Since Jimmy had only one bar magnet, he had to magnetise an iron nail to make another magnet.\n\nJimmy places a bar magnet in one boat and the magnetised nail in the other boat.\n\nWhat should Jimmy use and what test should he conduct to find if the nail is magnetised before attaching it to the boat?',
      'OneCorrectOption': true,
      'QuestionType': 'MCQ',
      'PedagogyType': 'FA',
      'Marks': 1,
      'TACtivity': {
        'TAC_Code': 'PM07',
        'displayName': 'Magnetism - Field Lines'
      },
      'Options': [
        {
          'Title': 'Use another iron nail; both nails should repel each other',
          'Correct': false,
          'AttemptedOption': false
        },
        {
          'Correct': false,
          'Title': 'Use a magnet; both the ends of the iron nail should get attracted to the North pole of the magnet.',
          'AttemptedOption': false
        },
        {
          'Title': 'Use a magnet; none of the ends of the nail should get attracted to the North pole of the magnet.',
          'Correct': false,
          'AttemptedOption': false
        },
        {
          'Correct': true,
          'Title': 'Use a magnet; one end of the nail should get pulled towards the South pole of the magnet and the other end should get pushed away from it. ',
          'AttemptedOption': false
        }
      ],
      'Resources': [
        {
          'DisplayTitle': 'Fig. 1.4, Jimmy’s boats',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RYSI2022Resources%2FquizzesResources%2Fstage2%2FIntermediateQus11-12.png?alt=media&token=2c89e57a-9170-4861-8b85-c73f8201625f',
          'Type': 'image'
        }
      ],
      'TimeBound': 0,
      'TimeTaken': 0
    },
    {
      'Title': 'Jimmy made cardboard boats which would drift upon placing in water even if the water is completely stationary. The trick was to attach magnets below each boat. The magnets would exert force on one another and make the boats move. Since Jimmy had only one bar magnet, he had to magnetise an iron nail to make another magnet.\n\nJimmy places a bar magnet in one boat and the magnetised nail in the other boat.\n\nWhen Jimmy pushed Boat A towards Boat B (see Fig. 1.4), Boat B started moving away. Identify the north pole of the magnetised nail?',
      'OneCorrectOption': true,
      'QuestionType': 'MCQ',
      'PedagogyType': 'FA',
      'Marks': 1,
      'TACtivity': {
        'TAC_Code': 'PM07',
        'displayName': 'Magnetism - Field Lines'
      },
      'Options': [
        {
          'Title': 'End P of the nail',
          'Correct': false,
          'AttemptedOption': false
        },
        {
          'Correct': true,
          'Title': 'End Q of the nail',
          'AttemptedOption': false
        },
        {
          'Correct': false,
          'Title': 'Entire nail is south pole',
          'AttemptedOption': false
        },
        {
          'Title': 'Top part of the nail along its length from P to Q',
          'Correct': false,
          'AttemptedOption': false
        }
      ],
      'Resources': [
        {
          'DisplayTitle': 'Fig. 1.4, Jimmy’s boats',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RYSI2022Resources%2FquizzesResources%2Fstage2%2FIntermediateQus11-12.png?alt=media&token=2c89e57a-9170-4861-8b85-c73f8201625f',
          'Type': 'image'
        },
        {
          'DisplayTitle': 'Fig. 1.4, VIDEO',
          'URL': 'https://youtu.be/uNRweCWHVgw',
          'Type': 'video'
        },
        {
          'DisplayTitle': 'Fig. 1.4, PDF',
          'URL': 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RamanAward2022%2F8dUv5c4YCCbcvzB6YDcmE0kr1gs1-Adhabfgww5QHagvpBvuC%2Fachary-obs-sheet?alt=media&token=bc6cfe70-5aac-4ccf-9791-3edb3abff3c1',
          'Type': 'pdf'
        }
      ],
      'TimeBound': 0,
      'TimeTaken': 0
    }
  ];


  /* classroom */
  classroom: ClassroomOld[] = [{
    institutionName: 'ThinkTAC',
    institutionId: 'plkjbxcvbjkrgnm',
    classroomName: 'ThinkTac Demo',
    classroomId: 'kX2C5lbkqvPxKyzvAP65',
    programmeName: 'Summer Programme',
    programmeId: 'kX2C5lbkqvPxKyzvAP65',
  },
  {
    institutionName: 'ThinkTAC',
    institutionId: 'plkjbxcvbjkrgnm',
    classroomName: 'CBE Demo',
    classroomId: 'pkhgfdefghjvb',
    programmeName: 'Premium Programme',
    programmeId: 'mhgrewsxcvbhjkkj',
  }
  ];
  tacSubject = new BehaviorSubject(this.tactivities);
  tacCategorySub = new BehaviorSubject(this.tacCategories);
  quizSubject = new BehaviorSubject(this.quizQus);

  constructor() { }
  getAllClassroom() {
    return this.classroom;
  }
}


