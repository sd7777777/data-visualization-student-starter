export interface AssignmentEntry {
  id: string;
  name: string;
  navLabel: string;
  path: '/' | '/lab' | '/coursework';
  sourceDirectory: string;
}

export const assignments: AssignmentEntry[] = [
  { id: 'week-01', name: 'Repository Setup / Prescriber Explorer', navLabel: 'Explorer', path: '/', sourceDirectory: 'src/assignments/week-01' },
  { id: 'week-02', name: 'Load & Summarize a Dataset', navLabel: 'Data lab', path: '/lab', sourceDirectory: 'src/assignments/week-02' },
  { id: 'coursework', name: 'Methods and Project Notes', navLabel: 'Methods', path: '/coursework', sourceDirectory: 'app/coursework' },
];

export const assignmentsMap = new Map(assignments.map((assignment) => [assignment.id, assignment]));
export const defaultAssignment = 'week-01';
