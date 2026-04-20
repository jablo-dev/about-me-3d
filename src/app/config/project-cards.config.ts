export interface ProjectCard {
  id: string;
  icon: string;
  title: string;
  expInYears: number;
  expDetailed: string;
  techstack: string[];
  keyLearning: string;
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
];
