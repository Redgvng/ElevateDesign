import { describe, expect, it, vi } from "vitest";
import { createCollaborationHub, type CollabConnection } from "./collaboration-hub";

function fakeConn(id: string): CollabConnection & { sent: string[] } {
  const sent: string[] = [];
  return { id, sent, send: (data) => sent.push(data) };
}

describe("createCollaborationHub", () => {
  it("broadcasts to peers in the same room except the sender", () => {
    const hub = createCollaborationHub();
    const a = fakeConn("a");
    const b = fakeConn("b");
    const c = fakeConn("c");
    hub.join("p1", a);
    hub.join("p1", b);
    hub.join("p2", c);

    hub.broadcast("p1", "a", { type: "canvas-update", revision: 3 });

    expect(b.sent).toEqual([JSON.stringify({ type: "canvas-update", revision: 3 })]);
    expect(a.sent).toEqual([]); // sender excluded
    expect(c.sent).toEqual([]); // other room untouched
  });

  it("tracks room size and cleans up empty rooms on leave", () => {
    const hub = createCollaborationHub();
    hub.join("p1", fakeConn("a"));
    hub.join("p1", fakeConn("b"));
    expect(hub.roomSize("p1")).toBe(2);

    hub.leave("p1", "a");
    expect(hub.roomSize("p1")).toBe(1);
    hub.leave("p1", "b");
    expect(hub.roomSize("p1")).toBe(0);
  });

  it("isolates a throwing connection without breaking the broadcast", () => {
    const hub = createCollaborationHub();
    const good = fakeConn("good");
    const bad: CollabConnection = { id: "bad", send: vi.fn(() => { throw new Error("dead"); }) };
    hub.join("p1", bad);
    hub.join("p1", good);

    expect(() => hub.broadcast("p1", "x", { ping: true })).not.toThrow();
    expect(good.sent).toEqual([JSON.stringify({ ping: true })]);
  });
});
