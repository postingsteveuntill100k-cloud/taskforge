import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Comment } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Send, Edit2, Trash2, Check, X } from 'lucide-react';

interface CommentSectionProps {
  taskId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ taskId }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newContent, setNewContent] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const list = await api.tasks.listComments(taskId);
        setComments(list);
      } catch (err: any) {
        addToast('error', 'Failed to load comments.');
      }
    };

    fetchComments();
  }, [taskId, addToast]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await api.tasks.addComment(taskId, { content: newContent.trim() });
      setComments((prev) => [...prev, created]);
      setNewContent('');
      addToast('success', 'Comment added.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const updated = await api.comments.update(commentId, { content: editContent.trim() });
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
      addToast('success', 'Comment updated.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.comments.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      addToast('info', 'Comment removed.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete comment.');
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        Comments ({comments.length})
      </h3>

      {/* Comment Input */}
      <form onSubmit={handleAddComment} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Write a comment..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={!newContent.trim() || isSubmitting}
            className="btn btn-primary"
            style={{ flexShrink: 0 }}
          >
            <Send size={14} />
            Post
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {comments.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
            No comments yet. Start the conversation above!
          </div>
        ) : (
          comments.map((c) => {
            const isAuthor = user?.id === c.user_id;
            const isEditing = editingId === c.id;

            return (
              <div
                key={c.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#4338ca',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {c.user?.name?.charAt(0) || 'U'}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.user?.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {isAuthor && !isEditing && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditContent(c.content);
                        }}
                        style={{ padding: 4, color: '#64748b' }}
                        title="Edit comment"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        style={{ padding: 4, color: '#ef4444' }}
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="form-input"
                      style={{ fontSize: 13, padding: '4px 8px' }}
                    />
                    <button
                      onClick={() => handleUpdateComment(c.id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="btn btn-secondary btn-sm"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {c.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
