import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { ContestNominationsFirestore } from './contestNominations.firestore';
import { AngularFirestore, QueryFn } from '@angular/fire/compat/firestore';
import { Timestamp } from '@angular/fire/firestore';
import { times } from 'lodash';

@Injectable({
    providedIn: 'root'
})
export class ContestNominationsService {
    private contestIdSubject = new BehaviorSubject<string | null>(null);
    contestId$ = this.contestIdSubject.asObservable();

    constructor(private contestNominationdFirestore: ContestNominationsFirestore,
        private afs: AngularFirestore
    ) {
        // Subscribe to contestId changes and update basePath in Firestore service
        this.contestId$.subscribe((contestId) => {
            if (contestId) {
                this.contestNominationdFirestore.basePath = contestId;
            }
        });
    }

    setContestId(contestId: string) {
        this.contestIdSubject.next(contestId);
    }

    setStudentDoc(docId: string, value: any) {
        return this.contestNominationdFirestore.update(value, docId);
    }

    get(docId: string) {
        return this.contestNominationdFirestore.doc$(docId);
    }

    getContestDataByDocIdAndContestId(docId: string, contestId: string) {
        this.contestNominationdFirestore.basePath = contestId;
        return this.contestNominationdFirestore.getWithGet(docId);
    }

    getWithQuery(query: QueryFn) {
        return this.contestNominationdFirestore.collection$(query).pipe(take(1));
    }

    getQueryWithGet(query: QueryFn) {
        return this.contestNominationdFirestore.getQueryWithGet(query);
    }
    updateWidthoutMerge(value, studentDocId) {
        return this.contestNominationdFirestore.updateWithoutMerge(value, studentDocId);
    }

    getQueryByFields(contestId: string, field: string, value: any) {
        return this.afs.collection(`Contest_${contestId}`, ref => ref.where(field, '==', value)).get();
    }


    /**
     * Get all institution nominations for a contest
     */
    async getAllInstitutionNominations(contestId: string): Promise<any[]> {
        const institutionFirestore = new ContestNominationsFirestore(this.afs);
        institutionFirestore.basePath = `Contest_${contestId}/--InstitutionNomination--/Institutions`;

        try {
            // Get all documents in the collection (no query filter needed)
            const querySnapshot: any = await institutionFirestore.getQueryWithGet((ref) => ref);
            return querySnapshot.docs?.map(doc => ({ id: doc.id, ...doc.data() })) || [];
        } catch (error) {
            console.error(`Error getting all institution nominations for contest ${contestId}:`, error);
            return [];
        }
    }


    /**
     * Get institution nomination stats by grade
     */
    async getInstitutionNominationStats(contestId: string, institutionId: string): Promise<any> {
        const institutionDoc = await this.getInstitutionNominationDoc(contestId, institutionId);

        if (!institutionDoc) {
            return {
                nominationsByClasses: {},
                lastUpdated: null
            };
        }

        return {
            nominationsByClasses: institutionDoc.nominationsByClasses || {},
            lastUpdated: institutionDoc.updatedAt || institutionDoc.createdAt
        };
    }

    /**
    * Check if institution has nominations in contest
    */
    async hasInstitutionNominations(contestId: string, institutionId: string): Promise<boolean> {
        const institutionDoc = await this.getInstitutionNominationDoc(contestId, institutionId);

        if (!institutionDoc || !institutionDoc.nominationsByClasses) {
            return false;
        }

        // Check if there are any nominations in any class
        const totalNominations: any = Object.values(institutionDoc.nominationsByClasses)
            .reduce((sum: number, count: any) => sum + (count || 0), 0);

        return totalNominations > 0;
    }

