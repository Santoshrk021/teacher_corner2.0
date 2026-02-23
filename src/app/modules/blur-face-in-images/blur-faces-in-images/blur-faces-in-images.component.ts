import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { environment } from 'environments/environment.dev';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-blur-faces-in-images',
  templateUrl: './blur-faces-in-images.component.html',
  styleUrls: ['./blur-faces-in-images.component.scss']
})
export class BlurFacesInImagesComponent {
  uploading = false;
  blurredImageUrl: string | null = null;
  imageNames: string[] = [];
  selectedImage: string = ''; // Holds the selected image name
  // uploadError: string | null = null;
  storageFolder = 'contest_submissions/ITQ76ao8o8dKPbE2LpzB/7hf4p/q1eEp8ePk1rLV8F6o3ir/';
  imageUrlMap: { [key: string]: string } = {};
  isFetchingImages: boolean = false;
  imageSourceMap: { [key: string]: string; };




  constructor(private http: HttpClient,
    private afStore: AngularFireStorage,
  ) {}

  ngOnInit() {
    this.fetchImageNamesFromStorage();
    
  }

  async fetchAllImagesRecursively(basePath: string): Promise<{ name: string, url: string, path: string }[]> {
    const collectedImages: { name: string, url: string, path: string }[] = [];
  
    const traverseFolders = async (path: string) => {
      const ref = this.afStore.ref(path);
      const listResult = await firstValueFrom(ref.listAll());
  
      // Add image files
      for (const item of listResult.items) {
        if (item.name.match(/\.(jpeg|jpg|png)$/i)) {
          const url = await item.getDownloadURL();
          const nameWithoutExtension = item.name.replace(/\.(jpeg|jpg|png)$/i, '');
          collectedImages.push({ name: nameWithoutExtension, url, path: item.fullPath });
        }
      }
  
      // Recursively traverse subfolders
      for (const folder of listResult.prefixes) {
        await traverseFolders(folder.fullPath);
      }
    };
  
    await traverseFolders(basePath);
    return collectedImages;
  }
  
  async fetchImageNamesFromStorage() {
    this.isFetchingImages = true;
    const rootPath = 'contest_submissions/GyjEpoaQyToimu9PsSVA';
  
    try {
      const images = await this.fetchAllImagesRecursively(rootPath);
      
      this.imageNames = images.map(img => img.name);
      this.imageUrlMap = images.reduce((acc, img) => {
        acc[img.name] = img.url;
        return acc;
      }, {} as { [key: string]: string });
  
      this.imageSourceMap = images.reduce((acc, img) => {
        acc[img.name] = img.path;  // Store path info too
        return acc;
      }, {} as { [key: string]: string });
  
      console.log('Fetched images with paths:', images);
    } catch (error) {
      console.error('Error fetching image names recursively:', error);
    } finally {
      this.isFetchingImages = false;
    }
  }
  
    openPdfInNewTab() {
      if (this.blurredImageUrl) {
        window.open(this.blurredImageUrl, '_blank');
      }
    }

    sendImageUrlToCloudFunction() {
      this.uploading = true;
  
      // Replace this URL with your deployed Cloud Function endpoint:
      const functionUrl = 'http://127.0.0.1:5001/jigyasa-e3fbb/asia-south1/blurFacesFromJson';
  
      this.http.get(functionUrl).subscribe({
        next: (res: any) => {
          console.log('Cloud function triggered successfully:', res);
          this.uploading = false;
          // If your function returns a blurred image URL, you can save it here:
          // this.blurredImageUrl = res.blurredImageUrl;
        },
        error: (error) => {
          console.error('Error calling cloud function:', error);
          this.uploading = false;
        },
      });
    }
}  
