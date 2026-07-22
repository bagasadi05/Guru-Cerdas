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
  'h-11 px-3 sm:px-4 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-sm font-semibold text-xs sm:text-sm flex items-center justify-center';
const primaryActionClasses =
  'h-11 px-4 rounded-xl shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white border-none font-semibold text-xs sm:text-sm flex items-center justify-center';
const overflowTriggerClasses =
  'h-11 w-11 p-0 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all';

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
