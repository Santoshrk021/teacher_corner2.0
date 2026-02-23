import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ConfigurationsFirestore } from './configuration.firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, take, map, Observable, of, catchError, shareReplay, first, lastValueFrom } from 'rxjs';
import { TeacherService } from '../teachers/teachers.service';
import { UserService } from '../user/user.service';
import { FormGroup } from '@angular/forms';

export interface MasterManagerCollection {
  type: string;   // Firestore collection name (Normal)
  field: string;  // Field name inside the Master shard map
  master: string; // Master type (e.g., INSTITUTE / CLASSROOM / PROGRAMME / LEARNINGUNIT)
}

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  // 🔒 Cached streams (NOT DI tokens)
  private masterManagerCollections$?: Observable<MasterManagerCollection[]>;
  private masterManagerMappingsCache$?: Observable<Record<string, any>>;

  // Existing subjects
  public boardListSub = new BehaviorSubject<any>(null);
  public chainSub = new BehaviorSubject<any>(null);
  public subjectsSub = new BehaviorSubject<any>(null);
  public languageListSub = new BehaviorSubject<any>(null);
  public institutionTypesListSub = new BehaviorSubject<any>(null);
  public defaultsProgrammes = new BehaviorSubject<any>(null);
  public boardConfigforFilenames = new BehaviorSubject<any>(null);

  constructor(
    private configureFirestore: ConfigurationsFirestore,
    public afAuth: AngularFireAuth,
    private userService: UserService,
    private afs: AngularFirestore,
    private teacherService: TeacherService
  ) {}

  /* ===========================
   *   Master Manager (new)
   * =========================== */

  /** Collections list from Configuration/masterManager (field: collections[]) */
  public getMasterManagerCollections$(): Observable<MasterManagerCollection[]> {
    if (!this.masterManagerCollections$) {
      this.masterManagerCollections$ = this.configureFirestore
        .doc$('masterManager') // reads Configuration/masterManager
        .pipe(
          map((doc: any) =>
            Array.isArray(doc?.collections)
              ? (doc.collections as MasterManagerCollection[])
              : []
          ),
          catchError(err => {
            console.error('Failed to load Configuration/masterManager', err);
            return of<MasterManagerCollection[]>([]);
          }),
          shareReplay(1)
        );
    }
    return this.masterManagerCollections$;
  }

  /** Field mappings from Configuration/masterManagerMappings (free-form JSON) */
  public getMasterManagerMappings$(): Observable<Record<string, any>> {
    if (!this.masterManagerMappingsCache$) {
      this.masterManagerMappingsCache$ = this.configureFirestore
        .doc$('masterManagerMappings') // reads Configuration/masterManagerMappings
        .pipe(
          map((doc: any) => (doc && typeof doc === 'object' ? doc : {})),
          catchError(err => {
            console.error('Failed to load Configuration/masterManagerMappings', err);
            return of<Record<string, any>>({});
          }),
          shareReplay(1)
        );
    }
    return this.masterManagerMappingsCache$;
  }

  /** Upsert one row into Configuration/masterManager.collections[] */
  public async addMasterManagerCollection(row: MasterManagerCollection): Promise<void> {
    const ref = this.afs.collection('Configuration').doc('masterManager').ref;

    const normalize = (x: MasterManagerCollection) => ({
      type: (x.type || '').trim(),
      field: (x.field || '').trim(),
      master: (x.master || '').trim().toUpperCase(),
    });
    const keyOf = (x: MasterManagerCollection) =>
      `${(x.type || '').trim()}|${(x.master || '').trim().toUpperCase()}|${(x.field || '').trim()}`;

    await this.afs.firestore.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const existing: MasterManagerCollection[] =
        (snap.exists && Array.isArray((snap.data() as any)?.collections))
          ? (snap.data() as any).collections
          : [];

      const mapUniq = new Map<string, MasterManagerCollection>();
      for (const it of existing) mapUniq.set(keyOf(it), normalize(it));
      mapUniq.set(keyOf(row), normalize(row)); // upsert

      tx.set(ref, { collections: Array.from(mapUniq.values()) }, { merge: true });
    });
  }

  /* ===========================
   *   Your existing methods
   * =========================== */

  async getProgrammeByBGS(grade: any) {
    const defaultProg = await this.configureFirestore.getDocDataByDocId('programmes');
    const programme = defaultProg['defaults']['defaultProgramme']?.[`${grade}-Science`];
    return programme;
  }

  getAllConfigure() {
    this.getBoardList('BoardListAll');
    this.getLanguageList('Languages');
    this.getInstituteTypesList('InstitutionTypes');
  }

  getInstitutesChainInfo() {
    return this.configureFirestore.doc$('InstitutionChains').pipe(take(1)).subscribe((d) => {
      this.chainSub.next(d.chainsInfo);
    });
  }

  setInstitutesChainInfo(value: any) {
    return this.configureFirestore.update(value, 'InstitutionChains');
  }

  getConfigBoardsForFilenames() {
    return this.configureFirestore.doc$('BoardConfigForFilenames').pipe(take(1)).subscribe((d) => {
      this.boardConfigforFilenames.next(d.boards);
    });
  }

  getBoardList(id: string) {
    return this.configureFirestore.doc$(id).pipe(take(1)).subscribe((d) => {
      this.boardListSub.next(d.boards);
    });
  }

  getLanguageList(id: string) {
    return this.configureFirestore.doc$(id).pipe(take(1)).subscribe((d) => {
      this.languageListSub.next(d.langTypes);
    });
  }

  getInstituteTypesList(id: string) {
    return this.configureFirestore.doc$(id).pipe(take(1)).subscribe((d) => {
      this.institutionTypesListSub.next(d.InstitutionTypes);
    });
  }

  async getLanguageListForProgrammes() {
    return this.afs.doc('Configuration/Languages').get().toPromise().then((d: any) => d.data().langTypes);
  }

  getSubjects() {
    return this.configureFirestore.doc$('subjects').pipe(take(1)).subscribe((d) => {
      this.subjectsSub.next(d.subjectsNames);
    });
  }

  getDoc(id: string) {
    return this.configureFirestore.doc$(id).pipe(take(1)).subscribe(d => this.subjectsSub.next(d));
  }

  async storedTeacherInfo() {
    const a = (await this.userService.get()).toPromise();
    const usrInfo = await a || {};
    this.userService.storedUserInfo.next(usrInfo.currentTeacherInfo);
    this.teacherService.getWithId(usrInfo.docId).pipe(take(1)).subscribe(() => {});
  }

  getTactivitysiteResources() {
    return this.configureFirestore.getDocDataByDocId('tactivityResourcesConfig');
  }

  async getEmailUpdateTemplate() {
    return await this.configureFirestore.getDocDataByDocId('email_otp_for_profile_update_teachersCorner');
  }

  AddNotifications(templateChnage: any, emailTemplate: any, email: string) {
    this.afs.collection('EmailNotifications').add({
      message: {
        html: templateChnage,
        subject: emailTemplate['subject'],
      },
      to: email,
    }).catch((err) => console.error(err));
  }

  getRYSICategories() {
    return this.configureFirestore.doc$('RYSI_Categories');
  }

  getCounters() {
    return this.configureFirestore.doc$('Counters');
  }

  incrementProgrammeCodeCounter(programeCodeLatestValue: any) {
    const value = { programmeCode: programeCodeLatestValue };
    return this.configureFirestore.update(value, 'Counters');
  }

  getProgrammes() {
    return this.configureFirestore.doc$('programmes');
  }

  getProgrammesWithWorkflow() {
    return this.configureFirestore.doc$('programmes_with_default_workflow');
  }

  getClassrooms() {
    return this.configureFirestore.doc$('classrooms');
  }

  getRandomDocId() {
    return this.afs.createId();
  }

  getTeacherCornerConfigurations() {
    return this.configureFirestore.doc$('teacher_corner_configurations');
  }

  getCountryCodesList() {
    return this.configureFirestore.doc$('CountryCodes');
  }

  getInternationalBoardList() {
    return this.configureFirestore.doc$('BoardListAll');
  }

  updateInternationalBoardList(updatedBoard: any) {
    this.configureFirestore.update(updatedBoard, 'BoardListAll');
  }

  createAcronym(objectName: string) {
    let boardName: any;
    let boardLocation: any;
    let location: any;
    if (objectName.includes(',')) {
      boardName = objectName.split(',')[0].split(/\s/);
      boardLocation = objectName.split(',')[1].trim().split(/\s/);
      location = boardLocation.length > 1 ? boardLocation.map((w: string) => w[0].toUpperCase()) : boardLocation[0].toUpperCase();
    } else {
      boardName = objectName.split(/\s/);
    }
    const allFirstCaps = boardName.map((word: string) => word[0].toUpperCase());
    const acronym = allFirstCaps.concat(location).join('');
    return acronym;
  }

  addNewBoardToConfig(isAddNewBoard: boolean, board: string, boardData: any, countryBoard: Array<any>, country: string) {
    if (isAddNewBoard) {
      const newBoard = { code: this.createAcronym(board), name: board };
      const boardDoc = boardData;
      const updatedCountryBoard = countryBoard.concat(newBoard);
      boardDoc.boardsInternational[country.toLowerCase()] = updatedCountryBoard;
      this.updateInternationalBoardList(boardDoc);
    }
  }

  getCountryNameFromCode(countryCode: string) {
    return this.configureFirestore.doc$('CountryCodes')
      .pipe(
        map((res: any) => {
          const index = Object.values(res?.countryCodes).map((item: any) => item?.phone).indexOf(countryCode);
          return Object.keys(res?.countryCodes)[index];
        })
      );
  }

  getCountryCodeFromPhone(phone: string) {
    const phoneWithoutCode = phone?.slice(-10);
    return phone.split(phoneWithoutCode)[0];
  }

  async getInternationalBoards(currentUser: any, formName: FormGroup, isLoaded: boolean, parentData?: any) {
    const configCodes = this.getCountryCodesList().pipe(first());
    const countryCodeList = await lastValueFrom(configCodes);
    const countryCodes = countryCodeList?.countryCodes;

    let countryCode: string;
    if (parentData && parentData?.parent !== 'institutions-list') {
      countryCode = countryCodes?.[parentData?.country]?.phone;
    } else {
      countryCode = currentUser?.countryCode;
    }

    if (!countryCode) {
      const firstKey = Object.keys(countryCodes ?? {})[0];
      const firstPhone = firstKey ? countryCodes?.[firstKey]?.phone : undefined;
      countryCode = firstPhone;
    }

    const configBoards = this.getInternationalBoardList().pipe(first());
    const boardData = await lastValueFrom(configBoards);

    let countryName: string;
    if (parentData && parentData?.country) {
      countryName = parentData?.country?.includes(' ')
        ? parentData?.country?.toLowerCase()?.replace(/\s/g, '-')
        : parentData?.country?.toLowerCase();
    } else {
      if (countryCode) {
        const fromCountryCode = this.getCountryNameFromCode(countryCode).pipe(first());
        countryName = await lastValueFrom(fromCountryCode);
      } else {
        const firstKey = Object.keys(countryCodes ?? {})[0];
        countryName = firstKey
          ? (firstKey.includes(' ')
              ? firstKey.toLowerCase().replace(/\s/g, '-')
              : firstKey.toLowerCase())
          : '';
      }
    }

    if (parentData?.parent && parentData?.parent !== 'institutions-list') {
      if (formName.contains('institutionAddress')) {
        formName?.get('institutionAddress.country')?.setValue(parentData?.country);
      } else if (formName.contains('country')) {
        formName.get('country')?.setValue(parentData?.country);
      }
    } else {
      if ((formName as any)?.controls?.hasOwnProperty('institutionAddress')) {
        formName?.get('institutionAddress.country')?.setValue(countryName);
      } else {
        formName?.get('country')?.setValue(countryName);
      }
    }

    isLoaded = true;
    return { countryCode, countryCodes, boardData, countryName, isLoaded };
  }

  async saveNewBoard(infoForm: FormGroup, isAddNewBoard: boolean, boardData: any, countryBoard: any, teacherCountry: string) {
    const boardValue = infoForm.get('board')!.value.toString();
    this.addNewBoardToConfig(isAddNewBoard, boardValue, boardData, countryBoard, teacherCountry);

    const configBoards = this.getInternationalBoardList().pipe(first());
    const boards = await lastValueFrom(configBoards);
    const internationalBoards = boards?.boardsInternational;
    countryBoard = internationalBoards?.[teacherCountry.toLowerCase()];

    isAddNewBoard = false;
    infoForm.patchValue({ board: this.createAcronym(boardValue) });
    return { boards, countryBoard, isAddNewBoard };
  }

  async saveNewSubject(infoForm: FormGroup, isAddNewSubject: boolean, subjectList: Array<any>) {
    const subjectValue = infoForm.get('subject')!.value.toString();
    const updatedSubjectList = await this.addNewDataToTemplateConfig(isAddNewSubject, subjectList, subjectValue, 'subjectList');
    isAddNewSubject = false;
    infoForm.get('subject')!.patchValue(subjectValue);
    return { updatedSubjectList, isAddNewSubject };
  }

  async saveNewTemplateCategory(infoForm: FormGroup, isAddNewCategory: boolean, templateCategoryList: Array<any>) {
    const templateValue = infoForm.get('templateCategory')!.value.toString();
    const updatedCategoryList = await this.addNewDataToTemplateConfig(isAddNewCategory, templateCategoryList, templateValue, 'templateList');
    isAddNewCategory = false;
    infoForm.get('templateCategory')!.patchValue(templateValue);
    return { updatedCategoryList, isAddNewCategory };
  }

  addNewDataToTemplateConfig(isAddNewData: boolean, dataList: Array<any>, newData: any, listName: string) {
    if (isAddNewData) {
      const updatedData = [...dataList, newData];
      this.updateProgrammeTemplateObject(listName, updatedData);
      return updatedData;
    }
  }

  getMaxOtpAttempts() {
    return this.configureFirestore.getDocDataByDocId('otpAttemptsByusers');
  }

  getDescriptionSizelimit() {
    return this.configureFirestore.doc$('LUDescriptionwordlimit');
  }

  getLearningUnitTypes() {
    return this.configureFirestore.doc$('LearningUnitTypes');
  }

  addLUtype(value: any) {
    this.configureFirestore.update(value, 'LearningUnitTypes');
  }

  getTypeOfInstitutionsByGet() {
    return this.configureFirestore.getWithGet('InstitutionTypes');
  }

  getProgrammeTemplateObject() {
    return this.configureFirestore.doc$('programme_template_object');
  }

  updateProgrammeTemplateObject(listName: string, updatedList: any) {
    this.configureFirestore.update({ [listName]: updatedList }, 'programme_template_object');
  }

  getTeacherConfig() {
    return this.configureFirestore.doc$('teacher_config');
  }

  getDomainCodesToInclude() {
    return this.configureFirestore.doc$('subjects').pipe(map((d: any) => d.domainCodesToInclude));
  }

  getInstitutionCounter() {
    return this.configureFirestore.getWithGet('Counters').pipe(map((d: any) => parseInt(d.get('institutionCounter'))));
  }

  incrementInstitutionCounter(institutionCounter: number | string) {
    this.configureFirestore.updateSingleField('institutionCounter', institutionCounter.toString(), 'Counters');
  }

  getlearningunitSubjecttypes() {
    return this.configureFirestore.doc$('subjectTypes');
  }

  getSubjectDomainstypes() {
    return this.configureFirestore.doc$('learningUnitDomains');
  }

  getLearningUnitAndResourceKeyMap() {
    return this.configureFirestore.getDocDataByDocId('learningUnitAndResourceKeyMap');
  }

  getResourceNamesPromise() {
    return this.configureFirestore.getDocDataByDocId('resourceNames');
  }

  getFormValidation(): Observable<any> {
    return this.afs.collection('Configuration').doc('formValidations').get();
  }

  getLearningUnitMaturity() {
    return this.configureFirestore.doc$('learningUnitMaturity');
  }

  getConfigurationDocumentOnce(documentId: string) {
    return this.configureFirestore.getWithGet(documentId);
  }

  getMaturity() {
    return this.configureFirestore.doc$('Maturity');
  }

  getAssignmentTypes() {
    return this.configureFirestore.doc$('AssignmentTypes');
  }

  getWorkflowTypes() {
    return this.configureFirestore.doc$('WorkflowTypes');
  }

  // Stream rubric definitions from Configuration/submissionEvaluations
  getSubmissionEvaluations$() {
    return this.configureFirestore.doc$('submissionEvaluations');
  }
}
