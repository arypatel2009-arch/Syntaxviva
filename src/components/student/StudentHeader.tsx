import React from 'react';
import { GlobalTopHeader } from '../layout/Sidebar.tsx';

interface StudentHeaderProps {
  onToggleSidebar: () => void;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNavigateSettings?: () => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  onToggleSidebar,
  onToggleCollapse,
  collapsed,
  searchTerm,
  onSearchChange,
  onNavigateSettings,
}) => {
  return (
    <GlobalTopHeader
      onToggleSidebar={onToggleSidebar}
      onToggleCollapse={onToggleCollapse}
      collapsed={collapsed}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      onNavigateSettings={onNavigateSettings}
      searchPlaceholder="Search lab assignments, topics..."
    />
  );
};
