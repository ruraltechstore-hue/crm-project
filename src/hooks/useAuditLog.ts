import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | "user.login"
  | "user.logout"
  | "user.signup"
  | "user.update_profile"
  | "user.update_role"
  | "user.update_status"
  | "user.password_reset_request"
  | "user.password_reset_complete"
  | "team.create"
  | "team.update"
  | "team.delete"
  | "team.add_member"
  | "team.remove_member"
  | "team.update_member_role"
  | "lead.create"
  | "lead.update"
  | "lead.delete"
  | "lead.reassign"
  | "lead.convert"
  | "contact.create"
  | "contact.update"
  | "contact.delete"
  | "deal.create"
  | "deal.update"
  | "deal.delete"
  | "deal.stage_change"
  | "deal.reassign"
  | "task.create"
  | "task.update"
  | "task.delete"
  | "task.complete"
  | "document.upload"
  | "document.delete"
  | "note.create"
  | "communication.create";

export type EntityType = 
  | "user" 
  | "team" 
  | "team_member" 
  | "profile"
  | "lead"
  | "contact"
  | "deal"
  | "task"
  | "document"
  | "note"
  | "communication";

interface LogAuditParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logAudit = useCallback(
    async ({ action, entityType, entityId, oldValues, newValues }: LogAuditParams) => {
      if (!user) {
        console.warn("Cannot log audit event: no user logged in");
        return null;
      }

      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .insert([{
            user_id: user.id,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues as Json ?? null,
            new_values: newValues as Json ?? null,
          }])
          .select("id")
          .single();

        if (error) {
          console.error("Failed to log audit event:", error);
          return null;
        }

        return data.id;
      } catch (err) {
        console.error("Error logging audit event:", err);
        return null;
      }
    },
    [user]
  );

  return { logAudit };
}
