import React from 'react';
import { GlobalTopHeader } from '../layout/Sidebar.tsx';

interface StudentHeaderProps {
  onToggleSidebar: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNavigateSettings?: () => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  onToggleSidebar,
  searchTerm,
  onSearchChange,
  onNavigateSettings,
}) => {
  return (
    <GlobalTopHeader
      onToggleSidebar={onToggleSidebar}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      onNavigateSettings={onNavigateSettings}
      searchPlaceholder="Search lab assignments, topics..."
    />
  );
};
