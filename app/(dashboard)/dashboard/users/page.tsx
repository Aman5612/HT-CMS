"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Mail, Calendar, X, Clock, CheckCircle, User, Shield, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminCheck } from "@/components/admin-check";
import { RoleGate } from "@/components/role-gate";

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  role?: string;
  isActive?: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  used: boolean;
}

export default function UsersPage() {
  return (
    <RoleGate allowedRoles={['admin']}>
      <UsersContent />
    </RoleGate>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("author");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  
  // User management state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userIsActive, setUserIsActive] = useState(true);
  const [savingUserChanges, setSavingUserChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersResponse = await fetch("/api/users");
      const usersData = await usersResponse.json();
      // Adding default values for role and isActive if not present
      const enhancedUsers = usersData.map((user: User) => ({
        ...user,
        role: user.role || "author",
        isActive: user.isActive !== undefined ? user.isActive : true
      }));
      setUsers(enhancedUsers);

      // Fetch invitations
      const invitationsResponse = await fetch("/api/invitations");
      const invitationsData = await invitationsResponse.json();
      setInvitations(invitationsData);
      
      toast({
        title: "Data loaded",
        description: "Users and invitations loaded successfully",
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load users and invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invitation");
      }
      
      const newInvitation = await response.json();
      
      // Add new invitation to state
      setInvitations((prev) => [newInvitation, ...prev]);
      
      toast({
        title: "Success",
        description: `Invitation sent to ${email}`,
      });
      
      // Reset form and close dialog
      setEmail("");
      setRole("author");
      setOpenDialog(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      const response = await fetch("/api/invitations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to revoke invitation");
      }
      
      // Remove invitation from state
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      
      toast({
        title: "Success",
        description: "Invitation revoked successfully",
      });
    } catch (error) {
      console.error("Error revoking invitation:", error);
      toast({
        title: "Error",
        description: "Failed to revoke invitation",
        variant: "destructive",
      });
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.used) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    }
    
    if (isPast(new Date(invitation.expiresAt))) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <X className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    
    if (isToday(new Date(invitation.expiresAt))) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Expiring today
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
        <Mail className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  // Open user management dialog
  const handleManageUser = (user: User) => {
    setSelectedUser(user);
    setUserRole(user.role || "author");
    setUserIsActive(user.isActive !== undefined ? user.isActive : true);
    setUserDialogOpen(true);
    
    toast({
      description: `Managing user: ${user.email}`,
    });
  };

  // Handle user update
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setSavingUserChanges(true);
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: userRole,
          isActive: userIsActive
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }
      
      // Update user in state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, role: userRole, isActive: userIsActive } 
          : user
      ));
      
      toast({
        title: "Success",
        description: `User ${selectedUser.email} updated successfully`,
      });
      
      // Close dialog
      setUserDialogOpen(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSavingUserChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users & Invitations</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a new user</DialogTitle>
              <DialogDescription>
                Send an invitation email to add a new user to your CMS.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteUser}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <AdminCheck />
      
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Active Users</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {user.name || "Unnamed User"}
                        </p>
                        {user.isActive === false && (
                          <Badge variant="outline" className="bg-gray-200 text-gray-700">
                            Inactive
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <Shield className="h-3 w-3 mr-1" />
                          {user.role || "Author"}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mr-1" />
                        <span className="mr-4">{user.email}</span>
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleManageUser(user)}
                    >
                      Manage
                    </Button>
                  </div>
                ))}

                {!loading && users.length === 0 && (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-muted-foreground">
                      No users found
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start by inviting team members to your CMS
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invitation.email}</p>
                        {getInvitationStatus(invitation)}
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <Shield className="h-3 w-3 mr-1" />
                          {invitation.role}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          Created on {format(new Date(invitation.createdAt), "MMM d, yyyy")}
                        </span>
                        <span className="mx-2">•</span>
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          Expires on {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    {!invitation.used && !isPast(new Date(invitation.expiresAt)) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}

                {!loading && invitations.length === 0 && (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-muted-foreground">
                      No invitations found
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send an invite to add new team members
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* User management dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
            <DialogDescription>
              Update user role and status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="space-y-4 py-2">
              {selectedUser && (
                <div className="flex items-center space-x-2 p-2 bg-muted rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedUser.email}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="userRole">Role</Label>
                <Select value={userRole} onValueChange={setUserRole}>
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="author">Author</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Admin:</strong> Full access to all features
                  <br />
                  <strong>Editor:</strong> Can create and edit all content
                  <br />
                  <strong>Author:</strong> Can only view and edit their own content
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="userIsActive">Account Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive accounts cannot access the system
                  </p>
                </div>
                <Switch 
                  id="userIsActive" 
                  checked={userIsActive}
                  onCheckedChange={setUserIsActive}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingUserChanges}>
                {savingUserChanges ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
