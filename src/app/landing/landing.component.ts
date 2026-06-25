import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BackgroundSceneService } from '../services/background-scene.service';
import { SpaceSceneService } from '../services/space-scene.service';
import { TechNavigationService } from '../services/tech-navigation.service';
import { ProjectsComponent } from '../projects/projects.component';
import { ContactComponent } from '../contact/contact.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ProjectsComponent, ContactComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sceneCanvas') private sceneCanvasRef!: ElementRef<HTMLCanvasElement>;

  private animationId!: number;
  private clock = Date.now();

  currentDate = '';
  currentLang = 'en';
  cursorX = 0;
  cursorY = 0;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private backgroundSceneService: BackgroundSceneService,
    private spaceSceneService: SpaceSceneService,
    private techNavigation: TechNavigationService
  ) {
    this.translate.addLangs(['en', 'de']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this.currentDate = `${y}.${m}.${d}`;
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initScenes();
      this.setupEventListeners();
      this.animate();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.backgroundSceneService.dispose();
    this.spaceSceneService.dispose();
    this.removeEventListeners();
  }

  private initScenes(): void {
    this.backgroundSceneService.init(this.canvasRef.nativeElement);
    this.spaceSceneService.init(this.sceneCanvasRef.nativeElement);
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);
    this.sceneCanvasRef.nativeElement.addEventListener('click', this.onSceneClick);
    this.sceneCanvasRef.nativeElement.addEventListener('mousemove', this.onSceneHover);
    this.sceneCanvasRef.nativeElement.addEventListener('mousedown', this.onSceneDragStart);
    window.addEventListener('mousemove', this.onSceneDrag);
    window.addEventListener('mouseup', this.onSceneDragEnd);
  }

  private removeEventListeners(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    this.sceneCanvasRef?.nativeElement.removeEventListener('click', this.onSceneClick);
    this.sceneCanvasRef?.nativeElement.removeEventListener('mousemove', this.onSceneHover);
    this.sceneCanvasRef?.nativeElement.removeEventListener('mousedown', this.onSceneDragStart);
    window.removeEventListener('mousemove', this.onSceneDrag);
    window.removeEventListener('mouseup', this.onSceneDragEnd);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const t = (Date.now() - this.clock) / 1000;

    this.backgroundSceneService.animate(t);
    this.spaceSceneService.animate();
  };

  private onSceneClick = (e: MouseEvent): void => {
    this.spaceSceneService.handleClick(e, this.sceneCanvasRef.nativeElement);
  };

  private onSceneHover = (e: MouseEvent): void => {
    this.spaceSceneService.handleHover(e, this.sceneCanvasRef.nativeElement);
  };

  private onSceneDragStart = (e: MouseEvent): void => {
    this.spaceSceneService.handleDragStart(e, this.sceneCanvasRef.nativeElement);
  };

  private onSceneDrag = (e: MouseEvent): void => {
    this.spaceSceneService.handleDrag(e, this.sceneCanvasRef.nativeElement);
  };

  private onSceneDragEnd = (): void => {
    this.spaceSceneService.handleDragEnd(this.sceneCanvasRef.nativeElement);
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.backgroundSceneService.handleMouseMove(e);
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;
    this.cdr.detectChanges();
  };

  private onResize = (): void => {
    this.backgroundSceneService.resize();
    this.spaceSceneService.resize(this.sceneCanvasRef.nativeElement);
  };

  toggleLang(): void {
    this.currentLang = this.currentLang === 'en' ? 'de' : 'en';
    this.translate.use(this.currentLang);
  }

  navigateToTech(tech: string): void {
    this.scrollToProjects();
    this.techNavigation.navigateToTech(tech);
  }

  scrollToProjects(): void {
    const projectsSection = document.getElementById('projects-section');
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToContact(): void {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
