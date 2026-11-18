import React from 'react';
import { AuthPage } from './auth/AuthPage.tsx';

interface AuthScreenProps {
  onSuccess?: () => void;
  onNavigateHome?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onNavigateHome }) => {
  return <AuthPage onSuccess={onSuccess} onNavigateHome={onNavigateHome} />;
};
