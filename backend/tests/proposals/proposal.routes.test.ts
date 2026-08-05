import { describe, expect, it } from "vitest";

import { app } from "../../src/app";
import { ProjectModel } from "../../src/models/project/project.model";
import { ProposalModel } from "../../src/models/proposal/proposal.model";
import { buildProject, buildProposal } from "../factories";
import { createAuthenticatedUser, createRequest, withAuthentication, withJson } from "../helpers";

async function createProjectFor(clientWallet: string) {
  return ProjectModel.create(buildProject({ clientWallet }));
}

function proposalRequest(token: string, projectId: string) {
  return withAuthentication(
    withJson(createRequest(app).post(`/projects/${projectId}/proposals`)),
    token
  );
}

describe("Proposal routes", () => {
  it("creates and persists a proposal for the authenticated freelancer", async () => {
    const client = await createAuthenticatedUser();
    const freelancer = await createAuthenticatedUser();
    const project = await createProjectFor(client.walletAddress);
    const payload = buildProposal();

    const response = await proposalRequest(freelancer.token, project.id)
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      projectId: project.id,
      freelancerWallet: freelancer.walletAddress,
      status: "PENDING"
    });
    expect(await ProposalModel.findById(response.body.id).lean()).toMatchObject({
      projectId: project._id,
      freelancerWallet: freelancer.walletAddress
    });
  });

  it("requires authentication for creation and proposal reads", async () => {
    const project = await ProjectModel.create(buildProject());

    await withJson(createRequest(app).post(`/projects/${project.id}/proposals`))
      .send(buildProposal())
      .expect(401);
    await createRequest(app).get("/proposals/507f191e810c19729de860ea").expect(401);
  });

  it("prevents duplicate proposals from the same freelancer", async () => {
    const client = await createAuthenticatedUser();
    const freelancer = await createAuthenticatedUser();
    const project = await createProjectFor(client.walletAddress);
    const payload = buildProposal();

    await proposalRequest(freelancer.token, project.id).send(payload).expect(201);
    const duplicate = await proposalRequest(freelancer.token, project.id)
      .send(payload)
      .expect(500);

    expect(duplicate.body.message).toBe("Proposal already submitted.");
  });

  it("returns project and input failures from the implemented service", async () => {
    const freelancer = await createAuthenticatedUser();

    const missingProject = await proposalRequest(freelancer.token, "507f191e810c19729de860ea")
      .send(buildProposal())
      .expect(500);
    expect(missingProject.body.message).toBe("Project not found.");
  });

  it("lists project and freelancer proposals with pagination", async () => {
    const client = await createAuthenticatedUser();
    const freelancer = await createAuthenticatedUser();
    const project = await createProjectFor(client.walletAddress);
    await ProposalModel.create([
      buildProposal({ projectId: project._id, freelancerWallet: freelancer.walletAddress, coverLetter: "First valid proposal cover letter." }),
      buildProposal({ projectId: project._id, freelancerWallet: (await createAuthenticatedUser()).walletAddress, coverLetter: "Second valid proposal cover letter." })
    ]);

    const projectList = await withAuthentication(
      createRequest(app).get(`/projects/${project.id}/proposals?limit=1`),
      client.token
    ).expect(200);
    const freelancerList = await withAuthentication(
      createRequest(app).get(`/proposals/freelancers/${freelancer.walletAddress}`),
      freelancer.token
    ).expect(200);

    expect(projectList.body).toHaveLength(1);
    expect(freelancerList.body).toHaveLength(1);
    expect(freelancerList.body[0].freelancerWallet).toBe(freelancer.walletAddress);
  });

  it("allows the proposal owner to update and withdraw a pending proposal", async () => {
    const client = await createAuthenticatedUser();
    const freelancer = await createAuthenticatedUser();
    const project = await createProjectFor(client.walletAddress);
    const proposal = await ProposalModel.create(buildProposal({ projectId: project._id, freelancerWallet: freelancer.walletAddress }));

    const updated = await withAuthentication(
      withJson(createRequest(app).patch(`/proposals/${proposal.id}`)),
      freelancer.token
    )
      .send({ proposedBudget: "850" })
      .expect(200);
    const withdrawn = await withAuthentication(
      withJson(createRequest(app).post(`/proposals/${proposal.id}/withdraw`)),
      freelancer.token
    ).expect(200);

    expect(updated.body.proposedBudget).toBe("850");
    expect(withdrawn.body.status).toBe("WITHDRAWN");
  });

  it("rejects non-owner proposal updates and withdrawals before blockchain work", async () => {
    const client = await createAuthenticatedUser();
    const freelancer = await createAuthenticatedUser();
    const otherUser = await createAuthenticatedUser();
    const project = await createProjectFor(client.walletAddress);
    const proposal = await ProposalModel.create(buildProposal({ projectId: project._id, freelancerWallet: freelancer.walletAddress }));

    const update = await withAuthentication(
      withJson(createRequest(app).patch(`/proposals/${proposal.id}`)),
      otherUser.token
    )
      .send({ proposedBudget: "1" })
      .expect(500);
    const accept = await withAuthentication(
      withJson(createRequest(app).post(`/proposals/${proposal.id}/accept`)),
      otherUser.token
    )
      .send({})
      .expect(500);

    expect(update.body.message).toBe("Only proposal owner may modify proposal.");
    expect(accept.body.message).toBe("Only project owner may accept proposal.");
  });
});
