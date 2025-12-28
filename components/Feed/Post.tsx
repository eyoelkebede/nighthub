"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, DollarSign, Play, Pause, Volume2, VolumeX, Send, X } from "lucide-react";
import TokenGate from "./TokenGate";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useStore";
import CommentItem, { Comment } from "./CommentItem";

export interface PostData {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
  };
  content: string;
  type: 'text' | 'video-short' | 'video-long';
  mediaUrl?: string;
  thumbnailUrl?: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    tips: number;
  };
  isPremium?: boolean;
  unlockPrice?: string;
  timestamp: string;
}

export default function Post({ post }: { post: PostData }) {
  const { addEarnings, user } = useAppStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.stats.likes);
  const [isUnlocked, setIsUnlocked] = useState(!post.isPremium);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handleLike = () => {
    // Optimistic update
    if (isLiked) {
      setLikesCount(prev => prev - 1);
    } else {
      setLikesCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
    // In a real app, we would call an API here to persist the like
  };

  const handleShare = async () => {
    const shareData = {
      title: `Post by ${post.author.name}`,
      text: post.content,
      url: window.location.href // In a real app, this would be a specific post URL
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
      alert("Link copied to clipboard!");
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: user.username || "Guest",
      text: newComment,
      timestamp: "Just now",
      replies: []
    };

    setComments(prev => [comment, ...prev]);
    setNewComment("");
  };

  const handleReply = (parentId: string, text: string) => {
    const newReply: Comment = {
      id: Date.now().toString(),
      author: user.username || "Guest",
      text: text,
      timestamp: "Just now",
      replies: []
    };

    const addReplyToComments = (commentsList: Comment[]): Comment[] => {
      return commentsList.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [newReply, ...(comment.replies || [])]
          };
        } else if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyToComments(comment.replies)
          };
        }
        return comment;
      });
    };

    setComments(prev => addReplyToComments(prev));
  };

  const handleTip = () => {
    // Simulate tipping logic
    const tipAmount = 0.001; // Default tip
    // In a real app, check balance first, then deduct from sender and add to receiver
    // For now, we just simulate the "sent" action
    alert(`Tipped ${tipAmount} ETH to @${post.author.handle}`);
    // We could also call a store function to update local stats if we were the author
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className="w-full bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors"
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 overflow-hidden">
            {post.author.avatar && (
              <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-sm">{post.author.name}</span>
              {post.author.isVerified && (
                <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">@{post.author.handle} • {post.timestamp}</div>
          </div>
        </div>
        <button className="text-gray-500 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content Text */}
      {post.content && (
        <div className="px-4 pb-3 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>
      )}

      {/* Media Content */}
      {post.type !== 'text' && (
        <div className={cn(
          "relative w-full bg-black overflow-hidden",
          post.type === 'video-short' ? "aspect-[9/16] max-h-[600px]" : "aspect-video"
        )}>
          {!isUnlocked ? (
            <>
              {/* Blurred Background Preview */}
              <div 
                className="absolute inset-0 bg-cover bg-center blur-xl opacity-50"
                style={{ backgroundImage: `url(${post.thumbnailUrl || '/placeholder-blur.jpg'})` }}
              />
              <TokenGate price={post.unlockPrice || "0.01"} onUnlock={() => setIsUnlocked(true)} />
            </>
          ) : (
            <div className="relative w-full h-full group cursor-pointer" onClick={togglePlay}>
              {/* Real Video Player */}
              <video
                ref={videoRef}
                src={post.mediaUrl}
                poster={post.thumbnailUrl}
                className="w-full h-full object-cover"
                loop
                playsInline
              />
                 
                 {/* Play Button Overlay */}
                 {!isPlaying && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                     <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center pl-1">
                       <Play fill="white" className="text-white w-8 h-8" />
                     </div>
                   </div>
                 )}

                 {/* Video Controls */}
                 <div className="absolute bottom-4 right-4 z-10">
                   <button onClick={toggleMute} className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70">
                     {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                   </button>
                 </div>
            </div>
          )}
        </div>
      )}

      {/* Actions Footer */}
      <div className="p-4 flex items-center justify-between border-t border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleLike}
            className="flex items-center gap-2 group"
          >
            <div className={cn(
              "p-2 rounded-full transition-colors",
              isLiked ? "text-pink-500 bg-pink-500/10" : "text-gray-400 group-hover:bg-white/5 group-hover:text-white"
            )}>
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            </div>
            <span className={cn("text-xs font-medium", isLiked ? "text-pink-500" : "text-gray-500")}>
              {likesCount}
            </span>
          </button>

          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 group"
          >
            <div className="p-2 rounded-full text-gray-400 group-hover:bg-white/5 group-hover:text-white transition-colors">
              <MessageCircle size={20} />
            </div>
            <span className="text-xs font-medium text-gray-500">{comments.length + post.stats.comments}</span>
          </button>

          <button 
            onClick={handleShare}
            className="flex items-center gap-2 group"
          >
            <div className="p-2 rounded-full text-gray-400 group-hover:bg-white/5 group-hover:text-white transition-colors">
              <Share2 size={20} />
            </div>
          </button>
        </div>

        {/* Tipping Button */}
        <button 
          onClick={handleTip}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/30 transition-all"
        >
          <DollarSign size={14} />
          <span className="text-xs font-bold">Tip</span>
        </button>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 bg-black/20"
          >
            <div className="p-4 space-y-4">
              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim()}
                  className="p-2 bg-blue-500 rounded-xl text-white disabled:opacity-50 disabled:bg-zinc-700"
                >
                  <Send size={16} />
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {comments.length === 0 && post.stats.comments === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-4">No comments yet. Be the first!</p>
                ) : (
                  <>
                    {comments.map((comment) => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        onReply={handleReply} 
                      />
                    ))}
                    {/* Placeholder for "previous" comments if stats > 0 */}
                    {post.stats.comments > 0 && (
                      <div className="text-center pt-2">
                        <button className="text-xs text-blue-400 hover:underline">
                          View {post.stats.comments} previous comments
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
