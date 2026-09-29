export interface AssignmentEntry {
  id: string;
  name: string;
  navLabel: string;
  path: '/' | '/#data' | '/#week-3' | '/#week-4' | '/#week-5' | '/#week-6';
  sourceDirectory: string;
}

export const assignments: AssignmentEntry[] = [
  {
    id: 'week-01',
    name: 'Repository Setup / Prescriber Explorer',
    navLabel: 'Explorer',
    path: '/',
    sourceDirectory: 'src/assignments/week-01',
  },
  {
    id: 'week-02',
    name: 'Load & Summarize a Dataset',
    navLabel: 'Data',
    path: '/#data',
    sourceDirectory: 'src/assignments/week-02',
  },
  {
    id: 'week-03',
    name: 'First Visual',
    navLabel: 'First visual',
    path: '/#week-3',
    sourceDirectory: 'src/assignments/week-03',
  },
  {
    id: 'week-04',
    name: 'Legibility and Validation',
    navLabel: 'Revision',
    path: '/#week-4',
    sourceDirectory: 'src/assignments/week-04',
  },
  {
    id: 'week-05',
    name: 'Interaction and Updated Sketches',
    navLabel: 'Interaction',
    path: '/#week-5',
    sourceDirectory: 'src/assignments/week-05',
  },
  {
    id: 'week-06',
    name: 'Project V1',
    navLabel: 'Project V1',
    path: '/#week-6',
    sourceDirectory: 'src/assignments/week-06',
  },
];

export const assignmentsMap = new Map(
  assignments.map((assignment) => [assignment.id, assignment]),
);
export const defaultAssignment = 'week-01';
