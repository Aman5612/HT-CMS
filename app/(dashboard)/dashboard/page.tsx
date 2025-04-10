"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FileText,
  Image,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  BarChart,
  Clock,
  Loader2,
  FileEdit,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleGate } from "@/components/role-gate";
import {
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

// Type definitions for analytics data
interface Analytics {
  posts: {
    total: number;
    newLastWeek: number;
    growthPercent: number;
    byStatus: {
      draft: number;
      published: number;
      archived: number;
    };
  };
  media: {
    total: number;
    newLastWeek: number;
    growthPercent: number;
  };
  users: {
    total: number;
    newLastWeek: number;
    growthPercent: number;
    byRole: {
      admin: number;
      editor: number;
      author: number;
    };
  };
  pageViews: {
    total: number;
    lastWeek: number;
    growthPercent: number;
  };
  recentPosts: {
    id: string;
    title: string;
    status: string;
    authorName: string;
    formattedDate: string;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: number;
    date: string;
    postId?: string;
  }[];
}

function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/analytics");

        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Prepare data for charts
  const postStatusData = analytics
    ? [
        { name: "Draft", value: analytics.posts.byStatus.draft },
        { name: "Published", value: analytics.posts.byStatus.published },
        { name: "Archived", value: analytics.posts.byStatus.archived },
      ].filter((item) => item.value > 0)
    : []; // Only show statuses with values > 0

  const userRoleData = analytics
    ? [
        { name: "Admin", value: analytics.users.byRole.admin },
        { name: "Editor", value: analytics.users.byRole.editor },
        { name: "Author", value: analytics.users.byRole.author },
      ]
    : [];

  // Colors for charts
  const COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];
  const STATUS_COLORS = {
    published:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    draft:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  };

  // Helper function to display growth indicators
  const renderGrowth = (percent: number) => {
    const isPositive = percent >= 0;
    return (
      <div
        className={`flex items-center ${
          isPositive ? "text-green-500" : "text-red-500"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="h-4 w-4 mr-1" />
        ) : (
          <TrendingDown className="h-4 w-4 mr-1" />
        )}
        <span className="text-xs font-medium">
          {Math.abs(percent).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || "User"}!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.refresh()}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => router.push("/dashboard/posts/new")}
          >
            <FileEdit className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {isLoading ? (
        // Loading skeleton for stats
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        // Error state
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center p-4">
              <p className="text-red-600 dark:text-red-400 mb-2">
                Failed to load dashboard data
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.refresh()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Stat cards with real data
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">
                  {analytics?.posts.total || 0}
                </div>
                {renderGrowth(analytics?.posts.growthPercent || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                +{analytics?.posts.newLastWeek || 0} new from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Files</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">
                  {analytics?.media.total || 0}
                </div>
                {renderGrowth(analytics?.media.growthPercent || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                +{analytics?.media.newLastWeek || 0} new from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">
                  {analytics?.users.total || 0}
                </div>
                {renderGrowth(analytics?.users.growthPercent || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                +{analytics?.users.newLastWeek || 0} new from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">
                  {analytics?.pageViews.total.toLocaleString() || 0}
                </div>
                {renderGrowth(analytics?.pageViews.growthPercent || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                +{analytics?.pageViews.lastWeek.toLocaleString() || 0} from last
                week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and detailed stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Post Status Distribution */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Post Status</CardTitle>
            <CardDescription>Distribution of posts by status</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={postStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={false}
                    labelLine={false}
                  >
                    {postStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} posts`, name]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderRadius: "6px",
                      padding: "10px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{
                      paddingTop: "10px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* User Role Distribution */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Distribution of users by role</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={userRoleData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  barSize={40}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.2}
                    vertical={false}
                  />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    formatter={(value, name) => [`${value} users`, name]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderRadius: "6px",
                      padding: "10px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: "top",
                      formatter: (value: number) => (value > 0 ? value : ""),
                      style: { fontSize: "12px", fill: "#666" },
                    }}
                  >
                    {userRoleData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Latest content updates</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            ) : analytics?.recentPosts && analytics.recentPosts.length > 0 ? (
              <div className="max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="space-y-2 p-4">
                  {analytics.recentPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/posts/${post.id}/edit`)
                      }
                    >
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[
                                post.status as keyof typeof STATUS_COLORS
                              ] || STATUS_COLORS.draft
                            }`}
                          >
                            {post.status}
                          </span>
                          <span>•</span>
                          <span>By {post.authorName}</span>
                          <span>•</span>
                          <span>{post.formattedDate}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-center border-t">
                <div>
                  <p className="text-muted-foreground">No posts found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push("/dashboard/posts/new")}
                  >
                    Create Your First Post
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : analytics?.recentActivity &&
              analytics.recentActivity.length > 0 ? (
              <div className="max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="p-4 space-y-3">
                  {analytics.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors ${
                        activity.postId ? "cursor-pointer" : ""
                      }`}
                      onClick={() =>
                        activity.postId
                          ? router.push(
                              `/dashboard/posts/${activity.postId}/edit`
                            )
                          : null
                      }
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {activity.type === "post-created" ? (
                          <FileText className="h-4 w-4 text-blue-500" />
                        ) : activity.type === "post-updated" ? (
                          <FileEdit className="h-4 w-4 text-amber-500" />
                        ) : activity.type === "media-uploaded" ? (
                          <Upload className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium break-words">
                          {activity.description}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {activity.date}
                          {activity.postId && (
                            <>
                              <span className="mx-1.5">•</span>
                              <span className="text-primary">View Post</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center border-t">
                <p className="text-muted-foreground">No recent activity</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push("/dashboard/posts/new")}
                >
                  Create Your First Post
                </Button>
              </div>
            )}

            <div className="p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground text-xs"
                onClick={() => router.push("/dashboard/posts")}
              >
                View All Posts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main component with role-based access control
export default function DashboardPage() {
  return (
    <RoleGate allowedRoles={["admin", "editor", "author"]} requireActive={true}>
      <DashboardContent />
    </RoleGate>
  );
}