    /**
     * Delete institution nomination document
     */
    async deleteInstitutionNomination(contestId: string, institutionId: string): Promise<void> {
        const institutionFirestore = new ContestNominationsFirestore(this.afs);
        institutionFirestore.basePath = `Contest_${contestId}/--InstitutionNomination--/Institutions`;

        try {
            await institutionFirestore.delete(institutionId);
            // console.log(`✅ Deleted institution nomination for ${institutionId} in contest ${contestId}`);
        } catch (error) {
            console.error(`❌ Error deleting institution nomination:`, error);
            throw error;
        }
    }

    /**
     * Get contest students count by institution and grade
     */
    async getContestStudentsCount(contestId: string, institutionId: string, grade?: string): Promise<number> {
        // Set basePath for the contest
        this.contestNominationdFirestore.basePath = contestId;

        let query: QueryFn;

        if (grade) {
            // Query for specific grade
            query = (ref) => ref
                .where('studentMeta.institutionId', '==', institutionId)
                .where('studentMeta.grade', '==', grade);
        } else {
            // Query for all students from institution
            query = (ref) => ref
                .where('studentMeta.institutionId', '==', institutionId);
        }

        try {
            const results: any = await this.contestNominationdFirestore.getQueryWithGet(query);
            return results.docs?.length || 0;
        } catch (error) {
            console.error(`Error getting contest students count:`, error);
            return 0;
        }

    }


    async getInstitutionNominationDoc(contestId: string, institutionId: string): Promise<any> {
        try {
            const institutionCollection = `Contest_${contestId}/--InstitutionNomination--/Institutions`;
            const docRef = this.afs.collection(institutionCollection).doc(institutionId);
            const docSnapshot = await firstValueFrom(docRef.get());
            return docSnapshot.exists ? docSnapshot.data() : null;
        } catch (error) {
            if (error?.code === 'not-found') {
                return null;
            }
            console.error('Error getting institution nomination doc:', error);
            throw error;
        }
    }

    /**
     * Extract grade from classroom information with multiple fallback methods
     */
    private extractGradeFromClassroom(classroomInfo: any): string | null {
        // Method 1: Check if grade property exists directly
        if (classroomInfo.grade) {
            return classroomInfo.grade.toString();
        }

        // Method 2: Extract from classroom/stemClub name
        const classroomName = classroomInfo.classroomName || classroomInfo.stemClubName;
        if (classroomName) {
            const grade = this.extractGradeFromClassroomName(classroomName);
            if (grade) {
                return grade;
            }
        }

        // Method 3: Check other possible properties
        if (classroomInfo.classGrade || classroomInfo.gradeLevel) {
            return (classroomInfo.classGrade || classroomInfo.gradeLevel).toString();
        }

        console.warn('Could not extract grade from classroom info:', classroomInfo);
        return null;
    }

    /**
     * Extract grade number from classroom name
     * Supports formats: "2 A", "Grade 5", "Class 5", "5th Grade", "Grade-5", etc.
     */
    private extractGradeFromClassroomName(classroomName: string): string | null {
        if (!classroomName) return null;

        // Remove extra whitespace and normalize
        const normalizedName = classroomName.trim();

        // Common patterns for grade extraction (order matters - most specific first)
        const gradePatterns = [
            /^(\d+)\s+[A-Z]$/i,                    // "2 A", "5 B", "10 C" (most common format)
            /^(\d+)\s*[A-Za-z]+$/,                 // "2A", "5Grade", "10Class"
            /Grade[\s-]*(\d+)/i,                   // "Grade 5", "Grade-5", "grade 5"
            /Class[\s-]*(\d+)/i,                   // "Class 5", "Class-5", "class 5"
            /(\d+)(?:st|nd|rd|th)[\s-]*Grade/i,    // "5th Grade", "1st Grade"
            /(\d+)(?:st|nd|rd|th)[\s-]*Class/i,    // "5th Class", "1st Class"
            /Level[\s-]*(\d+)/i,                   // "Level 5", "Level-5"
            /Std[\s-]*(\d+)/i,                     // "Std 5", "Std-5"
            /^(\d+)$/,                             // Just a number "5"
        ];

        for (const pattern of gradePatterns) {
            const match = normalizedName.match(pattern);
            if (match && match[1]) {
                const grade = parseInt(match[1], 10);
                // Validate that it's a reasonable grade (1-12)
                if (grade >= 1 && grade <= 12) {
                    return match[1];
                }
            }
        }

        // If no pattern matches, try to find the first number in the string
        const numberMatch = normalizedName.match(/(\d+)/);
        if (numberMatch) {
            const grade = parseInt(numberMatch[1], 10);
            // Validate that it's a reasonable grade (1-12)
            if (grade >= 1 && grade <= 12) {
                return numberMatch[1];
            }
        }

        console.warn(`Could not extract grade from classroom name: "${classroomName}"`);
        return null;
    }


