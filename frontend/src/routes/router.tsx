import { createBrowserRouter } from "react-router-dom";

import { AuthLayout } from "../layouts/auth-layout";
import { DashboardLayout } from "../layouts/dashboard-layout";
import { BrowseProjectsPage } from "../pages/browse-projects-page";
import { DashboardPage } from "../pages/dashboard-page";
import { EscrowDashboardPage } from "../pages/escrow-dashboard-page";
import { EscrowDetailsPage } from "../pages/escrow-details-page";
import { LoginPage } from "../pages/login-page";
import { MyProjectsPage } from "../pages/my-projects-page";
import { MyWorkPage } from "../pages/my-work-page";
import { ProjectDetailsPage } from "../pages/project-details-page";
import { AdminDashboardPage } from "../pages/admin-dashboard-page";
import { ArbitratorDashboardPage } from "../pages/arbitrator-dashboard-page";
import {
  NotFoundPage,
} from "../pages/placeholder-pages";
import { ProtectedRoute } from "./protected-route";
import { RoleRoute } from "./role-route";

export const router = createBrowserRouter([
  { element: <AuthLayout />, children: [{ path: "/", element: <LoginPage /> }, { path: "/login", element: <LoginPage /> }] },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <DashboardLayout />,
      children: [
        { path: "/", element: <DashboardPage /> },
        { path: "/dashboard", element: <DashboardPage /> },
        { path: "/projects", element: <BrowseProjectsPage /> },
        { path: "/my-projects", element: <MyProjectsPage /> },
        { path: "/my-work", element: <MyWorkPage /> },
        { path: "/projects/:projectId", element: <ProjectDetailsPage /> },
        { path: "/escrows", element: <EscrowDashboardPage /> },
        { path: "/escrows/:blockchainEscrowId", element: <EscrowDetailsPage /> },
        { element: <RoleRoute permissions={["ARBITRATOR"]} />, children: [{ path: "/arbitrator", element: <ArbitratorDashboardPage /> }] },
        { element: <RoleRoute permissions={["ADMIN"]} />, children: [{ path: "/admin", element: <AdminDashboardPage /> }] }
      ]
    }]
  },
  { path: "*", element: <NotFoundPage /> }
]);
