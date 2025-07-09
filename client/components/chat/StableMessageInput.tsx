import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Plus, Paperclip, Mic, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StableMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function StableMessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "اكتب رسالة...",
  className,
}: StableMessageInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // تعديل ارتفاع النص تلقائياً
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120); // حد أقصى 120px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // معالجة تغيير النص
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      adjustTextareaHeight();

      // إظهار مؤشر الكتابة
      if (newValue.trim() && !isTyping) {
        setIsTyping(true);
      } else if (!newValue.trim() && isTyping) {
        setIsTyping(false);
      }
    },
    [onChange, adjustTextareaHeight, isTyping],
  );

  // معالجة ضغط المفاتيح
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          // Shift + Enter = سطر جديد
          return;
        } else {
          // Enter = إرسال
          e.preventDefault();
          if (value.trim() && !disabled) {
            onSend();
          }
        }
      }
    },
    [value, disabled, onSend],
  );

  // معالجة التركيز
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // منع التمرير عند التركيز على ا��هواتف
    if (window.innerWidth < 768) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setShowAttachments(false);
    setShowEmoji(false);
  }, []);

  // إعداد الارتفاع عند التحميل
  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // إغلاق القوائم المنبثقة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowAttachments(false);
        setShowEmoji(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSend = useCallback(() => {
    if (value.trim() && !disabled) {
      onSend();
    }
  }, [value, disabled, onSend]);

  const emojis = [
    "😀",
    "😂",
    "😍",
    "🥰",
    "😘",
    "🤗",
    "🤔",
    "😎",
    "👍",
    "👌",
    "❤️",
    "🔥",
    "✨",
    "💯",
    "🙏",
    "💪",
  ];

  return (
    <div
      ref={containerRef}
      className={cn(
        "chat-input relative bg-slate-800/95 backdrop-blur-sm border-t border-slate-700",
        className,
      )}
    >
      {/* شريط المرفقات */}
      <AnimatePresence>
        {showAttachments && (
          <motion.div
            key="attachments"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b border-slate-700"
          >
            <div className="flex items-center gap-4 justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="flex-col h-auto py-2 px-3 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <Image size={20} />
                <span className="text-xs mt-1">صورة</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-col h-auto py-2 px-3 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <Paperclip size={20} />
                <span className="text-xs mt-1">ملف</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-col h-auto py-2 px-3 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <Mic size={20} />
                <span className="text-xs mt-1">صوت</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* شريط الرموز التعبيرية */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            key="emoji-picker"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b border-slate-700"
          >
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-lg hover:bg-slate-700"
                  onClick={() => {
                    onChange(value + emoji);
                    setShowEmoji(false);
                    textareaRef.current?.focus();
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* منطقة الكتابة */}
      <div className="p-4">
        <div
          className={cn(
            "flex items-end gap-3 bg-slate-700/50 rounded-2xl border transition-all duration-200",
            isFocused
              ? "border-blue-500 bg-slate-700/70 shadow-lg"
              : "border-slate-600",
          )}
        >
          {/* زر المرفقات */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowAttachments(!showAttachments);
              setShowEmoji(false);
            }}
            className={cn(
              "shrink-0 m-2 h-8 w-8 rounded-full transition-all duration-200",
              showAttachments
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-600",
            )}
          >
            <Plus
              size={18}
              className={cn(
                "transition-transform duration-200",
                showAttachments && "rotate-45",
              )}
            />
          </Button>

          {/* منطقة النص */}
          <div className="flex-1 py-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextChange}
              onKeyPress={handleKeyPress}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full resize-none bg-transparent text-white text-sm placeholder:text-slate-400 focus:outline-none leading-relaxed scrollbar-hide"
              style={{
                minHeight: "20px",
                maxHeight: "120px",
                fontFamily: "inherit",
              }}
              rows={1}
            />
          </div>

          {/* أزرار الرموز والإرسال */}
          <div className="flex items-center gap-1 p-2">
            {/* زر الرموز التعبيرية */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowEmoji(!showEmoji);
                setShowAttachments(false);
              }}
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-200",
                showEmoji
                  ? "bg-yellow-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-600",
              )}
            >
              <Smile size={16} />
            </Button>

            {/* زر الإرسال */}
            <Button
              type="button"
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-200 ml-1",
                value.trim() && !disabled
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  : "bg-slate-600 text-slate-400 cursor-not-allowed",
              )}
            >
              {disabled ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send size={14} />
              )}
            </Button>
          </div>
        </div>

        {/* مؤشر الكتابة */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              key="typing-indicator"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 text-xs text-slate-400"
            >
              جاري الكتابة...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
