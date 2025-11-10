import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Menu, Pencil, Share2, Info } from "lucide-react";
import { Conversation } from "@/types/chat";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { format, addDays } from "date-fns";
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
  const { preferences } = useUserPreferences();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [renamingConversation, setRenamingConversation] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const getRetentionInfo = (conversation: Conversation) => {
    const retentionDays = conversation.retention_days ?? preferences.default_retention_days;
    
    if (retentionDays === null) {
      return { text: "Never deleted", date: null };
    }

    const createdDate = new Date(conversation.created_at);
    const deleteDate = addDays(createdDate, retentionDays);
    
    return {
      text: `Auto-deletes on ${format(deleteDate, 'MMM d, yyyy')}`,
      date: deleteDate
    };
  };

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
          <TooltipProvider>
            <div className="space-y-0">
              {conversations.map((conversation) => {
                const retentionInfo = getRetentionInfo(conversation);
                return (
                  <div
                    key={conversation.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select conversation: ${conversation.title}`}
                    className={`group relative flex items-start gap-2 p-3 border-b border-border cursor-pointer transition-colors ${
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
                    <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start gap-1.5">
                        <span className="flex-1 text-sm leading-snug break-words">{conversation.title}</span>
                        {conversation.is_shared && (
                          <span title="Shared conversation">
                            <Share2 className="w-3 h-3 shrink-0 text-primary" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info 
                              className="w-3 h-3 shrink-0 text-muted-foreground lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-help" 
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs">{retentionInfo.text}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingConversation(conversation);
                          setNewTitle(conversation.title);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Rename</p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(conversation.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Delete</p>
                      </TooltipContent>
                    </Tooltip>
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
              );
            })}
            </div>
          </TooltipProvider>
        </ScrollArea>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renamingConversation} onOpenChange={() => setRenamingConversation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Update the conversation name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (max 100 characters)</Label>
              <Input
                id="title"
                value={newTitle}
                maxLength={100}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTitle.trim()) {
                    onRenameConversation(renamingConversation!.id, newTitle.trim().slice(0, 100));
                    setRenamingConversation(null);
                  }
                }}
                placeholder="Enter conversation title"
              />
              <p className="text-xs text-muted-foreground">
                {newTitle.length}/100 characters
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
                  onRenameConversation(renamingConversation!.id, newTitle.trim().slice(0, 100));
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
