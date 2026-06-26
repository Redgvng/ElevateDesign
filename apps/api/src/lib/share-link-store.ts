import { randomBytes } from "node:crypto";

export type ShareLink = {
  token: string;
  projectId: string;
  screenVersionId: string;
  createdAt: string;
  revokedAt: string | null;
};

export type ShareLinkStore = {
  create(projectId: string, screenVersionId: string): Promise<ShareLink>;
  /** Returns the link only when it exists and is not revoked. */
  getActive(token: string): Promise<ShareLink | null>;
  revoke(projectId: string, token: string): Promise<boolean>;
};

export function createShareToken(): string {
  return `shr_${randomBytes(24).toString("base64url")}`;
}

export function createInMemoryShareLinkStore(): ShareLinkStore {
  const links = new Map<string, ShareLink>();

  return {
    async create(projectId, screenVersionId) {
      const link: ShareLink = {
        token: createShareToken(),
        projectId,
        screenVersionId,
        createdAt: new Date().toISOString(),
        revokedAt: null,
      };
      links.set(link.token, link);
      return link;
    },

    async getActive(token) {
      const link = links.get(token);
      return link && !link.revokedAt ? link : null;
    },

    async revoke(projectId, token) {
      const link = links.get(token);
      if (!link || link.projectId !== projectId || link.revokedAt) return false;
      links.set(token, { ...link, revokedAt: new Date().toISOString() });
      return true;
    },
  };
}