    /**
 * Update institution nomination document with class-based counting
 */
    async updateInstitutionNomination(
        contestId: string,
        institutionId: string,
        institutionName: string,
        newStudents: { [docId: string]: any },
        classroomInfo: any
    ): Promise<void> {
        try {
            // console.log('🔍 Starting institution nomination update:', {
            //     contestId,
            //     institutionId,
            //     institutionName,
            //     newStudentsCount: Object.keys(newStudents).length,
            //     classroomInfo: classroomInfo
            // });

            // Extract grade using enhanced method first
            const gradeFromClassroom = this.extractGradeFromClassroom(classroomInfo);

            if (!gradeFromClassroom) {
                console.warn(`⚠️ Could not extract grade from classroom:`, classroomInfo);
                return;
            }

            // console.log('🎓 Extracted grade:', gradeFromClassroom);

            // Count new students for this grade
            const newStudentCount = Object.keys(newStudents).length;
            // console.log('👥 New student count:', newStudentCount);

            // Get current institution document
            let institutionData: any = {};
            let documentExists = false;

            const institutionCollection = `Contest_${contestId}/--InstitutionNomination--/Institutions`;
            const institutionDocRef = this.afs.collection(institutionCollection).doc(institutionId);

            try {
                const currentDoc = await firstValueFrom(institutionDocRef.get());
                if (currentDoc.exists) {
                    institutionData = currentDoc.data() || {};
                    documentExists = true;
                    // console.log('📄 Existing institution data:', institutionData);
                }
            } catch (error) {
                if (error?.code !== 'not-found') {
                    throw error;
                }
                // console.log('📄 No existing institution document found, will create new one');
            }

            // Create or ensure proper document structure
            if (!documentExists) {
                // console.log('🆕 Creating new institution document with complete structure');

                // Initialize nominationsByClasses with all grades (1-10) set to 0
                const initialNominationsByClasses = {};
                for (let grade = 1; grade <= 10; grade++) {
                    initialNominationsByClasses[grade.toString()] = 0;
                }

                institutionData = {
                    docId: institutionId,
                    institutionId: institutionId,
                    institutionName: institutionName,
                    createdAt: Timestamp.now(),
                    nominationsByClasses: initialNominationsByClasses
                };

                // console.log('🆕 Initialized new institution data:', institutionData);
            } else {
                // Ensure existing document has proper structure
                if (!institutionData.nominationsByClasses) {
                    // console.log('📝 Adding missing nominationsByClasses to existing document');
                    institutionData.nominationsByClasses = {};
                    // Initialize all grades 1-10 to 0 for existing documents that don't have this structure
                    for (let grade = 1; grade <= 10; grade++) {
                        institutionData.nominationsByClasses[grade.toString()] = 0;
                    }
                }
            }

            // Update class count using grade as key
            const gradeKey = gradeFromClassroom;
            const currentGradeCount = institutionData.nominationsByClasses[gradeKey] || 0;
            institutionData.nominationsByClasses[gradeKey] = currentGradeCount + newStudentCount;

            // Update timestamp
            institutionData.updatedAt = Timestamp.now();

            // console.log('💾 Final institution data to save:', JSON.stringify(institutionData, null, 2));

            // Create/Update the document
            if (!documentExists) {
                // Use set() to create a new document
                await institutionDocRef.set(institutionData);
                // console.log('📄 Created new institution document');
            } else {
                // Use set with merge for existing documents
                await institutionDocRef.set(institutionData, { merge: true });
                // console.log('📄 Updated existing institution document');
            }

            // console.log(`✅ Successfully updated institution ${institutionId} - Grade ${gradeFromClassroom}: +${newStudentCount} students`);

        } catch (error) {
            console.error(`❌ Error updating institution nomination for ${institutionId}:`, error);
            console.error('❌ Error details:', error.message);
            throw error;
        }
    }

