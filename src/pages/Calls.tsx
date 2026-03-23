import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { callService, CallRecord, CreateCallData, CallFilter } from "@/services/callService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Plus,
  Search,
  Check,
  X,
  Trash2,
  Clock,
  CalendarDays,
} from "lucide-react";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

export default function Calls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CallFilter>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState<"completed" | "missed" | "scheduled">("completed");
  const [formDirection, setFormDirection] = useState<"inbound" | "outbound">("outbound");
  const [formDuration, setFormDuration] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchCalls = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await callService.getCalls(user.id);
      setCalls(data);
    } catch (err: any) {
      toast({ title: "Error loading calls", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const filteredCalls = useMemo(() => {
    let result = calls;
    if (filter === "today") result = result.filter((c) => isToday(parseISO(c.call_date)));
    else if (filter === "this_week") result = result.filter((c) => isThisWeek(parseISO(c.call_date)));
    else if (filter === "missed") result = result.filter((c) => c.status === "missed");
    else if (filter === "completed") result = result.filter((c) => c.status === "completed");
    else if (filter === "scheduled") result = result.filter((c) => c.status === "scheduled");

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q) ||
          c.phone_number.toLowerCase().includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [calls, filter, search]);

  const stats = useMemo(() => ({
    total: calls.length,
    completed: calls.filter((c) => c.status === "completed").length,
    missed: calls.filter((c) => c.status === "missed").length,
    scheduled: calls.filter((c) => c.status === "scheduled").length,
  }), [calls]);

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormDate("");
    setFormStatus("completed");
    setFormDirection("outbound");
    setFormDuration("");
    setFormNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formName.trim() || !formPhone.trim()) {
      toast({ title: "Validation error", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await callService.createCall(user.id, {
        customer_name: formName.trim(),
        phone_number: formPhone.trim(),
        call_date: formDate || new Date().toISOString(),
        status: formStatus,
        direction: formDirection,
        duration_minutes: formDuration ? parseInt(formDuration) : undefined,
        notes: formNotes.trim() || undefined,
      });
      toast({ title: "Call logged successfully" });
      resetForm();
      setDialogOpen(false);
      fetchCalls();
    } catch (err: any) {
      toast({ title: "Error logging call", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (callId: string, status: "completed" | "missed" | "scheduled") => {
    try {
      await callService.updateCallStatus(callId, status);
      toast({ title: `Call marked as ${status}` });
      fetchCalls();
    } catch (err: any) {
      toast({ title: "Error updating call", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (callId: string) => {
    try {
      await callService.deleteCall(callId);
      toast({ title: "Call deleted" });
      fetchCalls();
    } catch (err: any) {
      toast({ title: "Error deleting call", description: err.message, variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default"><Check className="mr-1 h-3 w-3" />Completed</Badge>;
      case "missed":
        return <Badge variant="destructive"><PhoneMissed className="mr-1 h-3 w-3" />Missed</Badge>;
      case "scheduled":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call Management</h1>
          <p className="text-muted-foreground">Track and manage all call activities</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log Call
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <PhoneCall className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed</CardTitle>
            <PhoneOff className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.missed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as CallFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Calls</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Phone className="h-5 w-5 text-muted-foreground" />}
                title="No calls found"
                description={search || filter !== "all" ? "Try adjusting your filters" : "Log your first call to get started"}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => {
                  const parts = call.customer_name.split(" - ");
                  const name = parts[0] || "Unknown";
                  const phone = parts[1] || call.phone_number;
                  const cleanNotes = call.notes
                    ? call.notes.replace(/\[status:(completed|missed|scheduled)\]/gi, "").trim()
                    : "";

                  return (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{phone}</TableCell>
                      <TableCell>
                        {call.call_date
                          ? format(parseISO(call.call_date), "MMM d, yyyy h:mm a")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{call.direction}</Badge>
                      </TableCell>
                      <TableCell>{statusBadge(call.status)}</TableCell>
                      <TableCell>
                        {call.duration_minutes ? `${call.duration_minutes} min` : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{cleanNotes || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {call.status !== "completed" && (
                            <Button size="icon" variant="ghost" title="Mark Completed" onClick={() => handleStatusChange(call.id, "completed")}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {call.status !== "missed" && (
                            <Button size="icon" variant="ghost" title="Mark Missed" onClick={() => handleStatusChange(call.id, "missed")}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Delete" onClick={() => handleDelete(call.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Call Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+1 234 567 890" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Call Date & Time</Label>
                <Input type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" min="0" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={formDirection} onValueChange={(v) => setFormDirection(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Call notes..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Call"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
