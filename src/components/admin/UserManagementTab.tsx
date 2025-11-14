import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Key, Search, Users, Shield, UserCheck, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  must_change_password: boolean;
  last_password_change: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  last_active_at: string | null;
  conversation_count: number;
  message_count: number;
}

export const UserManagementTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [stats, setStats] = useState({ total: 0, admins: 0, facilitators: 0, active: 0 });
  const [sortBy, setSortBy] = useState<'last_active' | 'conversations' | 'messages' | 'created'>('last_active');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Get activity stats for each user
      const userIds = profiles?.map(p => p.id) || [];
      
      // Get conversation counts
      const { data: conversationStats } = await supabase
        .from('conversations')
        .select('user_id')
        .in('user_id', userIds);

      // Get message counts and last activity
      const { data: messageStats } = await supabase
        .from('messages')
        .select('conversation_id, created_at')
        .order('created_at', { ascending: false });

      // Get conversation user_ids for message mapping
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, user_id');

      // Build activity maps
      const conversationCountMap = new Map<string, number>();
      conversationStats?.forEach(c => {
        conversationCountMap.set(c.user_id, (conversationCountMap.get(c.user_id) || 0) + 1);
      });

      const conversationUserMap = new Map<string, string>();
      conversations?.forEach(c => {
        conversationUserMap.set(c.id, c.user_id);
      });

      const messageCountMap = new Map<string, number>();
      const lastActivityMap = new Map<string, string>();
      
      messageStats?.forEach(m => {
        const userId = conversationUserMap.get(m.conversation_id);
        if (userId) {
          messageCountMap.set(userId, (messageCountMap.get(userId) || 0) + 1);
          if (!lastActivityMap.has(userId) || new Date(m.created_at) > new Date(lastActivityMap.get(userId)!)) {
            lastActivityMap.set(userId, m.created_at);
          }
        }
      });

      // Combine data
      const usersWithRoles = profiles?.map(profile => {
        const roles = userRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [];
        return {
          ...profile,
          roles,
          last_sign_in_at: null,
          last_active_at: lastActivityMap.get(profile.id) || null,
          conversation_count: conversationCountMap.get(profile.id) || 0,
          message_count: messageCountMap.get(profile.id) || 0,
        };
      }) || [];

      setUsers(usersWithRoles);

      // Calculate stats
      const total = usersWithRoles.length;
      const admins = usersWithRoles.filter(u => u.roles.includes('admin')).length;
      const facilitators = usersWithRoles.filter(u => u.roles.includes('moderator')).length;
      const active = usersWithRoles.filter(u => 
        u.last_active_at && 
        new Date(u.last_active_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;

      setStats({ total, admins, facilitators, active });
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error loading users",
        description: "Failed to load user list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleResetPassword = async (user: UserProfile) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-user-password', {
        body: { user_id: user.id, expiry_days: 7 },
      });

      if (error) throw error;

      setTempPassword(data.temp_password);
      setSelectedUser(user);
      setShowPasswordDialog(true);

      toast({
        title: "Password reset successful",
        description: `Temporary password created for ${user.full_name || user.email}`,
      });

      loadUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error resetting password",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    toast({
      title: "Copied to clipboard",
      description: "Temporary password has been copied",
    });
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'moderator' | 'user', action: 'add' | 'remove') => {
    try {
      if (action === 'add') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        
        if (error) throw error;
        
        toast({
          title: "Role assigned",
          description: `${role} role has been assigned`,
        });
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        
        if (error) throw error;
        
        toast({
          title: "Role removed",
          description: `${role} role has been removed`,
        });
      }
      
      loadUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast({
        title: "Error changing role",
        description: error.message || "Failed to change role",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortBy) {
      case 'last_active':
        aVal = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
        bVal = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
        break;
      case 'conversations':
        aVal = a.conversation_count;
        bVal = b.conversation_count;
        break;
      case 'messages':
        aVal = a.message_count;
        bVal = b.message_count;
        break;
      case 'created':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
    }
    
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes('admin')) {
      return <Badge variant="destructive" className="bg-red-500">Admin</Badge>;
    }
    if (roles.includes('moderator')) {
      return <Badge variant="secondary">Facilitator</Badge>;
    }
    return <Badge variant="outline">User</Badge>;
  };

  const getStatusBadge = (user: UserProfile) => {
    if (user.must_change_password) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Must Change Password</Badge>;
    }
    
    // Check activity level
    if (user.last_active_at) {
      const daysSinceActive = (Date.now() - new Date(user.last_active_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActive <= 1) {
        return <Badge variant="outline" className="border-green-500 text-green-600">Very Active</Badge>;
      } else if (daysSinceActive <= 7) {
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Active</Badge>;
      } else if (daysSinceActive <= 30) {
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Inactive</Badge>;
      }
    }
    
    return <Badge variant="outline" className="border-gray-500 text-gray-600">No Activity</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facilitators</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.facilitators}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (30d)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
      </div>

      {/* Most Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Most Active Users</CardTitle>
          <CardDescription>Top users by message activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users
              .filter(u => u.message_count > 0)
              .sort((a, b) => b.message_count - a.message_count)
              .slice(0, 5)
              .map((user, idx) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name?.split(' ').map(n => n[0]).join('') || user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{user.full_name || user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.conversation_count} conversations
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {user.message_count} msgs
                  </Badge>
                </div>
              ))}
            {users.filter(u => u.message_count > 0).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No activity yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts and passwords</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('last_active')}
                >
                  Last Active {sortBy === 'last_active' && (sortOrder === 'desc' ? '↓' : '↑')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('conversations')}
                >
                  Conversations {sortBy === 'conversations' && (sortOrder === 'desc' ? '↓' : '↑')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('messages')}
                >
                  Messages {sortBy === 'messages' && (sortOrder === 'desc' ? '↓' : '↑')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('created')}
                >
                  Created {sortBy === 'created' && (sortOrder === 'desc' ? '↓' : '↑')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No users found</TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name?.split(' ').map(n => n[0]).join('') || user.email?.[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.roles)}</TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>
                      {user.last_active_at ? (
                        <div>
                          <div className="font-medium">
                            {formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(user.last_active_at).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.conversation_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.message_count}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage Roles</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!user.roles.includes('admin') ? (
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin', 'add')}>
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin', 'remove')}>
                                <Shield className="h-4 w-4 mr-2" />
                                Remove Admin
                              </DropdownMenuItem>
                            )}
                            {!user.roles.includes('moderator') ? (
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'moderator', 'add')}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Make Facilitator
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'moderator', 'remove')}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Remove Facilitator
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Temporary Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Generated</DialogTitle>
            <DialogDescription>
              A temporary password has been created for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <div className="text-sm text-muted-foreground mb-2">Temporary Password</div>
              <div className="font-mono text-lg font-bold">{tempPassword}</div>
            </div>
            <div className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ This password will only be shown once. Make sure to copy it and share it securely with the user.
            </div>
            <div className="text-sm text-muted-foreground">
              The user will be required to change this password upon their next login.
            </div>
            <Button onClick={copyToClipboard} className="w-full">
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};