    /**
     * Process multiple contests for institution nomination updates
     */
    async processMultipleContestNominations(
        selectedContests: any[],
        newStudents: { [docId: string]: any },
        classroomInfo: any,
        institutionInfo: any
    ): Promise<void> {
        // console.log('🏆 Processing institution nominations for multiple contests:', selectedContests.length);

        for (const contest of selectedContests) {
            const contestId = contest.docId;

            try {
                // Update institution nomination
                await this.updateInstitutionNomination(
                    contestId,
                    institutionInfo.institutionId,
                    institutionInfo.institutionData?.institutionName,
                    newStudents,
                    classroomInfo
                );

                // console.log(`✅ Processed institution nomination for contest: ${contest.contestTitle}`);

            } catch (error) {
                console.error(`❌ Error processing institution nomination for contest ${contestId}:`, error);
            }
        }
    }

    /**
     * Process single contest for institution nomination update
     */
    async processSingleContestNomination(
        contest: any,
        newStudents: { [docId: string]: any },
        classroomInfo: any,
        institutionInfo: any
    ): Promise<void> {
        const contestId = contest.docId;

        try {
            // Update institution nomination
            await this.updateInstitutionNomination(
                contestId,
                institutionInfo.institutionId,
                institutionInfo.institutionData?.institutionName,
                newStudents,
                classroomInfo
            );

            // console.log(`✅ Processed institution nomination for contest: ${contest.contestTitle}`);

        } catch (error) {
            console.error(`❌ Error processing institution nomination for contest ${contestId}:`, error);
            throw error;
        }
    }


    /**
     * Update institution nomination document with support for both grade-based classrooms and STEM clubs
     */
    async updateInstitutionNominationWithStemClub(
        contestId: string,
        institutionId: string,
        institutionName: string,
        newStudents: { [docId: string]: any },
        classroomInfo: any
    ): Promise<void> {
        try {
            // console.log('🔄 Updating institution nomination with STEM club support...');

            // Get current institution document
            const docRef = this.afs.doc(`Contest_${contestId}/--InstitutionNomination--/Institutions/${institutionId}`);
            const docSnapshot = await docRef.get().toPromise();

            let institutionData: any = {};

            if (docSnapshot.exists) {
                institutionData = docSnapshot.data() || {};
            } else {
                // Initialize new institution document
                institutionData = {
                    docId: institutionId,
                    institutionId: institutionId,
                    institutionName: institutionName,
                    createdAt: Timestamp.now(),
                    // totalStudents: 0,
                    nominationsByClasses: {}
                };
            }

            // Determine the class/club identifier
            let classIdentifier: string;

            if (classroomInfo.type === 'STEM-CLUB') {
                // For STEM clubs, use the full stem club name
                classIdentifier = classroomInfo.stemClubName || 'Unknown STEM Club';
            } else {
                // For regular classrooms, extract grade and use it
                const gradeFromClassroom = this.extractGradeFromClassroom(classroomInfo);

                if (gradeFromClassroom) {
                    classIdentifier = `${gradeFromClassroom}`;
                } else {
                    // Fallback to classroom name if grade extraction fails
                    classIdentifier = classroomInfo.classroomName || 'Unknown Class';
                }
            }

            // console.log(`📝 Using class identifier: "${classIdentifier}" for type: ${classroomInfo.type}`);

            // Count new students
            const newStudentCount = Object.keys(newStudents).length;

            // Initialize nominationsByClasses if not exists
            if (!institutionData.nominationsByClasses) {
                institutionData.nominationsByClasses = {};
            }

            // Update the specific class/club count
            const currentCount = institutionData.nominationsByClasses[classIdentifier] || 0;
            institutionData.nominationsByClasses[classIdentifier] = currentCount + newStudentCount;

            // Update total student count
            const currentTotalCount = institutionData.totalStudents || 0;
            // institutionData.totalStudents = currentTotalCount + newStudentCount;

            // Update timestamp
            institutionData.updatedAt = Timestamp.now();

            // Save the document
            await docRef.set(institutionData, { merge: true });

            // console.log(`✅ Updated institution ${institutionId} - ${classIdentifier}: +${newStudentCount} students`);
            // console.log('📊 Current nominationsByClasses:', institutionData.nominationsByClasses);

        } catch (error) {
            console.error(`❌ Error updating institution nomination for ${institutionId}:`, error);
            throw error;
        }
    }

