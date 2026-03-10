import React from 'react';
import { TabsList, TabsTrigger } from '../ui/Tabs';
import { ClassRow } from './types';

interface StudentsClassTabsHeaderProps {
  classes: ClassRow[];
}

export const StudentsClassTabsHeader: React.FC<StudentsClassTabsHeaderProps> = ({ classes }) => {
  return (
    <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
      <TabsList className="bg-transparent p-0 gap-2 flex h-auto w-max">
        {classes.map((classItem) => (
          <TabsTrigger
            key={classItem.id}
            value={classItem.id}
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white dark:data-[state=active]:bg-emerald-500 dark:data-[state=active]:text-white bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full px-5 py-3 min-h-[44px] text-sm font-semibold transition-all shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {classItem.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
};
