import React from 'react';
import {
  CodeEditorModal,
  CodeEditorModalProps,
} from '../common/CodeEditorModal.tsx';

export type CreateAssignmentModalProps = CodeEditorModalProps;

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = (
  props
) => {
  return <CodeEditorModal {...props} />;
};
