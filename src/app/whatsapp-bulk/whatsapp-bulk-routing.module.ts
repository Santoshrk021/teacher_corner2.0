import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BulkComposerComponent } from './bulk-composer/bulk-composer.component';

const routes: Routes = [
  {
    path: '',
    component: BulkComposerComponent,
    data: { title: 'Send WhatsApp Messages', breadcrumb: 'WhatsApp Bulk Sender' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WhatsappBulkRoutingModule {}
