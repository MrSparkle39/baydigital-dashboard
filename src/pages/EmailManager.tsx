import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Mail, Inbox, Send, Star, Trash2, Archive, RefreshCw, 
  Plus, Search, ChevronLeft, Loader2, Paperclip, Reply,
  MoreVertical, Settings, X, Bell
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailAlias {
  id: string;
  alias: string;
  domain: string;
  display_name: string | null;
  is_default: boolean | null;
}

interface EmailThread {
  id: string;
  subject: string | null;
  last_message_at: string | null;
  message_count: number | null;
  is_read: boolean | null;
  is_starred: boolean | null;
  alias_id: string | null;
  alias?: {
    id: string;
    alias: string;
    domain: string;
    display_name: string | null;
  } | null;
  latest_email?: {
    from_name: string | null;
    from_address: string;
    body_text: string | null;
    direction: string;
    to_addresses: string[];
  } | null;
}

interface Email {
  id: string;
  thread_id: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  direction: string;
  is_read: boolean | null;
  is_starred: boolean | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
}

type ViewMode = 'inbox' | 'sent' | 'starred' | 'trash';

export default function EmailManager() {
  // State
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [selectedAlias, setSelectedAlias] = useState<string>('all');
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('inbox');
  
  // Loading states
  const [isLoadingAliases, setIsLoadingAliases] = useState(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAliasId, setComposeAliasId] = useState('');
  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null);
  
  // Alias management
  const [showAddAlias, setShowAddAlias] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasDomain, setNewAliasDomain] = useState('');
  const [newAliasDisplayName, setNewAliasDisplayName] = useState('');
  const [isAddingAlias, setIsAddingAlias] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Load aliases and settings on mount
  useEffect(() => {
    loadAliases();
    loadNotificationSetting();
  }, []);

  // Load threads when alias or view changes
  useEffect(() => {
    loadThreads();
  }, [selectedAlias, viewMode]);

  const loadNotificationSetting = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('email_forward_notifications, notification_email, email')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setEmailNotificationsEnabled(data?.email_forward_notifications || false);
      setNotificationEmail(data?.notification_email || '');
      setAccountEmail(data?.email || '');
    } catch (error) {
      console.error('Error loading notification setting:', error);
    }
  };

  const saveNotificationEmail = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (notificationEmail && !emailRegex.test(notificationEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSavingEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ notification_email: notificationEmail.trim() || null })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Notification email saved');
    } catch (error) {
      console.error('Error saving notification email:', error);
      toast.error('Failed to save notification email');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const toggleNotificationSetting = async () => {
    setIsUpdatingNotifications(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newValue = !emailNotificationsEnabled;
      const { error } = await supabase
        .from('users')
        .update({ email_forward_notifications: newValue })
        .eq('id', user.id);

      if (error) throw error;
      
      setEmailNotificationsEnabled(newValue);
      toast.success(newValue ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch (error) {
      console.error('Error updating notification setting:', error);
      toast.error('Failed to update notification setting');
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const loadAliases = async () => {
    try {
      const { data, error } = await supabase
        .from('email_aliases')
        .select('*')
        .order('created_at');

      if (error) throw error;
      setAliases(data || []);
      
      if (data && data.length > 0) {
        const defaultAlias = data.find(a => a.is_default) || data[0];
        setComposeAliasId(defaultAlias.id);
      }
    } catch (error) {
      console.error('Error loading aliases:', error);
    } finally {
      setIsLoadingAliases(false);
    }
  };

  const loadThreads = async () => {
    setIsLoadingThreads(true);
    try {
      let query = supabase
        .from('email_threads')
        .select(`
          *,
          alias:email_aliases(id, alias, domain, display_name)
        `)
        .eq('is_trash', viewMode === 'trash')
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false });

      if (selectedAlias !== 'all') {
        query = query.eq('alias_id', selectedAlias);
      }

      if (viewMode === 'starred') {
        query = query.eq('is_starred', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load latest email for each thread for preview
      const threadsWithPreview = await Promise.all((data || []).map(async (thread) => {
        const { data: emails } = await supabase
          .from('emails')
          .select('from_name, from_address, body_text, direction, to_addresses')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          ...thread,
          latest_email: emails?.[0]
        };
      }));

      setThreads(threadsWithPreview);
    } catch (error) {
      console.error('Error loading threads:', error);
      toast.error('Failed to load emails');
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const loadThreadEmails = async (threadId: string) => {
    setIsLoadingEmails(true);
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setThreadEmails(data || []);

      // Mark thread as read
      await supabase
        .from('email_threads')
        .update({ is_read: true })
        .eq('id', threadId);

      // Mark all emails in thread as read
      await supabase
        .from('emails')
        .update({ is_read: true })
        .eq('thread_id', threadId);

      // Update local state
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, is_read: true } : t
      ));
    } catch (error) {
      console.error('Error loading emails:', error);
      toast.error('Failed to load conversation');
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const handleSelectThread = (thread: EmailThread) => {
    setSelectedThread(thread);
    loadThreadEmails(thread.id);
  };

  const handleSendEmail = async () => {
    if (!composeAliasId || !composeTo || !composeSubject || !composeBody) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            aliasId: composeAliasId,
            to: composeTo.split(',').map(e => e.trim()),
            subject: replyToEmail ? 
              (composeSubject.startsWith('Re:') ? composeSubject : `Re: ${composeSubject}`) : 
              composeSubject,
            body: composeBody,
            threadId: replyToEmail?.thread_id,
            replyToEmailId: replyToEmail?.id
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send');
      }

      toast.success('Email sent!');
      
      // Reset compose
      setShowCompose(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setReplyToEmail(null);
      
      // Reload threads
      loadThreads();
      
      // If replying, reload the thread emails
      if (replyToEmail?.thread_id) {
        loadThreadEmails(replyToEmail.thread_id);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = (email: Email) => {
    setReplyToEmail(email);
    setComposeTo(email.direction === 'inbound' ? email.from_address : email.to_addresses[0]);
    setComposeSubject(email.subject);
    setComposeBody(`\n\n---\nOn ${new Date(email.sent_at || email.received_at).toLocaleString()}, ${email.from_name || email.from_address} wrote:\n> ${email.body_text?.replace(/\n/g, '\n> ')}`);
    setShowCompose(true);
  };

  const handleAddAlias = async () => {
    if (!newAliasName || !newAliasDomain) {
      toast.error('Please enter alias name and domain');
      return;
    }

    setIsAddingAlias(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('email_aliases')
        .insert({
          user_id: user.id,
          alias: newAliasName.toLowerCase().replace(/[^a-z0-9]/g, ''),
          domain: newAliasDomain.toLowerCase(),
          display_name: newAliasDisplayName || newAliasName,
          is_default: aliases.length === 0
        });

      if (error) throw error;

      toast.success('Email alias created!');
      setShowAddAlias(false);
      setNewAliasName('');
      setNewAliasDomain('');
      setNewAliasDisplayName('');
      loadAliases();
    } catch (error) {
      console.error('Error adding alias:', error);
      toast.error('Failed to create alias');
    } finally {
      setIsAddingAlias(false);
    }
  };

  const toggleStar = async (threadId: string, currentValue: boolean) => {
    try {
      await supabase
        .from('email_threads')
        .update({ is_starred: !currentValue })
        .eq('id', threadId);

      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, is_starred: !currentValue } : t
      ));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const moveToTrash = async (threadId: string) => {
    try {
      await supabase
        .from('email_threads')
        .update({ is_trash: true })
        .eq('id', threadId);

      setThreads(prev => prev.filter(t => t.id !== threadId));
      setSelectedThread(null);
      toast.success('Moved to trash');
    } catch (error) {
      console.error('Error moving to trash:', error);
      toast.error('Failed to delete');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPreviewText = (text: string, maxLength = 80) => {
    if (!text) return '';
    const clean = text.replace(/\n/g, ' ').trim();
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
  };

  const unreadCount = threads.filter(t => !t.is_read).length;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4">
          <Button 
            className="w-full" 
            onClick={() => {
              setReplyToEmail(null);
              setComposeTo('');
              setComposeSubject('');
              setComposeBody('');
              setShowCompose(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
        
        <nav className="flex-1 px-2">
          <Button
            variant={viewMode === 'inbox' ? 'secondary' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => setViewMode('inbox')}
          >
            <Inbox className="h-4 w-4 mr-3" />
            Inbox
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">{unreadCount}</Badge>
            )}
          </Button>
          <Button
            variant={viewMode === 'sent' ? 'secondary' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => setViewMode('sent')}
          >
            <Send className="h-4 w-4 mr-3" />
            Sent
          </Button>
          <Button
            variant={viewMode === 'starred' ? 'secondary' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => setViewMode('starred')}
          >
            <Star className="h-4 w-4 mr-3" />
            Starred
          </Button>
          <Button
            variant={viewMode === 'trash' ? 'secondary' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => setViewMode('trash')}
          >
            <Trash2 className="h-4 w-4 mr-3" />
            Trash
          </Button>
        </nav>

        <Separator />

        {/* Aliases Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground uppercase">Email Addresses</Label>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddAlias(true)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <Select value={selectedAlias} onValueChange={setSelectedAlias}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All inboxes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All inboxes</SelectItem>
              {aliases.map(alias => (
                <SelectItem key={alias.id} value={alias.id}>
                  {alias.alias}@{alias.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {aliases.length === 0 && !isLoadingAliases && (
            <p className="text-xs text-muted-foreground mt-2">
              No email addresses yet. Click + to add one.
            </p>
          )}
        </div>

        <Separator />

        {/* Settings */}
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </Button>
        </div>
      </div>

      {/* Thread List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoadingThreads ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No emails yet</p>
            </div>
          ) : (
            threads.map(thread => (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedThread?.id === thread.id ? 'bg-muted' : ''
                } ${!thread.is_read ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-sm truncate flex-1 ${!thread.is_read ? 'font-semibold' : ''}`}>
                    {thread.latest_email?.direction === 'inbound' 
                      ? (thread.latest_email?.from_name || thread.latest_email?.from_address)
                      : `To: ${thread.latest_email?.to_addresses?.[0] || 'Unknown'}`
                    }
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDate(thread.last_message_at)}
                  </span>
                </div>
                <p className={`text-sm truncate ${!thread.is_read ? 'font-medium' : ''}`}>
                  {thread.subject}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {getPreviewText(thread.latest_email?.body_text || '')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {thread.alias && (
                    <Badge variant="outline" className="text-xs">
                      {thread.alias.alias}@
                    </Badge>
                  )}
                  {thread.message_count > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {thread.message_count}
                    </Badge>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(thread.id, thread.is_starred);
                    }}
                    className="ml-auto"
                  >
                    <Star className={`h-4 w-4 ${thread.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedThread(null)}
                  className="md:hidden"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold truncate">{selectedThread.subject}</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => toggleStar(selectedThread.id, selectedThread.is_starred)}>
                  <Star className={`h-4 w-4 ${selectedThread.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => moveToTrash(selectedThread.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {isLoadingEmails ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {threadEmails.map((email, index) => (
                    <Card key={email.id} className={email.direction === 'outbound' ? 'ml-8' : 'mr-8'}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {email.from_name || email.from_address}
                            </CardTitle>
                            <CardDescription>
                              To: {email.to_addresses?.join(', ')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(email.sent_at || email.received_at).toLocaleString()}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleReply(email)}>
                                  <Reply className="h-4 w-4 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {email.body_html ? (
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: email.body_html }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {email.body_text}
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Quick Reply */}
            <div className="p-4 border-t">
              <Button onClick={() => handleReply(threadEmails[threadEmails.length - 1])}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select an email to read</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{replyToEmail ? 'Reply' : 'New Email'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={composeAliasId} onValueChange={setComposeAliasId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sender" />
                </SelectTrigger>
                <SelectContent>
                  {aliases.map(alias => (
                    <SelectItem key={alias.id} value={alias.id}>
                      {alias.display_name || alias.alias} &lt;{alias.alias}@{alias.domain}&gt;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To</Label>
              <Input
                placeholder="recipient@example.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your message..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={10}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Alias Dialog */}
      <Dialog open={showAddAlias} onOpenChange={setShowAddAlias}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email Address</DialogTitle>
            <DialogDescription>
              Create a new email alias for your business (e.g., sales@yourbusiness.com)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alias Name</Label>
              <Input
                placeholder="e.g., hello, sales, support"
                value={newAliasName}
                onChange={(e) => setNewAliasName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                placeholder="e.g., yourbusiness.com"
                value={newAliasDomain}
                onChange={(e) => setNewAliasDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Note: You'll need to configure DNS records for this domain to receive emails
              </p>
            </div>

            <div className="space-y-2">
              <Label>Display Name (optional)</Label>
              <Input
                placeholder="e.g., Sales Team"
                value={newAliasDisplayName}
                onChange={(e) => setNewAliasDisplayName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAlias(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAlias} disabled={isAddingAlias}>
              {isAddingAlias ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Add Alias'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email Settings</DialogTitle>
            <DialogDescription>
              Customize how your email notifications work
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="email-notifications" className="font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new emails arrive
                  </p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotificationsEnabled}
                onCheckedChange={toggleNotificationSetting}
                disabled={isUpdatingNotifications}
              />
            </div>

            {emailNotificationsEnabled && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label htmlFor="notification-email" className="font-medium">
                  Notification Email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Where should we send notifications? Leave empty to use your account email ({accountEmail}).
                </p>
                <div className="flex gap-2">
                  <Input
                    id="notification-email"
                    type="email"
                    placeholder={accountEmail || "your@email.com"}
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                  />
                  <Button 
                    onClick={saveNotificationEmail} 
                    disabled={isSavingEmail}
                    size="sm"
                  >
                    {isSavingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              When enabled, you'll receive a brief notification whenever someone sends an email to your Bay Digital inbox.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
