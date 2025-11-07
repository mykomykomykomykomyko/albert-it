import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Menu, Pencil, Share2 } from "lucide-react";
import { Conversation } from "@/types/chat";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onUpdateRetention?: (id: string, retentionDays: number | null) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ChatSidebar = ({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onUpdateRetention,
  isCollapsed = false,
  onToggleCollapse,
}: ChatSidebarProps) => {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [renamingConversation, setRenamingConversation] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newRetentionDays, setNewRetentionDays] = useState<string>("never");

  const sidebarContent = (
    <>
      <div className={`p-4 border-b border-border ${isCollapsed ? 'p-2' : ''}`}>
        {!isCollapsed && (
          <Button onClick={onNewConversation} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            {t('newChat')}
          </Button>
        )}
        {isCollapsed && (
          <Button onClick={onNewConversation} className="w-full" size="icon" variant="ghost">
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-0">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                aria-label={`Select conversation: ${conversation.title}`}
                className={`group relative flex items-center gap-2 p-3 border-b border-border cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-foreground"
                }`}
                onClick={() => {
                  onSelectConversation(conversation.id);
                  setMobileMenuOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectConversation(conversation.id);
                    setMobileMenuOpen(false);
                  }
                }}
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{conversation.title}</span>
                {conversation.is_shared && (
                  <span title="Shared conversation">
                    <Share2 className="w-3 h-3 shrink-0 text-primary" />
                  </span>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-all duration-150 hover:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingConversation(conversation);
                      setNewTitle(conversation.title);
                      setNewRetentionDays(conversation.retention_days?.toString() || "never");
                    }}
                    title="Rename conversation"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(conversation.id);
                        }}
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this conversation
                        and all its messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteConversation(conversation.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renamingConversation} onOpenChange={() => setRenamingConversation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conversation Settings</DialogTitle>
            <DialogDescription>
              Update the conversation name and retention policy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTitle.trim()) {
                    onRenameConversation(renamingConversation!.id, newTitle.trim());
                    if (onUpdateRetention) {
                      onUpdateRetention(
                        renamingConversation!.id,
                        newRetentionDays === 'never' ? null : parseInt(newRetentionDays)
                      );
                    }
                    setRenamingConversation(null);
                  }
                }}
                placeholder="Enter conversation title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention">Auto-Delete After</Label>
              <Select
                value={newRetentionDays}
                onValueChange={setNewRetentionDays}
              >
                <SelectTrigger id="retention">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never (Use Account Default)</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">365 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This conversation will be automatically deleted after the specified period (ATIA/FOIP compliance).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingConversation(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newTitle.trim()) {
                  onRenameConversation(renamingConversation!.id, newTitle.trim());
                  if (onUpdateRetention) {
                    onUpdateRetention(
                      renamingConversation!.id,
                      newRetentionDays === 'never' ? null : parseInt(newRetentionDays)
                    );
                  }
                  setRenamingConversation(null);
                }
              }}
              disabled={!newTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 border-t border-border">
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            className={isCollapsed ? "w-full" : "w-full justify-start"}
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 w-4 mr-2" />
                {t('collapse')}
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex border-r border-border bg-card flex-col shrink-0 transition-all duration-300 ${isCollapsed ? 'w-14' : 'w-64'}`}>
        {sidebarContent}
      </div>

      {/* Mobile Menu Button - Fixed position */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-20 left-4 z-40 bg-card border border-border shadow-lg"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{t('conversations')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col overflow-hidden">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ChatSidebar;
