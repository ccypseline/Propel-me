/**
 * Simple Agentic Framework for Resilient Operations
 * Enables "Loops", "Refinement", and "Self-Correction" patterns.
 */

import { base44 } from '@/api/base44Client';
import { v4 as uuidv4 } from 'uuid';

export const AgentStrategies = {
  EXPONENTIAL_BACKOFF: 'backoff',
  ADAPTIVE_FALLBACK: 'fallback',
  LINEAR_RETRY: 'linear'
};

/**
 * OBSERVABILITY & MEMORY SERVICES
 */
const AgentService = {
  async logTrace(traceData) {
    try {
      await base44.entities.AgentTrace.create(traceData);
    } catch (e) {
      console.error("Failed to save agent trace", e);
    }
  },

  async recallMemory(category, keyQuery) {
    try {
      // Simple retrieval - in a real vector DB this would be semantic
      const memories = await base44.entities.AgentMemory.list(); 
      return memories.filter(m => 
        m.category === category && 
        (m.key.includes(keyQuery) || keyQuery.includes(m.key))
      );
    } catch (e) {
      return [];
    }
  },

  async storeMemory(data) {
    try {
      await base44.entities.AgentMemory.create(data);
    } catch (e) {
      console.error("Failed to store memory", e);
    }
  },

  // --- NEW: Session & Message Services ---
  async startSession(agentName, initialState = {}) {
    try {
      return await base44.entities.AgentSession.create({
        agent_name: agentName,
        status: 'active',
        state_data: JSON.stringify(initialState),
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      });
    } catch (e) { console.error(e); return null; }
  },

  async updateSession(sessionId, status, state) {
    try {
      await base44.entities.AgentSession.update(sessionId, {
        status,
        state_data: JSON.stringify(state),
        last_active_at: new Date().toISOString()
      });
    } catch (e) { console.error(e); }
  },

  async sendMessage(from, to, content) {
    try {
      await base44.entities.AgentMessage.create({
        from_agent: from,
        to_agent: to,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        status: 'unread'
      });
    } catch (e) { console.error(e); }
  },

  async checkMessages(agentName) {
    try {
      const msgs = await base44.entities.AgentMessage.list(); // In real app, filter by to_agent
      return msgs.filter(m => m.to_agent === agentName && m.status === 'unread');
    } catch (e) { return []; }
  }
};

/**
 * Ops Helper to trigger backend functions
 */
export const AgentOps = {
    async compactContext(agentName, category) {
        return await base44.functions.invoke('agentOps', { 
            action: 'compact_context', 
            payload: { agent_name: agentName, category } 
        });
    },
    async evaluateRun(traceId) {
        return await base44.functions.invoke('agentOps', { 
            action: 'evaluate_run', 
            payload: { trace_id: traceId } 
        });
    }
};

export async function runResilientAgent({
  agentName,
  taskName,
  operation,
  strategy = AgentStrategies.EXPONENTIAL_BACKOFF,
  maxAttempts = 3,
  onThought,
  fallbacks = []
}) {
  let lastError;
  const startTime = Date.now();
  const runId = Math.random().toString(36).substring(7);
  const steps = [];

  const logStep = (type, message) => {
    const step = { timestamp: new Date().toISOString(), type, message };
    steps.push(step);
    onThought?.({ step: type, message, status: type === 'error' ? 'failed' : 'working' });
  };

  // 1. Context Loading (Memory)
  logStep('memory', `Scanning long-term memory for context on "${taskName}"...`);
  const memories = await AgentService.recallMemory('system_learning', taskName);
  if (memories.length > 0) {
    logStep('memory', `Recalled ${memories.length} relevant past insights.`);
  }

  // Primary Execution Loop
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logStep('execution', `Attempt ${attempt}/${maxAttempts}: Executing main operation...`);

      // Execute the tool/operation
      // We pass memories to the operation so it can use them
      const result = await operation(attempt, memories);
      
      logStep('success', `Operation successful.`);
      
      // Save Trace
      await AgentService.logTrace({
        run_id: runId,
        agent_name: agentName,
        task_name: taskName,
        status: 'success',
        steps: steps,
        duration_ms: Date.now() - startTime
      });

      return result;

    } catch (error) {
      lastError = error;
      logStep('error', `Attempt ${attempt} failed: ${error.message}`);

      // ANALYSIS STEP (Agent "Brain")
      const isAuthError = error.message.includes('401') || error.message.includes('403');
      
      if (isAuthError) {
        logStep('analysis', `Fatal Auth Error. Aborting.`);
        
        await AgentService.logTrace({
          run_id: runId,
          agent_name: agentName,
          task_name: taskName,
          status: 'failed',
          steps: steps,
          duration_ms: Date.now() - startTime,
          error: error.message
        });
        
        throw error;
      }

      // REFINEMENT / SELF-CORRECTION
      if (attempt === maxAttempts && fallbacks.length > 0) {
        logStep('refinement', `Primary attempts failed. Engaging ${fallbacks.length} fallback strategies...`);
        
        // Try fallbacks
        for (const fallback of fallbacks) {
          try {
            logStep('refinement', `Executing fallback: ${fallback.name}`);
            const result = await fallback.fn();
            
            logStep('success', `Fallback ${fallback.name} succeeded.`);
            
            // Record this learning for next time
            await AgentService.storeMemory({
              category: 'system_learning',
              key: taskName,
              value: `Primary failed, fallback '${fallback.name}' succeeded.`,
              source_agent: agentName,
              confidence: 0.8
            });

            await AgentService.logTrace({
              run_id: runId,
              agent_name: agentName,
              task_name: taskName,
              status: 'partial', // Success via fallback
              steps: steps,
              duration_ms: Date.now() - startTime
            });

            return result;
          } catch (fallbackError) {
            logStep('error', `Fallback ${fallback.name} failed: ${fallbackError.message}`);
          }
        }
      }

      // WAITING (Loop control)
      if (attempt < maxAttempts) {
        const delay = strategy === AgentStrategies.EXPONENTIAL_BACKOFF 
          ? Math.pow(2, attempt) * 1000 
          : 1000;
          
        logStep('wait', `Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Final Failure
  await AgentService.logTrace({
    run_id: runId,
    agent_name: agentName,
    task_name: taskName,
    status: 'failed',
    steps: steps,
    duration_ms: Date.now() - startTime,
    error: lastError.message
  });

  throw lastError;
}

/**
 * PARALLEL AGENT ORCHESTRATOR
 * Runs multiple agents concurrently
 */
export async function runParallelAgents(agents) {
  return Promise.allSettled(agents.map(config => 
    runResilientAgent({
      ...config,
      // modify onThought to include agent name prefix if needed
    })
  ));
}