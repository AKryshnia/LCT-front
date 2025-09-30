import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@app/store';
import type { Role } from './model/auth.slice';

type Props = {
  children: React.ReactNode;
  roles?: Role[];
};

export const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { isAuthed, roles: userRoles } = useSelector((s: RootState) => s.auth);

  // Если не авторизован, редирект на /login
  if (!isAuthed) return <Navigate to="/login" replace />;

  // Если указаны требуемые роли, проверяем доступ
  if (roles && roles.length > 0) {
    const hasAccess = userRoles.some(r => roles.includes(r));
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
