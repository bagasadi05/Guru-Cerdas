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
  '!min-h-[44px] px-3 sm:px-4 rounded-lg border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs sm:text-sm whitespace-nowrap';
const primaryActionClasses =
  '!min-h-[44px] px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm whitespace-nowrap';
const overflowTriggerClasses =
  '!h-11 !w-11 !min-w-[44px] !p-0 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-500 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700';

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
      aria-label={action.title || action.label}
    >
      <Icon className="w-4 h-4 shrink-0" />
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
      // Allow manage class, add student, and import excel if user is admin or can manage the active class
      if (action.id === 'manage_class' || action.id === 'add_student' || action.id === 'import_excel') {
        return canManageActiveClass || isAdmin;
      }
      // Restrict import from other teachers to Admin
      if (action.id === 'import_teacher') return isAdmin;
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
