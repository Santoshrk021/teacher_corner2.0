import { Component, Input, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-standard-quill-text-input-field',
  templateUrl: './standard-quill-text-input-field.component.html',
  styleUrls: ['./standard-quill-text-input-field.component.scss']
})
export class StandardQuillTextInputFieldComponent implements OnInit {
  @Input() formRelatedDetails: any;
  @Input() placeHolder: string;
  @Input() toolbarProperties: any;

  constructor() { }

  ngOnInit(): void {
    this.createCopyToClipboardButton(this.formRelatedDetails['index']);
  }

  createCopyToClipboardButton(index: number) {
    setTimeout(() => {
      const formControlValue = this.formRelatedDetails['formGroupName'].get(this.formRelatedDetails['formControlName']).value;
      const toolbar = document.querySelector(`#quillEditor-${index}`)?.firstElementChild;
      const customButtonHTML = `
      <button id="custom-button">
        <mat-icon>
          <svg id="document-duplicate" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
        </mat-icon>
      </button>`;
      const spanButton = document.createElement('span');
      spanButton.className = 'ql-formats';
      spanButton.innerHTML = customButtonHTML;
      /*
      spanButton.addEventListener('click', function () {
        navigator.clipboard.writeText(formControlValue).then(() => {
          console.info('Copied to clipboard:', formControlValue);
        }).catch(error => {
          console.error('Failed to copy:', error);
        });
      })
      */
      spanButton.addEventListener('click', copyToClipboard);
      toolbar?.appendChild(spanButton);

      function copyToClipboard() {
        navigator.clipboard.writeText(formControlValue).then(() => {
          console.info('Copied to clipboard:', formControlValue);
        }).catch((error) => {
          console.error('Failed to copy:', error);
        }).then(() => spanButton.removeEventListener('click', copyToClipboard));
      }
    }, 100);
  }


}
