import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, NgModule, OnInit, ViewChild } from '@angular/core';
import { YouTubePlayerModule } from '@angular/youtube-player';

@Component({
    selector: 'app-youtube',
    // [startSeconds] = "40"    [endSeconds] = "8"
    template: `
    <div #youTubePlayer class="p-2" #divId>
        <youtube-player [videoId]="youtubeId" suggestedQuality="highres" [height]= "videoHeight"[width] = "videoWidth" >
        </youtube-player>
    </div>
    `,
})

export class YoutubeComponent implements OnInit {
    @HostListener('window:resize', ['$event'])

    @Input() youtubeId: string;
    @ViewChild('youTubePlayer') youTubePlayer: ElementRef<HTMLDivElement>;
    videoHeight: number | undefined;
    videoWidth: number | undefined;


    constructor(private changeDetectorRef: ChangeDetectorRef) { }

    ngAfterViewInit(): void {

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
    }

    ngOnInit(): void {
        this.loadYoutubeScript();
        // this.onResize();
        // window.addEventListener('resize', this.onResize.bind(this));
    }
    loadYoutubeScript() {
        // This code loads the IFrame Player API code asynchronously, according to the instructions at
        // https://developers.google.com/youtube/iframe_api_reference#Getting_Started
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
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
    declarations: [YoutubeComponent],
    imports: [
        CommonModule,
        YouTubePlayerModule,
    ],
    exports: [YoutubeComponent],
})
export class YoutubeModule { }
