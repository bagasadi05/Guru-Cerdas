const fs = require('fs');

let single = fs.readFileSync('src/components/pages/student-detail/child-development/views/SingleAnalysisView.tsx', 'utf8');
single = single.replace('export const ChildDevelopmentAnalysisTab: React.FC<ChildDevelopmentAnalysisTabProps> = ({', 'export const SingleAnalysisView: React.FC<ChildDevelopmentAnalysisTabProps> = ({');
fs.writeFileSync('src/components/pages/student-detail/child-development/views/SingleAnalysisView.tsx', single);

let comp = fs.readFileSync('src/components/pages/student-detail/child-development/views/ComparativeAnalysisView.tsx', 'utf8');
comp = comp.replace('export const ChildDevelopmentAnalysisTab: React.FC<ChildDevelopmentAnalysisTabProps> = ({', 'export const ComparativeAnalysisView: React.FC<ChildDevelopmentAnalysisTabProps> = ({');
comp = comp.replace("useState<'single' | 'comparative'>('single')", "useState<'single' | 'comparative'>('comparative')");
fs.writeFileSync('src/components/pages/student-detail/child-development/views/ComparativeAnalysisView.tsx', comp);

console.log('Renamed components in views');
