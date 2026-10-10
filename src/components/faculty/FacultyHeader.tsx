import React from 'react';
import { GlobalTopHeader } from '../layout/Sidebar.tsx';

interface FacultyHeaderProps {
  onToggleSidebar: () => void;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateAssignment: () => void;
  onNavigateSettings?: () => void;
}

export const FacultyHeader: React.FC<FacultyHeaderProps> = ({
  onToggleSidebar,
  onToggleCollapse,
  collapsed,
  searchTerm,
  onSearchChange,
  onCreateAssignment,
  onNavigateSettings,
}) => {
  return (
    <GlobalTopHeader
      onToggleSidebar={onToggleSidebar}
      onToggleCollapse={onToggleCollapse}
      collapsed={collapsed}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      onCreateAssignment={onCreateAssignment}
      onNavigateSettings={onNavigateSettings}
      searchPlaceholder="Search assignments, student rosters, submissions..."
    />
  );
};
