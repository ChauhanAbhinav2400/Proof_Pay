import { Navigate, Outlet } from "react-router-dom";

import { EmptyState } from "../components/empty-state";
import { PageLoader } from "../components/page-loader";
import { useAuth } from "../hooks/use-auth";
import type { UserPermission } from "../types/domain";

interface RoleRouteProps {
  permissions: UserPermission[];
}

export function RoleRoute({ permissions }: RoleRouteProps): JSX.Element {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const allowed = permissions.some((permission) =>
    user?.permissions.includes(permission)
  );

  return allowed ? (
    <Outlet />
  ) : (
    <EmptyState
      title="Access restricted"
      description="Your backend permissions do not allow access to this workspace."
    />
  );
}
