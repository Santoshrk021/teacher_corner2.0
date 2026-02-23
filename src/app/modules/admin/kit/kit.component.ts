import { Component, OnInit, Type } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { KitService } from './kit.service';
import { AddKitComponent } from './add-kit/add-kit.component';
import { RemoteConnectComponent } from '../remote-connect/remote-connect.component';

@Component({
  selector: 'app-kit',
  templateUrl: './kit.component.html',
  styleUrls: ['./kit.component.scss']
})
export class KitComponent implements OnInit {

  drawerOpened = false;
  show = false;
  component: Type<any>;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private kitService: KitService
  ) { }

  ngOnInit(): void {
  }

  addDialog(): void {
    this.dialog.open(AddKitComponent ,{
      width: 'full',
      height: 'full'
    })
  }

  addBatchDialog() {
    this.dialog.open(RemoteConnectComponent ,{
      width: 'full',
      height: 'full'
    })
  }

  trashDialog(): void {
    import('./kit-trash/kit-trash.component').then(({ KitTrashComponent }) => {
      this.component = KitTrashComponent;
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
