export type CollabConnection = {
  id: string;
  send(data: string): void;
};

export type CollaborationHub = {
  join(projectId: string, connection: CollabConnection): void;
  leave(projectId: string, connectionId: string): void;
  /** Broadcasts a serialized message to every peer in the room except the sender. */
  broadcast(projectId: string, fromConnectionId: string, message: unknown): void;
  roomSize(projectId: string): number;
};

/**
 * In-memory pub/sub of canvas collaboration events, scoped per project room.
 * Framework-agnostic (connections are injected) so it is unit-testable without
 * a real WebSocket server. Last-write-wins on the canvas itself is enforced by
 * the existing revision check; this only fans out live updates.
 */
export function createCollaborationHub(): CollaborationHub {
  const rooms = new Map<string, Map<string, CollabConnection>>();

  return {
    join(projectId, connection) {
      let room = rooms.get(projectId);
      if (!room) {
        room = new Map();
        rooms.set(projectId, room);
      }
      room.set(connection.id, connection);
    },

    leave(projectId, connectionId) {
      const room = rooms.get(projectId);
      if (!room) return;
      room.delete(connectionId);
      if (room.size === 0) rooms.delete(projectId);
    },

    broadcast(projectId, fromConnectionId, message) {
      const room = rooms.get(projectId);
      if (!room) return;
      const payload = JSON.stringify(message);
      for (const [id, connection] of room) {
        if (id === fromConnectionId) continue;
        try {
          connection.send(payload);
        } catch {
          // A dead connection is dropped on its own close/leave; ignore here.
        }
      }
    },

    roomSize(projectId) {
      return rooms.get(projectId)?.size ?? 0;
    },
  };
}
