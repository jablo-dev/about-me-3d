import { Component, signal } from '@angular/core';
import { LandingComponent } from './landing/landing.component';

@Component({
  selector: 'app-root',
  imports: [LandingComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('about-me-3d');
}
