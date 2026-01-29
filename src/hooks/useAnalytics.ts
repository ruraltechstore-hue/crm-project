import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AnalyticsData {
  totalLeads: number;
  totalContacts: number;
  totalDeals: number;
  totalTasks: number;
  leadsByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  dealsByStage: { stage: string; count: number; value: number }[];
  conversionRate: number;
  totalDealValue: number;
  closedWonValue: number;
  overdueTasks: number;
  pendingTasks: number;
  recentActivities: { date: string; count: number }[];
}

export function useAnalytics(dateRange?: { start: string; end: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch leads data
        let leadsQuery = supabase.from("leads").select("id, status, source, created_at");
        if (dateRange?.start) {
          leadsQuery = leadsQuery.gte("created_at", dateRange.start);
        }
        if (dateRange?.end) {
          leadsQuery = leadsQuery.lte("created_at", dateRange.end);
        }
        const { data: leads } = await leadsQuery;

        // Fetch contacts
        let contactsQuery = supabase.from("contacts").select("id", { count: "exact" });
        if (dateRange?.start) {
          contactsQuery = contactsQuery.gte("created_at", dateRange.start);
        }
        if (dateRange?.end) {
          contactsQuery = contactsQuery.lte("created_at", dateRange.end);
        }
        const { count: totalContacts } = await contactsQuery;

        // Fetch deals
        let dealsQuery = supabase.from("deals").select("id, stage, estimated_value, confirmed_value, created_at");
        if (dateRange?.start) {
          dealsQuery = dealsQuery.gte("created_at", dateRange.start);
        }
        if (dateRange?.end) {
          dealsQuery = dealsQuery.lte("created_at", dateRange.end);
        }
        const { data: deals } = await dealsQuery;

        // Fetch tasks
        let tasksQuery = supabase.from("tasks").select("id, status, due_date");
        const { data: tasks } = await tasksQuery;

        // Calculate leads by status
        const leadsByStatus = Object.entries(
          (leads || []).reduce((acc: Record<string, number>, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
          }, {})
        ).map(([status, count]) => ({ status, count }));

        // Calculate leads by source
        const leadsBySource = Object.entries(
          (leads || []).reduce((acc: Record<string, number>, lead) => {
            acc[lead.source] = (acc[lead.source] || 0) + 1;
            return acc;
          }, {})
        ).map(([source, count]) => ({ source, count }));

        // Calculate deals by stage
        const dealsByStage = Object.entries(
          (deals || []).reduce((acc: Record<string, { count: number; value: number }>, deal) => {
            if (!acc[deal.stage]) {
              acc[deal.stage] = { count: 0, value: 0 };
            }
            acc[deal.stage].count += 1;
            acc[deal.stage].value += deal.confirmed_value || deal.estimated_value || 0;
            return acc;
          }, {})
        ).map(([stage, data]) => ({ stage, ...data }));

        // Calculate totals
        const totalLeads = leads?.length || 0;
        const convertedLeads = leads?.filter(l => l.status === "converted").length || 0;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        const totalDealValue = (deals || []).reduce(
          (sum, deal) => sum + (deal.confirmed_value || deal.estimated_value || 0),
          0
        );

        const closedWonValue = (deals || [])
          .filter(deal => deal.stage === "closed_won")
          .reduce((sum, deal) => sum + (deal.confirmed_value || deal.estimated_value || 0), 0);

        const now = new Date();
        const overdueTasks = (tasks || []).filter(
          task => task.due_date && new Date(task.due_date) < now && 
            (task.status === "pending" || task.status === "in_progress")
        ).length;

        const pendingTasks = (tasks || []).filter(
          task => task.status === "pending" || task.status === "in_progress"
        ).length;

        // Calculate recent activity (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split("T")[0];
        });

        const recentActivities = last7Days.map(date => {
          const count = (leads || []).filter(
            lead => lead.created_at.startsWith(date)
          ).length;
          return { date, count };
        });

        setData({
          totalLeads,
          totalContacts: totalContacts || 0,
          totalDeals: deals?.length || 0,
          totalTasks: tasks?.length || 0,
          leadsByStatus,
          leadsBySource,
          dealsByStage,
          conversionRate,
          totalDealValue,
          closedWonValue,
          overdueTasks,
          pendingTasks,
          recentActivities,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, dateRange?.start, dateRange?.end]);

  return { data, loading };
}
