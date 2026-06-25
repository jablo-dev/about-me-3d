export type ProjectState = 'ongoing' | 'ongoing-main-focus' | 'finished' | 'canceled';

export interface ProjectCard {
  id: string;
  icon: string;
  title: string;
  state: ProjectState;
  expDetailed: string;
  techstack: string[];
  keyLearning: string;
  url?: string;
}

export const PROJECT_CARDS: ProjectCard[] = [
  {
    id: 'wintools',
    icon: '⚡',
    title: 'projects.wintools.title',
    state: 'finished',
    expDetailed: 'projects.wintools.description',
    techstack: ['C#', '.NET', 'Windows Forms', 'Console Application', 'SQLite', 'SQL', 'Uniface'],
    keyLearning: 'projects.wintools.details',
  },
  {
    id: 'legacyweb',
    icon: '🌐',
    title: 'projects.legacyweb.title',
    state: 'ongoing',
    expDetailed: 'projects.legacyweb.description',
    techstack: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'PHP'],
    keyLearning: 'projects.legacyweb.details',
  },
  {
    id: 'saas',
    icon: '☁️',
    title: 'projects.saas.title',
    state: 'ongoing-main-focus',
    expDetailed: 'projects.saas.description',
    techstack: ['Angular', 'NgRx', 'nginx', 'PrimeNG', 'Tailwind', 'TypeScript', 'HTML', 'CSS', 'SpringBoot', 'Java', 'Jest', 'Git'],
    keyLearning: 'projects.saas.details',
  },
  {
    id: 'ggdb',
    icon: '🎮',
    title: 'projects.ggdb.title',
    state: 'ongoing',
    expDetailed: 'projects.ggdb.description',
    techstack: ['Angular', 'PHP', 'MySQL', 'REST API', 'TypeScript', 'HTML', 'CSS'],
    keyLearning: 'projects.ggdb.details',
    url: 'https://ggdb.app',
  },
  {
    id: 'gamedev',
    icon: '🎲',
    title: 'projects.gamedev.title',
    state: 'ongoing',
    expDetailed: 'projects.gamedev.description',
    techstack: ['Unreal Engine', 'Unreal 5', 'Blueprints', 'Unity', 'C#', 'Godot 4', 'GDScript', 'Blender', 'Aseprite'],
    keyLearning: 'projects.gamedev.details',
  },
  {
    id: 'agile',
    icon: '🔄',
    title: 'projects.agile.title',
    state: 'ongoing',
    expDetailed: 'projects.agile.description',
    techstack: ['Scrum', 'Kanban', 'Daily Standup', 'Retrospective', 'Agile', 'Teamwork'],
    keyLearning: 'projects.agile.details',
  },
  {
    id: 'aidev',
    icon: '🤖',
    title: 'projects.aidev.title',
    state: 'ongoing',
    expDetailed: 'projects.aidev.description',
    techstack: ['GitHub Copilot', 'Claude CLI', 'Junie', 'MCP Server'],
    keyLearning: 'projects.aidev.details',
  },
  {
    id: 'aboutme',
    icon: '🌍',
    title: 'projects.aboutme.title',
    state: 'finished',
    expDetailed: 'projects.aboutme.description',
    techstack: ['Angular', 'HTML', 'CSS', 'OpenGL', 'WebGL', 'ThreeJS'],
    keyLearning: 'projects.aboutme.details',
  },
];
