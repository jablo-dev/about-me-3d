import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PROJECT_CARDS, ProjectCard } from '../config/project-cards.config';

interface ProjectCardExpanded extends ProjectCard {
  expanded: boolean;
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

  constructor(private translate: TranslateService) {
    // Initialize projects from config with expanded state
    this.projects = PROJECT_CARDS.map(card => ({
      ...card,
      expanded: false
    }));
  }

  toggleCard(project: ProjectCardExpanded): void {
    project.expanded = !project.expanded;
  }

  getExperienceLabel(expInYears: number): string {
    const key = expInYears === 1 ? 'projects.exp_year' : 'projects.exp_years';
    return this.translate.instant(key, { years: expInYears });
  }
}


