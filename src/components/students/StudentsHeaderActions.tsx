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
}

const outlineActionClasses =
  'h-11 px-3 sm:px-4 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-sm';
const primaryActionClasses =
  'h-11 px-4 rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white border-none';
const overflowTriggerClasses =
  'h-11 w-11 p-0 rounded-xl items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm';

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

export const StudentsHeaderActions: React.FC<StudentsHeaderActionsProps> = ({ onAction, canManageActiveClass }) => {
  const desktopActions = canManageActiveClass
    ? studentsHeaderActionSets.desktop
    : studentsHeaderActionSets.desktop.filter((action) => action.id === 'export');
  const tabletPrimary = canManageActiveClass
    ? studentsHeaderActionSets.tabletPrimary
    : studentsHeaderActionSets.tabletPrimary.filter((action) => action.id === 'export');
  const tabletOverflow = canManageActiveClass
    ? studentsHeaderActionSets.tabletOverflow
    : [];
  const mobilePrimary = canManageActiveClass
    ? studentsHeaderActionSets.mobilePrimary
    : [];
  const mobileOverflow = canManageActiveClass
    ? studentsHeaderActionSets.mobileOverflow
    : studentsHeaderActionSets.mobileOverflow.filter((action) => action.id === 'export');

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
