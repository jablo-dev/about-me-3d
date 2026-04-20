import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BackgroundSceneService } from '../services/background-scene.service';
import { SpaceSceneService } from '../services/space-scene.service';
import { ProjectsComponent } from '../projects/projects.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ProjectsComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sceneCanvas') private sceneCanvasRef!: ElementRef<HTMLCanvasElement>;

  private animationId!: number;
  private clock = Date.now();
  private labelVisibility: Map<string, boolean> = new Map();

  currentLang = 'en';

  constructor(
    private ngZone: NgZone,
    private translate: TranslateService,
    private backgroundSceneService: BackgroundSceneService,
    private spaceSceneService: SpaceSceneService
  ) {
    this.translate.addLangs(['en', 'de']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');

    // Initialize all labels as visible
    const labels = ['Angular', '.NET', 'SpringBoot', 'TypeScript', 'JavaScript',
                    'HTML', 'CSS', 'JAVA', 'C#', 'SQL', 'PHP', 'GIT', 'JEST',
                    'Teamwork', 'Scrum', 'Unity 6', 'Unreal 5', 'Godot 4',
                    'WebGL', 'ThreeJS', 'REST-API'];
    labels.forEach(label => this.labelVisibility.set(label, true));
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
  };

  private onResize = (): void => {
    this.backgroundSceneService.resize();
    this.spaceSceneService.resize(this.sceneCanvasRef.nativeElement);
  };

  toggleLang(): void {
    this.currentLang = this.currentLang === 'en' ? 'de' : 'en';
    this.translate.use(this.currentLang);
  }

  toggleLabel(labelText: string): void {
    const isCurrentlyVisible = this.labelVisibility.get(labelText) ?? true;
    this.labelVisibility.set(labelText, !isCurrentlyVisible);
    this.ngZone.run(() => {
      this.spaceSceneService.togglePlanetLabel(labelText, !isCurrentlyVisible);
    });
  }

  isLabelVisible(labelText: string): boolean {
    return this.labelVisibility.get(labelText) ?? true;
  }

  scrollToProjects(): void {
    const projectsSection = document.getElementById('projects-section');
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

