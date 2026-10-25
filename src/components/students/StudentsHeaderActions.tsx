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
  '!min-h-[44px] px-3.5 sm:px-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 sm:bg-white/80 sm:dark:bg-slate-900/60 sm:backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-white/20 font-semibold text-xs sm:text-sm whitespace-nowrap shadow-2xs active:scale-95 transition-colors sm:transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none inline-flex items-center gap-2';
const primaryActionClasses =
  '!min-h-[44px] px-4 sm:px-5 rounded-xl text-xs sm:text-sm whitespace-nowrap font-bold !bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-500 !text-white shadow-md shadow-emerald-600/25 sm:hover:shadow-lg sm:hover:shadow-emerald-600/35 active:scale-95 transition-colors sm:transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none border-0 inline-flex items-center gap-2';
const overflowTriggerClasses =
  '!h-11 !w-11 !min-w-[44px] !p-0 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 sm:bg-white/80 sm:dark:bg-slate-900/60 sm:backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 shadow-2xs active:scale-95 transition-colors sm:transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none';

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
    <div className="flex items-center gap-2.5">
      <div className="hidden lg:flex items-center gap-2.5">
        {desktopActions.map((action) => renderActionButton(action, onAction))}
      </div>

      <div className="hidden sm:flex lg:hidden items-center gap-2.5">
        {tabletPrimary.map((action) => renderActionButton(action, onAction))}
        {tabletOverflow.length > 0 ? renderOverflowMenu(tabletOverflow, onAction) : null}
      </div>

      <div className="flex sm:hidden items-center gap-2">
        {mobilePrimary.map((action) => renderActionButton(action, onAction))}
        {mobileOverflow.length > 0 ? renderOverflowMenu(mobileOverflow, onAction) : null}
      </div>
    </div>
  );
};
