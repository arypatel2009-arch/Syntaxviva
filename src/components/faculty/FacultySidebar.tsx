import React from 'react';
import {
  Sidebar,
  DEFAULT_FACULTY_NAV_ITEMS,
} from '../layout/Sidebar.tsx';

export type FacultyTab =
  | 'dashboard'
  | 'assignments'
  | 'create'
  | 'submissions'
  | 'students'
  | 'analytics'
  | 'settings';

interface FacultySidebarProps {
  currentTab: FacultyTab;
  onSelectTab: (tab: FacultyTab) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const FacultySidebar: React.FC<FacultySidebarProps> = ({
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
      onSelectTab={(tab) => onSelectTab(tab as FacultyTab)}
      isOpen={isOpen}
      onClose={onClose}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      portalLabel="Faculty Control Center"
      items={DEFAULT_FACULTY_NAV_ITEMS}
    />
  );
};
