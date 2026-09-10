export interface AssignmentEntry {
  id: string;
  name: string;
  navLabel: string;
  path: '/' | '/#data' | '/#week-3';
  sourceDirectory: string;
}

export const assignments: AssignmentEntry[] = [
  { id: 'week-01', name: 'Repository Setup / Prescriber Explorer', navLabel: 'Explorer', path: '/', sourceDirectory: 'src/assignments/week-01' },
  { id: 'week-02', name: 'Load & Summarize a Dataset', navLabel: 'Data', path: '/#data', sourceDirectory: 'src/assignments/week-02' },
  { id: 'week-03', name: 'First Visual', navLabel: 'First visual', path: '/#week-3', sourceDirectory: 'src/assignments/week-03' },
];

export const assignmentsMap = new Map(assignments.map((assignment) => [assignment.id, assignment]));
export const defaultAssignment = 'week-01';
