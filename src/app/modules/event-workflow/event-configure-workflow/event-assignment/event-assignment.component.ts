import { FormControl } from '@angular/forms';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DownloadDirectiveDirective } from 'app/shared/directives/download-directive.directive';

@Component({
  selector: 'app-event-assignment',
  templateUrl: './event-assignment.component.html',
  providers: [DownloadDirectiveDirective],
  styleUrls: ['./event-assignment.component.scss']
})
export class EventAssignmentComponent implements OnInit, OnChanges {
  @Input() workflow;
  @Input() selectedStageSubm;
  @Input() workflowId;
  quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline',],        // toggled buttons
        [{ 'size': ['small', false, 'large'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, false] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
      ],
    }
  };
  constructor() { }
  ngOnInit(): void {

  }
  ngOnChanges(changes: SimpleChanges): void {
  }
}
