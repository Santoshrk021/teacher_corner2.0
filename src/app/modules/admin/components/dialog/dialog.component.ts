import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
})
export class DialogComponent implements OnInit {
  delete: boolean = false;
  restore: boolean = false;
  emptyTrash: boolean = false;
  deletePermenently: boolean = false;
  constructor(private dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      delete: boolean;
      restore: boolean;
      emptyTrash: boolean;
      deletePermenently: boolean;
    }
  ) {
    if(data.delete){
      this.delete=true;
    }
    else if(data.restore){
      this.restore=true;
    }
    else if(data.emptyTrash){
      this.emptyTrash=true;
    }
    else if(data.deletePermenently){
      this.deletePermenently=true;
    }
  }

  ngOnInit(): void {
  }

  cancel(): void{
    this.dialogRef.close();
  }
  confirm(): void{
    this.dialogRef.close('confirmed');
  }
}
