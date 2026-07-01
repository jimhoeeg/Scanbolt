'use client';

/**
 * MODULE 1 (frontend) — declarative conditional rendering by role.
 *
 * Wrap any dealer-only UI:
 *   <RoleGate allow="dealer">
 *     <DealerPortalNavLink />
 *   </RoleGate>
 *
 * Optionally render a fallback for other roles (e.g. an upsell banner).
 */
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import type { RoleName } from '@/lib/types';

interface RoleGateProps {
  allow: RoleName | RoleName[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { role, loading } = useAuth();
  if (loading) return null;

  const allowed = Array.isArray(allow) ? allow : [allow];
  const permitted = role !== null && allowed.includes(role);

  return <>{permitted ? children : fallback}</>;
}
