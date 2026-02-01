import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Task, TaskFormData, TaskStatus } from "@/types/tasks";

export function useTasks(filters?: {
  leadId?: string;
  contactId?: string;
  dealId?: string;
  status?: TaskStatus;
  assignedTo?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAudit } = useAuditLog();

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          lead:leads(id, name),
          contact:contacts(id, first_name, last_name),
          deal:deals(id, name)
        `)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (filters?.leadId) {
        query = query.eq("lead_id", filters.leadId);
      }
      if (filters?.contactId) {
        query = query.eq("contact_id", filters.contactId);
      }
      if (filters?.dealId) {
        query = query.eq("deal_id", filters.dealId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch assignee and creator profiles
      const userIds = [...new Set([
        ...(data || []).map(t => t.assigned_to),
        ...(data || []).map(t => t.created_by),
      ])];
      
      let profileMap = new Map<string, { id: string; full_name: string | null; email: string }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }
      
      // Map to Task type
      const mappedTasks: Task[] = (data || []).map(task => ({
        ...task,
        assignee: profileMap.get(task.assigned_to) || null,
        creator: profileMap.get(task.created_by) || null,
      }));
      
      setTasks(mappedTasks);
    } catch (error: any) {
      toast({
        title: "Error fetching tasks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, filters?.leadId, filters?.contactId, filters?.dealId, filters?.status, filters?.assignedTo, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (data: TaskFormData) => {
    if (!user) return;

    try {
      const { data: newTask, error } = await supabase.from("tasks").insert({
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        due_date: data.due_date || null,
        reminder_at: data.reminder_at || null,
        lead_id: data.lead_id || null,
        contact_id: data.contact_id || null,
        deal_id: data.deal_id || null,
        assigned_to: data.assigned_to,
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      await logAudit({
        action: "task.create",
        entityType: "task",
        entityId: newTask.id,
        newValues: data as unknown as Record<string, unknown>,
      });

      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!user) return;

    try {
      const updateData: any = { status };
      
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user.id;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      if (status === "completed") {
        await logAudit({
          action: "task.complete",
          entityType: "task",
          entityId: taskId,
        });
      }

      toast({
        title: "Task updated",
        description: `Task marked as ${status.replace("_", " ")}.`,
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTask = async (taskId: string, data: Partial<TaskFormData>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: data.title,
          description: data.description,
          priority: data.priority,
          due_date: data.due_date,
          reminder_at: data.reminder_at,
          lead_id: data.lead_id,
          contact_id: data.contact_id,
          deal_id: data.deal_id,
          assigned_to: data.assigned_to,
        })
        .eq("id", taskId);

      if (error) throw error;

      await logAudit({
        action: "task.update",
        entityType: "task",
        entityId: taskId,
        newValues: data as unknown as Record<string, unknown>,
      });

      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    refetch: fetchTasks,
  };
}

export function useOverdueTasks() {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOverdueTasks = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("tasks")
          .select(`
            *,
            lead:leads(id, name),
            contact:contacts(id, first_name, last_name),
            deal:deals(id, name)
          `)
          .lt("due_date", new Date().toISOString())
          .in("status", ["pending", "in_progress"])
          .order("due_date", { ascending: true });

        if (error) throw error;
        
        const mappedTasks: Task[] = (data || []).map(task => ({
          ...task,
          assignee: null,
          creator: null,
        }));
        
        setOverdueTasks(mappedTasks);
      } catch (error) {
        console.error("Error fetching overdue tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueTasks();
  }, [user]);

  return { overdueTasks, loading };
}
