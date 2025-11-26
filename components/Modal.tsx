import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const isReadyToCloseRef = useRef(false);

  useEffect(() => {
    let readyTimer: ReturnType<typeof setTimeout>;
    let exitTimer: ReturnType<typeof setTimeout>;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isReadyToCloseRef.current) {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isReadyToCloseRef.current && contentRef.current && !contentRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      setShouldRender(true);
      setIsExiting(false);
      isReadyToCloseRef.current = false;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
      
      readyTimer = setTimeout(() => {
        isReadyToCloseRef.current = true;
        document.addEventListener('mousedown', handleClickOutside);
      }, 300);
    } else if (shouldRender) {
      setIsExiting(true);
      isReadyToCloseRef.current = false;
      exitTimer = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
      }, 200);
    }

    return () => {
      clearTimeout(readyTimer);
      clearTimeout(exitTimer);
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, shouldRender]); // 移除了 isReadyToClose 依赖

  const handleClose = () => {
    // 如果还没准备好关闭，或者正在退出，忽略
    if (!isReadyToCloseRef.current && isOpen) return;
    
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
      setShouldRender(false);
    }, 200); // 等待退出动画完成
  };

  if (!shouldRender && !isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className={`fixed inset-0 z-50 flex items-end justify-center p-4 bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-200 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
      style={{ paddingBottom: 'max(4rem, calc(4rem + env(safe-area-inset-bottom)))' }}
    >
      <div 
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        className={`bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden ${
          isExiting ? 'modal-exit' : 'modal-enter'
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button 
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-4 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};