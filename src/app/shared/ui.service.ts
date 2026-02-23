import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
@Injectable({
  providedIn: 'root'
})
export class UiService {

  constructor(private snackbar: MatSnackBar) { }

  snackbarSubject = new Subject();

  alertMessage(title: string, msg: string, type: 'error' | 'success' | 'primary' | 'accent' | 'warn' | 'basic' | 'info' | 'warning') {
    const snackObj = { 'title': title, 'message': msg, 'type': type };
    this.snackbarSubject.next(snackObj);
  }

  showSnackbar(message, action, duration) {
    this.snackbar.open(message, action, {
      duration,
      verticalPosition: 'bottom',
      horizontalPosition: 'center'
      // MatSnackBarVerticalPosition = 'top' | 'bottom';
    });
  }
}
