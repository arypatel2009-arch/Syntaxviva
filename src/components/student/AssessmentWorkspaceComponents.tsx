import React, { useEffect } from 'react';

if (typeof window !== 'undefined') {
  window.location.reload();
}

export const DEFAULT_STARTER_BY_LANG: Record<string, string> = {};
export const DEFAULT_SEVEN_TEST_CASES: any[] = [];

export function formatSourceCode(code: string): string {
  return code;
}

export const MonacoAssessmentEditor: React.FC<any> = () => {
  useEffect(() => {
    window.location.reload();
  }, []);
  return null;
};

export const AiVivaModal: React.FC<any> = () => {
  useEffect(() => {
    window.location.reload();
  }, []);
  return null;
};
