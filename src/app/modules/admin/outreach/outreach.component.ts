import { Component, OnInit, Type } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddOutreachComponent } from './add-outreach/add-outreach.component';

@Component({
  selector: 'app-outreach',
  templateUrl: './outreach.component.html',
  styleUrls: ['./outreach.component.scss']
})
export class OutreachComponent implements OnInit {

  drawerOpened = false;
  show = false;
  component: Type<any>;

  constructor(private dialog: MatDialog) { }

  ngOnInit(): void { }

  addDialog(): void {
    this.dialog.open(AddOutreachComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true
    });
  }

  export(): void {
    const ev = new CustomEvent('outreach-export');
    window.dispatchEvent(ev);
  }

  trashDialog(): void {
    import('./outreach-trash/outreach-trash.component').then(({ OutreachTrashComponent }) => {
      this.component = OutreachTrashComponent;
      this.show = true;
      this.drawerOpened = true;
    });
  }

  closeDrawer(): void {
    this.drawerOpened = false;
    setTimeout(() => {
      this.show = false;
      this.component = null;
    }, 300);
  }
}
