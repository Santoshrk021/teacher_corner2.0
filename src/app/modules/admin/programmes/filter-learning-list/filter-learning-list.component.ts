import { Component, Input, OnInit } from '@angular/core';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';

@Component({
  selector: 'app-filter-learning-list',
  templateUrl: './filter-learning-list.component.html',
  styleUrls: ['./filter-learning-list.component.scss']
})
export class FilterLearningListComponent implements OnInit {
  act: any;
  act1: any;
  act2: any;
  selectedLang: any = '';
  versionArr: any[] = ['Latest-Version', 'All-Versions'];
  langArr: { code: string; name: string }[] = [
    {
      code: 'EN',
      name: 'English'
    },
    {
      code: 'KN',
      name: 'Bangla'
    },
    {
      code: 'HI',
      name: 'Kannada'
    },
    {
      code: 'TN1',
      name: 'Tamil'
    },
    {
      code: 'MN1',
      name: 'Malayalam'
    },
  ];

  constructor(
    private programmeService: ProgrammeService,
  ) { }

  ngOnInit(): void {
  }

  getAct() {

  }

  getVersionTacDetails(version) {
    if (version === 'All-Versions') {
      this.programmeService.activities.next(this.act);
      return this.act;
    } else {
      let sortedtags = [];
      const difftac = [];
      const uniquetacs = [];
      if (this.selectedLang) {
        this.act2 = this.act.filter(item =>
          item.isoCode == this.selectedLang
        );
      } else {
      }
      for (const item of this.act) {
        if (!uniquetacs.includes(item.version)) {
          uniquetacs.push(item.version);
        }
      }
      uniquetacs.map((tag) => {
        this.act2.filter((item) => {
          if (item.version == tag) {
            difftac.push(item);
          }
        });
      });
      sortedtags = difftac.sort((a, b) => {
        if (a.version.split('-V')[1] > b.version.split('-V')[1]) {
          return -1;
        }
        if (a.version.split('-V')[1] < b.version.split('-V')[1]) {
          return 1;
        }
        return 0;
      });
      this.act = sortedtags;
      this.programmeService.activities.next(this.act);
      return this.act;
    }
  }

  getLangCode(langCode: any) {
    this.selectedLang = langCode;
    this.act = this.act1.filter((tac: any) => {
      if (tac.version) {
        const lang = tac.version.split('-');
        if (lang[0] === langCode) {
          return tac;
        }
      }
    });
    this.programmeService.activities.next(this.act);
  }

  filteractivity(ev: any) {
    const val = ev.target.value;
    if (val && val.trim() != '') {
      this.act = this.act.filter(item => ((item.learningUnitName.toLowerCase().indexOf(val.toLowerCase()) > -1)) ||
          ((item.isoCode.toLowerCase().indexOf(val.toLowerCase()) > -1)));
    } else {
      this.programmeService.disname.subscribe((arr) => {
        this.act = arr.tacNames;
      });
    }
    this.programmeService.activities.next(this.act);
  }

}
