import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { ProjectForm } from "../features/projects/components/project-form";
import { ProjectCard, ProjectSkeleton } from "../features/projects/components/project-ui";
import { useClientProjects, useCreateProject } from "../features/projects/hooks/use-projects";
import { useAuth } from "../hooks/use-auth";
import type { CreateProjectInput } from "../types/domain";
import { getApiErrorMessage } from "../utils/api-error";

export function MyProjectsPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const projects = useClientProjects(user?.walletAddress);
  const createProject = useCreateProject();

  const handleCreate = async (input: CreateProjectInput) => {
    const project = await createProject.mutateAsync(input);
    setIsCreating(false);
    navigate(`/projects/${project.id}`);
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">My Projects</h1>
          <p className="mt-2 text-sm text-slate-600">Projects created from your authenticated wallet.</p>
        </div>
        <Button onClick={() => setIsCreating((current) => !current)}><Plus size={16} /> <span className="ml-1">Create Project</span></Button>
      </div>
      {isCreating && (
        <div className="mt-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Create Project</h2>
            <ProjectForm submitLabel="Create Project" isSubmitting={createProject.isPending} onSubmit={handleCreate} onCancel={() => setIsCreating(false)} />
          </Card>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {projects.isLoading && Array.from({ length: 2 }, (_, index) => <ProjectSkeleton key={index} />)}
        {projects.isError && <ErrorState message={getApiErrorMessage(projects.error, "Unable to load your projects.")} />}
        {projects.data?.length === 0 && <EmptyState title="No projects yet" description="Create your first project to start receiving proposals." />}
        {projects.data?.map((project) => <ProjectCard key={project.id} project={project} />)}
      </div>
    </section>
  );
}
