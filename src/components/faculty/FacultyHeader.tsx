import React from 'react';
import { GlobalTopHeader } from '../layout/Sidebar.tsx';

interface FacultyHeaderProps {
  onToggleSidebar: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateAssignment: () => void;
  onNavigateSettings?: () => void;
}

export const FacultyHeader: React.FC<FacultyHeaderProps> = ({
  onToggleSidebar,
  searchTerm,
  onSearchChange,
  onCreateAssignment,
  onNavigateSettings,
}) => {
  return (
    <GlobalTopHeader
      onToggleSidebar={onToggleSidebar}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      onCreateAssignment={onCreateAssignment}
      onNavigateSettings={onNavigateSettings}
      searchPlaceholder="Search assignments, student rosters, submissions..."
    />
  );
};
