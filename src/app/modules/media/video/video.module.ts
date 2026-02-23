import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, NgModule, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import getVideoId from 'get-video-id';
import { YoutubeModule } from './youtube/youtube.module';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

@Component({
    selector: 'app-video',
    template: `
        <div [ngSwitch]="videoDetails?.service">
            <div *ngSwitchCase="'youtube'" >
                 <!-- class="flex justify-center" -->
                <app-youtube [youtubeId]="videoDetails?.id"></app-youtube>
            </div>
            <div *ngSwitchDefault >
                <!-- <p>Not a valid youtube url</p> -->
                <video [width]="videoWidth" [height]="videoHeight" controls>
                    <source [src]="!videoUrl.includes('http') ? (videoUrl | getDownloadURL) : videoUrl" [type]="'video/mp4'"/>
                </video>
            </div>
        </div>`,
})

export class VideoComponent implements OnInit, OnChanges {

    @Input() videoUrl: any;
    videoDetails: { id: string; service: 'youtube' | 'vimeo' | 'vine' | 'videopress' | 'microsoftstream' | 'tiktok' | 'dailymotion' };
    videoHeight: number | undefined;
    videoWidth: number | undefined;

    constructor(private changeDetectorRef: ChangeDetectorRef) {
    }

    ngOnInit(): void {
        // this.videoDetails = getVideoId(this.videoUrl);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.videoUrl) {
            this.videoDetails = getVideoId(this.videoUrl);
        }
        this.onResize();
    }

    onResize(): void {
        if (window.innerWidth > 600) {
            this.videoWidth = window.innerWidth / 2.5;
        }
        else{
            this.videoWidth = window.innerWidth;
        }
        // you can remove this line if you want to have wider video player than 1200px
        // this.videoWidth = Math.min(
        //     this.youTubePlayer.nativeElement.clientWidth,
        //     1200
        // );

        // so you keep the ratio
        this.videoHeight = this.videoWidth * 0.6;
        this.changeDetectorRef.detectChanges();
    }
}
@NgModule({
    declarations: [VideoComponent],
    imports: [
        CommonModule,
        YoutubeModule,
        AngularFireStorageModule,
    ],
    exports: [VideoComponent]
})
export class VideoModule { }




