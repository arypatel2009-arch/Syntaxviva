import React from 'react';
import {
  Sidebar,
  DEFAULT_STUDENT_NAV_ITEMS,
} from '../layout/Sidebar.tsx';

export type StudentTab =
  | 'dashboard'
  | 'assignments'
  | 'results'
  | 'submissions'
  | 'profile'
  | 'settings';

interface StudentSidebarProps {
  currentTab: StudentTab;
  onSelectTab: (tab: StudentTab) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  return (
    <Sidebar
      currentTab={currentTab}
      onSelectTab={(tab) => onSelectTab(tab as StudentTab)}
      isOpen={isOpen}
      onClose={onClose}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      portalLabel="Student Workspace"
      items={DEFAULT_STUDENT_NAV_ITEMS}
    />
  );
};