    /**
     * Enhanced method to handle both classroom types and STEM clubs
     */
    private getClassIdentifierFromClassroomInfo(classroomInfo: any): string {
        if (!classroomInfo) {
            return 'Unknown';
        }

        // Check if it's a STEM club
        if (classroomInfo.type === 'STEM-CLUB') {
            return classroomInfo.stemClubName || 'Unknown STEM Club';
        }

        // For regular classrooms, try to extract grade
        const gradeFromClassroom = this.extractGradeFromClassroom(classroomInfo);

        if (gradeFromClassroom) {
            return `${gradeFromClassroom}`;
        }

        // Fallback to classroom name
        return classroomInfo.classroomName || 'Unknown Class';
    }

    /**
     * Process multiple contests for institution nomination updates (with STEM club support)
     */
    async processMultipleContestNominationsWithStemClub(
        selectedContests: any[],
        newStudents: { [docId: string]: any },
        classroomInfo: any,
        institutionInfo: any
    ): Promise<void> {
        // console.log('🔄 Processing institution nominations for multiple contests with STEM club support...');

        for (const contest of selectedContests) {
            const contestId = contest.docId;

            try {
                await this.updateInstitutionNominationWithStemClub(
                    contestId,
                    institutionInfo.institutionId,
                    institutionInfo.institutionName || institutionInfo.institutionData?.institutionName,
                    newStudents,
                    classroomInfo
                );

                // console.log(`✅ Processed institution nomination for contest: ${contest.contestTitle}`);

            } catch (error) {
                console.error(`❌ Error processing institution nomination for contest ${contestId}:`, error);
            }
        }
    }

    /**
     * Process single contest for institution nomination update (with STEM club support)
     */
    async processSingleContestNominationWithStemClub(
        contest: any,
        newStudents: { [docId: string]: any },
        classroomInfo: any,
        institutionInfo: any
    ): Promise<void> {
        const contestId = contest.docId;

        try {
            await this.updateInstitutionNominationWithStemClub(
                contestId,
                institutionInfo.institutionId,
                institutionInfo.institutionName || institutionInfo.institutionData?.institutionName,
                newStudents,
                classroomInfo
            );

            // console.log(`✅ Processed institution nomination for contest: ${contest.contestTitle}`);

        } catch (error) {
            console.error(`❌ Error processing institution nomination for contest ${contestId}:`, error);
            throw error;
        }
    }



    private collectionPath(contestId: string): string {
        return `Contest_${contestId}`;
    }

     async ensureScaffold(contestId: string): Promise<void> {
    const col = this.afs.collection(this.collectionPath(contestId));
    const snap = await col.ref.limit(1).get();
    if (!snap.empty) return;

    await Promise.all([
      col.doc('--InstitutionNomination--').set({}),
      col.doc('--TeacherAndLinkedInstitute--').set({}),
      col.doc('-Config-').set({}),
    ]);
  }


}
