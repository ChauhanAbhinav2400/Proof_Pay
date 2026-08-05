import { describe, expect, it } from "vitest";

import { app } from "../../src/app";
import { ProjectModel } from "../../src/models/project/project.model";
import { buildProject } from "../factories";
import {
  createAuthenticatedUser,
  createRequest,
  withAuthentication,
  withJson
} from "../helpers";

function authenticatedJson(token: string, path: string) {
  return withAuthentication(withJson(createRequest(app).post(path)), token);
}

describe("Project routes", () => {
  it("creates and persists a project for the authenticated client", async () => {
    const client = await createAuthenticatedUser();
    const payload = buildProject();

    const response = await authenticatedJson(client.token, "/projects")
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      clientWallet: client.walletAddress,
      title: payload.title,
      status: "OPEN"
    });
    expect(await ProjectModel.findById(response.body.id).lean()).toMatchObject({
      clientWallet: client.walletAddress,
      title: payload.title
    });
  });

  it("requires authentication to create, update, and cancel projects", async () => {
    const project = await ProjectModel.create(buildProject());

    await withJson(createRequest(app).post("/projects")).send(buildProject()).expect(401);
    await withJson(createRequest(app).patch(`/projects/${project.id}`))
      .send({ title: "Updated title" })
      .expect(401);
    await withJson(createRequest(app).post(`/projects/${project.id}/cancel`)).expect(401);
  });

  it("returns validation failures from the implemented project service", async () => {
    const client = await createAuthenticatedUser();

    const response = await authenticatedJson(client.token, "/projects")
      .send({ title: "", skills: [] })
      .expect(500);

    expect(response.body).toMatchObject({
      success: false,
      message: "Project title must be at least 3 characters."
    });
  });

  it("lists open projects with repository pagination", async () => {
    const client = await createAuthenticatedUser();
    await ProjectModel.create([
      buildProject({ clientWallet: client.walletAddress, title: "First project" }),
      buildProject({ clientWallet: client.walletAddress, title: "Second project" }),
      buildProject({ clientWallet: client.walletAddress, title: "Cancelled project", status: "CANCELLED" })
    ]);

    const response = await createRequest(app).get("/projects?limit=1&skip=1").expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ status: "OPEN" });
  });

  it("returns projects for a wallet and exposes project existence", async () => {
    const client = await createAuthenticatedUser();
    const project = await ProjectModel.create(buildProject({ clientWallet: client.walletAddress }));

    const byClient = await createRequest(app)
      .get(`/projects/clients/${client.walletAddress}`)
      .expect(200);
    const exists = await createRequest(app)
      .get(`/projects/${project.id}/exists`)
      .expect(200);

    expect(byClient.body).toHaveLength(1);
    expect(byClient.body[0].id).toBe(project.id);
    expect(exists.body).toBe(true);
  });

  it("gets a project and reports missing project records", async () => {
    const project = await ProjectModel.create(buildProject());

    await createRequest(app).get(`/projects/${project.id}`).expect(200);
    const missing = await createRequest(app)
      .get("/projects/507f191e810c19729de860ea")
      .expect(500);

    expect(missing.body).toMatchObject({ success: false, message: "Project not found." });
  });

  it("allows only the project owner to update and cancel an open project", async () => {
    const owner = await createAuthenticatedUser();
    const otherUser = await createAuthenticatedUser();
    const project = await ProjectModel.create(buildProject({ clientWallet: owner.walletAddress }));

    const forbiddenUpdate = await withAuthentication(
      withJson(createRequest(app).patch(`/projects/${project.id}`)),
      otherUser.token
    )
      .send({ title: "Other user update" })
      .expect(500);
    expect(forbiddenUpdate.body.message).toBe("Only project owner can update project.");

    const updated = await withAuthentication(
      withJson(createRequest(app).patch(`/projects/${project.id}`)),
      owner.token
    )
      .send({ title: "Owner updated project" })
      .expect(200);
    expect(updated.body.title).toBe("Owner updated project");

    await withAuthentication(withJson(createRequest(app).post(`/projects/${project.id}/cancel`)), owner.token)
      .expect(200);
    expect((await ProjectModel.findById(project.id).lean())?.status).toBe("CANCELLED");
  });
});
