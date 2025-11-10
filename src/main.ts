import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import * as AOS from 'aos';
import 'aos/dist/aos.css';

AOS.init({
  duration: 1000,
  easing: 'ease-out-cubic',
  once: false,
  mirror: true
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
