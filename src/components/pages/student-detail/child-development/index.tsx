import React from 'react';
import { ChildDevelopmentAnalysisView } from './views/ChildDevelopmentAnalysisView';
import type { ChildDevelopmentAnalysisTabProps } from './types/childDevelopmentTypes';

export type { ChildDevelopmentAnalysisTabProps };

export const ChildDevelopmentAnalysisTab: React.FC<
  Omit<ChildDevelopmentAnalysisTabProps, 'defaultMode'>
> = (props) => {
  return <ChildDevelopmentAnalysisView {...props} defaultMode="single" />;
};
