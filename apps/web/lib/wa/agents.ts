import type { WaAgentRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WaError } from "./errors";

/**
 * Inbox seats.
 *
 * An agent is a person at the *tenant* — a librarian, a clinic receptionist —
 * not a Glitchgrab user. They are addressed by the platform's own user id, the
 * same indirection tenants use, so the platform never learns our ids and we
 * never resolve their staff to accounts on our side.
 */

interface AgentInput {
  externalAgentId: string;
  name: string;
  email?: string;
  role?: WaAgentRole;
  active?: boolean;
}

export async function upsertAgent(tenantId: string, input: AgentInput) {
  if (!input.externalAgentId?.trim()) {
    throw new WaError("INVALID_AMOUNT", "externalAgentId is required", 400);
  }
  if (!input.name?.trim()) throw new WaError("INVALID_AMOUNT", "name is required", 400);

  return prisma.waAgent.upsert({
    where: {
      tenantId_externalAgentId: { tenantId, externalAgentId: input.externalAgentId.trim() },
    },
    create: {
      tenantId,
      externalAgentId: input.externalAgentId.trim(),
      name: input.name.trim(),
      email: input.email?.trim(),
      role: input.role ?? "AGENT",
      active: input.active ?? true,
    },
    update: {
      name: input.name.trim(),
      email: input.email?.trim(),
      ...(input.role ? { role: input.role } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    select: { id: true, externalAgentId: true, name: true, email: true, role: true, active: true },
  });
}

export function listAgents(tenantId: string, includeInactive = false) {
  return prisma.waAgent.findMany({
    where: { tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: { name: "asc" },
    select: { id: true, externalAgentId: true, name: true, email: true, role: true, active: true },
  });
}

/**
 * Deactivates rather than deletes.
 *
 * Conversations carry `assignedAgentId`, and a hard delete would leave those
 * rows pointing at nothing — the inbox would show assignments to a blank name
 * and the history of who handled what would be gone.
 */
export async function deactivateAgent(tenantId: string, agentId: string) {
  const { count } = await prisma.waAgent.updateMany({
    where: { id: agentId, tenantId },
    data: { active: false },
  });
  if (count === 0) throw new WaError("TENANT_NOT_FOUND", "No such agent", 404);

  // Unassign their open threads so nothing is stranded with a departed agent.
  await prisma.waConversation.updateMany({
    where: { tenantId, assignedAgentId: agentId, status: { not: "CLOSED" } },
    data: { assignedAgentId: null },
  });
}

/**
 * Resolves an assignment target, or throws.
 *
 * Called before writing `assignedAgentId` so a platform cannot assign one
 * tenant's conversation to another tenant's agent by passing a foreign id.
 */
export async function requireAgent(tenantId: string, agentId: string) {
  const agent = await prisma.waAgent.findFirst({
    where: { id: agentId, tenantId, active: true },
    select: { id: true, name: true },
  });
  if (!agent) throw new WaError("TENANT_NOT_FOUND", "No such agent on this account", 404);
  return agent;
}
