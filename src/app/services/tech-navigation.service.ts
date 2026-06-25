import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TechNavigationService {
  private techSelected$ = new Subject<string>();

  techSelected = this.techSelected$.asObservable();

  navigateToTech(tech: string): void {
    this.techSelected$.next(tech);
  }
}
