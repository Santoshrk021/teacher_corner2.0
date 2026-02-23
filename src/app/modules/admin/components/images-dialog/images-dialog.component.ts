import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-images-dialog',
  templateUrl: './images-dialog.component.html'
})
export class ImagesDialogComponent implements OnInit {
  // Add input parameter to control close button visibility
  @Input() showCloseButton: boolean = true;
  @Input() componentDetails: any;

  // images = [
  //   '../../../assets/imageslist/can.jpeg',
  //   '../../../assets/imageslist/cardboard.jpeg',
  //   '../../../assets/imageslist/sheet.jpeg'
  //   // Add more images as needed
  // ];

  images = [
  'assets/imageslist/can.jpeg',
  'assets/imageslist/cardboard.jpeg',
  'assets/imageslist/sheet.jpeg'
];

  currentIndex = 0;

  constructor(private dialog: MatDialog) { }

  ngOnInit(): void {

  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prev(): void {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  // Helper method to create an array of indices for the images
  getIndices(): number[] {
    return Array.from({ length: this.images.length }, (_, i) => i);
  }

  close(): void {
    this.dialog.closeAll();
  }
}
