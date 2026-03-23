import { supabase } from "@/integrations/supabase/client";

export interface CallRecord {
  id: string;
  customer_name: string;
  phone_number: string;
  call_date: string;
  status: "completed" | "missed" | "scheduled";
  notes: string | null;
  direction: "inbound" | "outbound";
  duration_minutes: number | null;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateCallData {
  customer_name: string;
  phone_number: string;
  call_date: string;
  status: "completed" | "missed" | "scheduled";
  notes?: string;
  direction: "inbound" | "outbound";
  duration_minutes?: number;
  lead_id?: string;
  contact_id?: string;
  deal_id?: string;
}

export type CallFilter = "all" | "today" | "this_week" | "missed" | "completed" | "scheduled";

function mapCommToCall(row: any): CallRecord {
  return {
    id: row.id,
    customer_name: row.subject || "Unknown",
    phone_number: "",
    call_date: row.scheduled_at || row.created_at,
    status: mapCallStatus(row.content),
    notes: row.content,
    direction: row.direction,
    duration_minutes: row.duration_minutes,
    lead_id: row.lead_id,
    contact_id: row.contact_id,
    deal_id: row.deal_id,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

function mapCallStatus(content: string | null): "completed" | "missed" | "scheduled" {
  if (!content) return "completed";
  const lower = content.toLowerCase();
  if (lower.includes("[status:missed]")) return "missed";
  if (lower.includes("[status:scheduled]")) return "scheduled";
  return "completed";
}

function buildStatusTag(status: string): string {
  return `[status:${status}]`;
}

function stripStatusTag(content: string | null): string {
  if (!content) return "";
  return content.replace(/\[status:(completed|missed|scheduled)\]/gi, "").trim();
}

export const callService = {
  async getCalls(userId: string): Promise<CallRecord[]> {
    const { data, error } = await supabase
      .from("communications")
      .select("*")
      .eq("type", "call")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapCommToCall);
  },

  async createCall(userId: string, callData: CreateCallData): Promise<void> {
    const contentParts: string[] = [];
    if (callData.status !== "completed") {
      contentParts.push(buildStatusTag(callData.status));
    }
    if (callData.notes) {
      contentParts.push(callData.notes);
    }

    const { error } = await supabase.from("communications").insert({
      type: "call" as const,
      direction: callData.direction,
      subject: `${callData.customer_name} - ${callData.phone_number}`,
      content: contentParts.join(" ") || null,
      duration_minutes: callData.duration_minutes || null,
      scheduled_at: callData.call_date,
      lead_id: callData.lead_id || null,
      contact_id: callData.contact_id || null,
      deal_id: callData.deal_id || null,
      created_by: userId,
    });

    if (error) throw new Error(error.message);
  },

  async updateCallStatus(callId: string, status: "completed" | "missed" | "scheduled"): Promise<void> {
    // Fetch current content
    const { data, error: fetchErr } = await supabase
      .from("communications")
      .select("content")
      .eq("id", callId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);

    const cleanContent = stripStatusTag(data?.content);
    const newContent = status === "completed"
      ? cleanContent
      : `${buildStatusTag(status)} ${cleanContent}`.trim();

    const { error } = await supabase
      .from("communications")
      .update({ content: newContent || null })
      .eq("id", callId);

    if (error) throw new Error(error.message);
  },

  async deleteCall(callId: string): Promise<void> {
    const { error } = await supabase
      .from("communications")
      .delete()
      .eq("id", callId);

    if (error) throw new Error(error.message);
  },
};
