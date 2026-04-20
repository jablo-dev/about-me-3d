import { Component, ChangeDetectorRef } from '@angular/core';
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
export class ProjectsComponent {
  projects: ProjectCardExpanded[] = [];
  selectedProjectId: string | null = null;

  constructor(
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    this.projects = PROJECT_CARDS.map(card => ({
      ...card,
      visible: false,
      materializing: false
    }));
  }

  selectProject(projectId: string): void {
    if (this.selectedProjectId === projectId) {
      const project = this.projects.find(p => p.id === projectId);
      if (project) {
        project.visible = false;
        project.materializing = false;
        this.selectedProjectId = null;
        this.cdr.detectChanges();
      }
      return;
    }

    this.projects.forEach(p => {
      p.visible = false;
      p.materializing = false;
    });

    const selectedProject = this.projects.find(p => p.id === projectId);
    if (selectedProject) {
      this.selectedProjectId = projectId;
      selectedProject.visible = true;

      this.cdr.detectChanges();

      requestAnimationFrame(() => {
        selectedProject.materializing = true;
        this.cdr.detectChanges();
      });
    }
  }


  isProjectActive(projectId: string): boolean {
    return this.selectedProjectId === projectId;
  }
}


