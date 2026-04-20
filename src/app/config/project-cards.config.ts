export interface ProjectCard {
  id: string;
  icon: string;
  title: string;
  expInYears: number;
  expDetailed: string;
  techstack: string[];
  keyLearning: string;
  url?: string;
}

export const PROJECT_CARDS: ProjectCard[] = [
  {
    id: 'angular',
    icon: 'A',
    title: 'Angular',
    expInYears: 2,
    expDetailed: 'projects.angular.description',
    techstack: ['CSS', 'HTML', 'NgRx', 'PrimeNG', 'Signals', 'Tailwind', 'TypeScript'],
    keyLearning: 'projects.angular.details',
  },
  {
    id: 'dotnet',
    icon: '⚡',
    title: '.NET',
    expInYears: 4,
    expDetailed: 'projects.dotnet.description',
    techstack: [
      'C#',
      '.NET Framework',
      'File I/O',
      'Console Applications',
      'Microsoft Interop Service',
      'WinForms',
      'SQLite'
    ],
    keyLearning: 'projects.dotnet.details',
  },
  {
    id: 'ggdb',
    icon: '🎮',
    title: 'GoodGamesDB',
    expInYears: 1,
    expDetailed: 'projects.ggdb.description',
    techstack: [
      'Angular',
      'PHP',
      'MySQL',
      'REST API',
      'TypeScript',
      'HTML',
      'CSS'
    ],
    keyLearning: 'projects.ggdb.details',
    url: 'https://ggdb.app',
  },
  {
    id: 'gamedev',
    icon: '🎲',
    title: 'Game Development',
    expInYears: 1,
    expDetailed: 'projects.gamedev.description',
    techstack: [
      'Unreal Engine 5',
      'Unity 6',
      'Godot 4',
      'Blender',
      'Aseprite',
      'C#',
      'GDScript',
      'Blueprints'
    ],
    keyLearning: 'projects.gamedev.details',
  },
];
