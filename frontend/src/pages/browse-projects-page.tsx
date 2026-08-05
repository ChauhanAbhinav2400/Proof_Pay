import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/button";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { ProjectCard, ProjectSkeleton } from "../features/projects/components/project-ui";
import { useProjects } from "../features/projects/hooks/use-projects";
import { getApiErrorMessage } from "../utils/api-error";

const PAGE_SIZE = 10;

export function BrowseProjectsPage(): JSX.Element {
  const [skip, setSkip] = useState(0);
  const projects = useProjects({ limit: PAGE_SIZE, skip });

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Browse Projects</h1>
          <p className="mt-2 text-sm text-slate-600">Open projects accepting freelancer proposals.</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {projects.isLoading && Array.from({ length: 3 }, (_, index) => <ProjectSkeleton key={index} />)}
        {projects.isError && <ErrorState message={getApiErrorMessage(projects.error, "Unable to load projects.")} />}
        {projects.data?.length === 0 && <EmptyState title="No open projects" description="There are no open projects accepting proposals right now." />}
        {projects.data?.map((project) => <ProjectCard key={project.id} project={project} />)}
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button disabled={skip === 0 || projects.isFetching} onClick={() => setSkip((current) => Math.max(current - PAGE_SIZE, 0))} className="bg-slate-100 text-slate-700 hover:bg-slate-200">
          <ChevronLeft size={16} /> <span className="ml-1">Previous</span>
        </Button>
        <Button disabled={(projects.data?.length ?? 0) < PAGE_SIZE || projects.isFetching} onClick={() => setSkip((current) => current + PAGE_SIZE)} className="bg-slate-100 text-slate-700 hover:bg-slate-200">
          <span className="mr-1">Next</span> <ChevronRight size={16} />
        </Button>
      </div>
    </section>
  );
}
