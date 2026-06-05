import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send, X, Paperclip, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'
import { socket } from '../socket'
import useAuthStore from '../store/authStore'
import { toast } from 'react-hot-toast'

const ChatWindow = ({ isOpen, onClose, recipientId, patientId, title = "Messages" }) => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const chatEndRef = useRef(null)

  const [newMessageText, setNewMessageText] = useState('')
  const [attachmentData, setAttachmentData] = useState(null)
  
  // Only fetch if open
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', recipientId],
    queryFn: () => {
      // If we know the exact recipient, get history. Otherwise get all.
      if (recipientId) return api.get(`/messages/history/${recipientId}`).then(res => res.data);
      return api.get('/messages').then(res => res.data);
    },
    enabled: isOpen && !!user?.id
  })

  // Mark unread messages as read
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const unreadMessages = messages.filter(m => m.toUserId === user.id && !m.readAt);
      unreadMessages.forEach(msg => {
        api.put(`/messages/${msg.id}/read`).catch(console.error);
      });
      if (unreadMessages.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }
    }
  }, [isOpen, messages, user.id, queryClient]);

  useEffect(() => {
    const handleNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
    socket.on('new_message', handleNewMessage)
    
    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [queryClient])

  useEffect(() => {
    if (chatEndRef.current && isOpen) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const sendMessageMutation = useMutation({
    mutationFn: async (payload) => {
      return api.messages.sendMessage(payload)
    },
    onSuccess: () => {
      setNewMessageText('')
      setAttachmentData(null)
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    onError: (err) => {
      toast.error('Failed to send message: ' + err.message)
    }
  })

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max size is 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentData({
        name: file.name,
        dataUrl: event.target.result,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessageText.trim() && !attachmentData) return;

    const payload = {
      body: newMessageText.trim() || 'Shared an attachment',
      subject: `Secure Message from ${user?.name}`,
      patientId: patientId || undefined,
      toUserId: recipientId || undefined,
      attachmentUrl: attachmentData ? attachmentData.dataUrl : undefined
    };

    sendMessageMutation.mutate(payload);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col transform animate-in slide-in-from-right duration-250">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span> Secure Encrypted Line
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {isLoading ? (
            <div className="text-center text-slate-400 p-4 text-sm">Loading messages...</div>
          ) : messages.length > 0 ? (
            // The /api/messages sorts by desc, so we reverse it for rendering chronological bottom-up
            [...messages].reverse().map((msg) => {
              const isMe = msg.fromUserId === user.id;
              
              // Only show messages matching the specific recipient if one is specified
              if (recipientId && msg.fromUserId !== recipientId && msg.toUserId !== recipientId) return null;

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
                    isMe 
                      ? 'bg-primary text-white rounded-tr-none shadow-sm' 
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80 shadow-2xs'
                  }`}>
                    {msg.attachmentUrl && (
                      <div className="mb-2 p-2 bg-black/10 rounded-lg">
                        {msg.attachmentUrl.startsWith('data:image') ? (
                          <img src={msg.attachmentUrl} alt="Attachment" className="rounded max-h-40 object-cover" />
                        ) : (
                          <a href={msg.attachmentUrl} download className="flex items-center text-xs underline">
                            <Paperclip className="h-3 w-3 mr-1" /> View Attachment
                          </a>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                      <span>{new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && msg.readAt && (
                        <CheckCircle2 className="h-3 w-3 ml-1 text-emerald-300" title={`Read at ${new Date(msg.readAt).toLocaleString()}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
              <MessageCircle className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No messages yet</p>
              <p className="text-[10px] text-slate-400/80 mt-0.5">Send a message to start securely communicating.</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Attachment Preview */}
        {attachmentData && (
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-600 flex items-center truncate max-w-[200px]">
              <Paperclip className="h-3 w-3 mr-1 text-primary" /> {attachmentData.name}
            </span>
            <button type="button" onClick={() => setAttachmentData(null)} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 flex items-end gap-2 bg-white">
          <label className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0">
            <Paperclip className="h-5 w-5" />
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
          <textarea 
            value={newMessageText}
            onChange={e => setNewMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 max-h-32 min-h-[40px] resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            rows="1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="submit"
            disabled={sendMessageMutation.isPending || (!newMessageText.trim() && !attachmentData)}
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center p-0 flex-shrink-0 shadow-sm"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ChatWindow
