import { Component, Input, OnInit } from '@angular/core';


@Component({
  selector: 'app-resources-tabs',
  templateUrl: './resources-tabs.component.html',
  styleUrls: ['./resources-tabs.component.scss']
})
export class ResourcesTabsComponent implements OnInit {
  @Input() workflow;
  constructor() { }
  ngOnInit(): void {
    // console.log(this.workflow);
  }


}
