import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string, text: string) => void;
  depth?: number;
}

export default function CommentItem({ comment, onReply, depth = 0 }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText("");
    setIsReplying(false);
    setShowReplies(true);
  };

  return (
    <div className={cn("flex flex-col", depth > 0 && "ml-3 pl-3 border-l border-white/10")}>
      <div className="flex gap-3 py-2">
        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
          {comment.author[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-white">{comment.author}</span>
            <span className="text-[10px] text-gray-500">{comment.timestamp}</span>
          </div>
          <p className="text-sm text-gray-300 mt-0.5">{comment.text}</p>
          
          <div className="flex items-center gap-4 mt-1">
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="text-[10px] text-gray-500 hover:text-white transition-colors"
            >
              Reply
            </button>
            {comment.replies && comment.replies.length > 0 && (
              <button 
                onClick={() => setShowReplies(!showReplies)}
                className="text-[10px] text-gray-500 hover:text-white transition-colors"
              >
                {showReplies ? "Hide" : "Show"} {comment.replies.length} replies
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isReplying && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="flex gap-2 mt-2 mb-2 pl-8"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.author}...`}
              className="flex-1 bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
              autoFocus
            />
            <button 
              type="submit"
              disabled={!replyText.trim()}
              className="p-1.5 bg-blue-500 rounded-lg text-white disabled:opacity-50"
            >
              <Send size={12} />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {comment.replies && showReplies && (
        <div className="space-y-2 mt-1">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              onReply={onReply} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}