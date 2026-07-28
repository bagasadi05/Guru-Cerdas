import React from 'react';
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '../ui/DropdownMenu';
import { Button } from '../ui/Button';
import { MoreVerticalIcon } from '../Icons';
import {
  studentsHeaderActionSets,
  type StudentsHeaderAction,
  type StudentsHeaderActionId,
} from './studentsMenuConfig';

interface StudentsHeaderActionsProps {
  onAction: (actionId: StudentsHeaderActionId) => void;
  canManageActiveClass: boolean;
  isAdmin?: boolean;
}

const outlineActionClasses =
  'h-10 px-3 sm:px-4 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white shadow-sm font-semibold text-xs sm:text-sm flex items-center justify-center transition-all';
const primaryActionClasses =
  'h-10 px-3 sm:px-4 rounded-lg shadow-sm text-xs sm:text-sm flex items-center justify-center';
const overflowTriggerClasses =
  'h-10 w-10 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all';

const renderActionButton = (
  action: StudentsHeaderAction,
  onAction: (actionId: StudentsHeaderActionId) => void
) => {
  const Icon = action.icon;
  const isPrimary = action.variant === 'primary';

  return (
    <Button
      key={action.id}
      size="sm"
      variant={isPrimary ? 'default' : 'outline'}
      onClick={() => onAction(action.id)}
      className={isPrimary ? primaryActionClasses : outlineActionClasses}
      title={action.title}
    >
      <Icon className="w-4 h-4 mr-2" />
      {action.label}
    </Button>
  );
};

const renderOverflowMenu = (
  actions: StudentsHeaderAction[],
  onAction: (actionId: StudentsHeaderActionId) => void
) => (
  <DropdownMenu>
    <DropdownTrigger className={overflowTriggerClasses}>
      <MoreVerticalIcon className="w-5 h-5" />
      <span className="sr-only">Menu tindakan</span>
    </DropdownTrigger>
    <DropdownContent align="right">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <DropdownItem key={action.id} icon={<Icon className="w-4 h-4" />} onClick={() => onAction(action.id)}>
            {action.label}
          </DropdownItem>
        );
      })}
    </DropdownContent>
  </DropdownMenu>
);

export const StudentsHeaderActions: React.FC<StudentsHeaderActionsProps> = ({ onAction, canManageActiveClass, isAdmin = false }) => {
  const filterActions = (actions: StudentsHeaderAction[]) => {
    return actions.filter(action => {
      // Always allow export
      if (action.id === 'export') return true;
      // Allow manage class if teacher can manage
      if (action.id === 'manage_class') return canManageActiveClass;
      // Restrict all other actions (add_student, import_excel, import_teacher) to Admin
      return isAdmin;
    });
  };

  const desktopActions = filterActions(studentsHeaderActionSets.desktop);
  const tabletPrimary = filterActions(studentsHeaderActionSets.tabletPrimary);
  const tabletOverflow = filterActions(studentsHeaderActionSets.tabletOverflow);
  const mobilePrimary = filterActions(studentsHeaderActionSets.mobilePrimary);
  const mobileOverflow = filterActions(studentsHeaderActionSets.mobileOverflow);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden lg:flex items-center gap-3">
        {desktopActions.map((action) => renderActionButton(action, onAction))}
      </div>

      <div className="hidden sm:flex lg:hidden items-center gap-3">
        {tabletPrimary.map((action) => renderActionButton(action, onAction))}
        {tabletOverflow.length > 0 ? renderOverflowMenu(tabletOverflow, onAction) : null}
      </div>

      <div className="flex sm:hidden items-center gap-3">
        {mobilePrimary.map((action) => renderActionButton(action, onAction))}
        {mobileOverflow.length > 0 ? renderOverflowMenu(mobileOverflow, onAction) : null}
      </div>
    </div>
  );
};
