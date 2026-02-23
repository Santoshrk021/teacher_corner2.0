import { ContestsModule } from './contests.module';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CreateContestDialogComponent } from './create-contest-dialog/create-contest-dialog.component';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ContestChallengeTypeDialogComponent } from './contest-challenge-type-dialog/contest-challenge-type-dialog.component';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { firstValueFrom, map } from 'rxjs';

@Component({
    selector: 'app-contests',
    templateUrl: './contests.component.html',
    styleUrls: ['./contests.component.scss'],
})
export class ContestsComponent implements OnInit {
    accessLevel: number | null = null;
    isLevel9 = true;
    constructor(public dialog: MatDialog, private afs: AngularFirestore, private afAuth: AngularFireAuth) { }

    async ngOnInit(): Promise<void> {
        try {
          const user = await this.afAuth.currentUser;
          if (!user) return;
    
          const uid = user.uid;
          const accessLevelRaw = await firstValueFrom(
            this.afs
              .collection('Users', ref => ref.where('uid', '==', uid))
              .get()
              .pipe(
                map(snapshot => {
                  if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    return userData['accessLevel'];
                  }
                  return null;
                })
              )
          );
    
          // Coerce to number
          this.accessLevel = accessLevelRaw != null ? Number(accessLevelRaw) : null;
          // Mark restricted for accessLevel = 10 or 11
          this.isLevel9 = !(this.accessLevel === 10 || this.accessLevel === 11);
        } catch (error) {
          console.error('Error in ngOnInit:', error);
          this.isLevel9 = true;
        }
      }
    addNewContest() {
        const dialogRef = this.dialog.open(CreateContestDialogComponent, {
            data: {
            }
        });
    }

    async createContest(type) {
        if (type == 'challenge') {
            await import('./contest-challenge-type-dialog/contest-challenge-type-dialog.module');
            this.dialog.open(ContestChallengeTypeDialogComponent, {
                data: {
                    isupdate:false
                }
            });
        }
        if (type == 'competition') {
            // await import('./contest-challenge-type-dialog/contest-challenge-type-dialog.module');
            // await this.dialog.open(ContestChallengeTypeDialogComponent, {
            //     data: {
            //     }
            // })
        }

    }
}
