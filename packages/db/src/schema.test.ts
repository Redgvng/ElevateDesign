import { describe, expect, it } from "vitest";
import {
  artifactTypeEnum,
  artifacts,
  canvasDocuments,
  generationJobs,
  generationJobStatusEnum,
  projectCreateRequests,
  projects,
  screens,
  screenVersions,
  users,
  workspaceMemberships,
  workspaces,
} from "./schema";

describe("durable database schema", () => {
  it("exports the canonical tenant and generation tables", () => {
    expect(users.id.name).toBe("id");
    expect(workspaces.id.name).toBe("id");
    expect(workspaceMemberships.workspaceId.name).toBe("workspace_id");
    expect(projects.workspaceId.name).toBe("workspace_id");
    expect(canvasDocuments.revision.name).toBe("revision");
    expect(screens.currentVersionId.name).toBe("current_version_id");
    expect(screenVersions.designSpec.name).toBe("design_spec");
    expect(generationJobs.status.name).toBe("status");
    expect(generationJobs.leaseExpiresAt.name).toBe("lease_expires_at");
    expect(artifacts.storageKey.name).toBe("storage_key");
    expect(projectCreateRequests.requestHash.name).toBe("request_hash");
  });

  it("uses constrained values for terminal domain states", () => {
    expect(generationJobStatusEnum.enumValues).toEqual([
      "queued",
      "running",
      "completed",
      "failed",
      "cancelled",
    ]);
    expect(artifactTypeEnum.enumValues).toContain("screenshot");
    expect(artifactTypeEnum.enumValues).toContain("react_zip");
  });
});
