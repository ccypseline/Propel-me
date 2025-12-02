/**
 * InMemorySessionService
 * Manages short-term session state in the client memory.
 */
export class SessionService {
    constructor() {
        this.sessions = new Map();
    }

    createSession(agentId) {
        const sessionId = Math.random().toString(36).substring(7);
        this.sessions.set(sessionId, {
            id: sessionId,
            agentId,
            history: [],
            context: {},
            startTime: Date.now()
        });
        return sessionId;
    }

    addMessage(sessionId, role, content) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.history.push({ role, content, timestamp: Date.now() });
        }
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    clearSession(sessionId) {
        this.sessions.delete(sessionId);
    }
}

export const sessionService = new SessionService();