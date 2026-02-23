import { Component, OnInit } from '@angular/core';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';

@Component({
  selector: 'app-filter-learning-unit-list',
  templateUrl: './filter-learning-unit-list.component.html',
  styleUrls: ['./filter-learning-unit-list.component.scss']
})
export class FilterLearningUnitListComponent implements OnInit {

  template: any;
  template1: any;
  template2: any;
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
    private programmeTemplateService: ProgrammeTemplateService,
  ) { }

  ngOnInit(): void {
  }

  getVersionTacDetails(version) {
    if (version === 'All-Versions') {
      this.programmeTemplateService.templates.next(this.template);
      return this.template;
    } else {
      let sortedtags = [];
      const difftac = [];
      const uniquetacs = [];
      if (this.selectedLang) {
        this.template2 = this.template.filter(item =>
          item.isoCode == this.selectedLang
        );
      } else {
      }
      for (const item of this.template) {
        if (!uniquetacs.includes(item.version)) {
          uniquetacs.push(item.version);
        }
      }
      uniquetacs.map((tag) => {
        this.template2.filter((item) => {
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
      this.template = sortedtags;
      this.programmeTemplateService.templates.next(this.template);
      return this.template;
    }
  }

  getLangCode(langCode: any) {
    this.selectedLang = langCode;
    this.template = this.template1.filter((tac: any) => {
      if (tac.version) {
        const lang = tac.version.split('-');
        if (lang[0] === langCode) {
          return tac;
        }
      }
    });
    this.programmeTemplateService.templates.next(this.template);
  }

  filteractivity(ev: any) {
    const val = ev.target.value;
    if (val && val.trim() != '') {
      this.template = this.template.filter(item => ((item.learningUnitName.toLowerCase().indexOf(val.toLowerCase()) > -1)) ||
          ((item.isoCode.toLowerCase().indexOf(val.toLowerCase()) > -1)));
    } else {
      this.programmeTemplateService.disname.subscribe((arr) => {
        this.template = arr.tacNames;
      });
    }
    this.programmeTemplateService.templates.next(this.template);
  }


}
