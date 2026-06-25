import { Component, ChangeDetectorRef, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TechNavigationService } from '../services/tech-navigation.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PROJECT_CARDS, ProjectCard } from '../config/project-cards.config';

interface ProjectCardExpanded extends ProjectCard {
  visible: boolean;
  materializing: boolean;
}


@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent implements OnInit, OnDestroy {
  projects: ProjectCardExpanded[] = [];
  currentIndex: number = 0;
  sectionVisible: boolean = false;

  private observer!: IntersectionObserver;
  private techNavSub!: Subscription;

  constructor(
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private el: ElementRef,
    private techNavigation: TechNavigationService
  ) {
    this.projects = PROJECT_CARDS.map(card => ({
      ...card,
      visible: false,
      materializing: false
    }));
  }

  ngOnInit(): void {
    this.showProject(0);
    this.techNavSub = this.techNavigation.techSelected.subscribe(tech => {
      this.navigateToTech(tech);
    });
    this.observer = new IntersectionObserver(
      (entries) => {
        this.sectionVisible = entries[0].isIntersecting;
        this.cdr.detectChanges();
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.techNavSub?.unsubscribe();
  }

  navigateToTech(tech: string): void {
    const normalized = tech.toLowerCase().replace(/[-_]/g, ' ');
    const index = this.projects.findIndex(p =>
      p.techstack.some(t => {
        const tNorm = t.toLowerCase().replace(/[-_]/g, ' ');
        return tNorm === normalized ||
               tNorm.split(' ')[0] === normalized ||
               normalized.split(' ')[0] === tNorm;
      })
    );
    if (index !== -1) {
      this.showProject(index);
      this.cdr.detectChanges();
    }
  }

  showProject(index: number): void {
    this.projects.forEach(p => {
      p.visible = false;
      p.materializing = false;
    });

    this.currentIndex = index;
    const project = this.projects[index];
    if (project) {
      project.visible = true;
      requestAnimationFrame(() => {
        project.materializing = true;
        this.cdr.detectChanges();
      });
    }
  }

  nextProject(): void {
    if (this.currentIndex < this.projects.length - 1) {
      this.showProject(this.currentIndex + 1);
    }
  }

  prevProject(): void {
    if (this.currentIndex > 0) {
      this.showProject(this.currentIndex - 1);
    }
  }

  stateKey(state: string): string {
    return 'projects.state_' + state.replace(/-/g, '_');
  }
}


