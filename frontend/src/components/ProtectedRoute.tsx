import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../utils/tokenValidator';

type AttributeValue = string | number | boolean;

export type AttributeCondition =
  | { path: string; equals: AttributeValue }
  | { path: string; oneOf: readonly AttributeValue[] }
  | { path: string; minimum: number };

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: readonly AppRole[];
  requiredPermissions?: readonly string[];
  attributeConditions?: readonly AttributeCondition[];
}

function getAttributeValue(attributes: object, path: string): unknown {
  const segments = path.split('.').filter(Boolean);
  let value: unknown = attributes;

  for (const segment of segments) {
    if (
      typeof value !== 'object' ||
      value === null ||
      !Object.prototype.hasOwnProperty.call(value, segment)
    ) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }

  return value;
}

function matchesAttributeCondition(attributes: object, condition: AttributeCondition): boolean {
  const value = getAttributeValue(attributes, condition.path);

  if ('equals' in condition) {
    return value === condition.equals;
  }
  if ('oneOf' in condition) {
    return condition.oneOf.some((candidate) => candidate === value);
  }
  return typeof value === 'number' && value >= condition.minimum;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
  attributeConditions,
}) => {
  const { authorization, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center text-slate-200">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-amber-400 animate-spin"></div>
          <div className="absolute w-8 h-8 rounded-full bg-indigo-500/10 blur-sm"></div>
        </div>
        <p className="mt-4 text-xs font-mono tracking-widest text-slate-400 uppercase">
          Verifying credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !authorization) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasRequiredRole =
    !requiredRoles?.length || requiredRoles.some((role) => authorization.roles.includes(role));
  const hasRequiredPermissions =
    !requiredPermissions?.length ||
    requiredPermissions.every((permission) => authorization.permissions.includes(permission));
  const meetsAttributeConditions =
    !attributeConditions?.length ||
    attributeConditions.every((condition) =>
      matchesAttributeCondition(authorization.attributes, condition)
    );

  if (!hasRequiredRole || !hasRequiredPermissions || !meetsAttributeConditions) {
    return <Navigate to="/" state={{ accessDenied: true }} replace />;
  }

  return <>{children}</>;
};

export const AccessGuard = ProtectedRoute;
export default ProtectedRoute;
