import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from 'environments/environment';
import { AppModule } from 'app/app.module';

if (environment.production) {
    enableProdMode();
    window.console.log = function() { };
}

const link = document.getElementById('image-favicon') as HTMLLinkElement;
const splashScreen = document.getElementById('image-splash-screen') as HTMLDivElement;
link.href = environment.splashScreenLogos.titlebarLogo;
const divElement = document.createElement('div');
divElement.innerHTML = environment.splashScreenLogos.splashLogo;
splashScreen.appendChild(divElement);

platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.error(err));
