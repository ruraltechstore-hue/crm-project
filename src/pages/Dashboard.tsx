import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, TrendingUp, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const { profile, role } = useAuth();

  const stats = [
    {
      title: "Total Contacts",
      value: "—",
      description: "No data yet",
      icon: Users,
      trend: null,
    },
    {
      title: "Active Deals",
      value: "—",
      description: "No data yet",
      icon: Building2,
      trend: null,
    },
    {
      title: "Revenue",
      value: "—",
      description: "No data yet",
      icon: TrendingUp,
      trend: null,
    },
    {
      title: "Conversion Rate",
      value: "—",
      description: "No data yet",
      icon: BarChart3,
      trend: null,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="crm-page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {profile?.full_name || "User"}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {role || "user"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="crm-stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest CRM activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <p>No recent activity</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <p>Add business modules to enable actions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
