import { EmptyState } from "../components/empty-state";

function PlaceholderPage({ title, description }: { title: string; description: string }): JSX.Element { return <><h1 className="text-2xl font-semibold">{title}</h1><div className="mt-6"><EmptyState title="Workspace under construction" description={description} /></div></>; }
export const ArbitratorDashboardPage = () => <PlaceholderPage title="Arbitrator Dashboard" description="Dispute review tools will be added later." />;
export const AdminDashboardPage = () => <PlaceholderPage title="Admin Dashboard" description="Administration tools will be added later." />;
export const NotFoundPage = () => <PlaceholderPage title="Page not found" description="The page you requested does not exist." />;
