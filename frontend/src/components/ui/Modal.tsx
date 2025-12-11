import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
    showCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md', showCloseButton = true }: ModalProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            onClose();
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 pb-0 md:p-4">
                        <motion.div
                            initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            drag={isMobile ? "y" : false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.2 }}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "bg-[#0A0A0A] border border-[#27272a] shadow-2xl glass-panel",
                                "w-full pointer-events-auto flex flex-col",
                                isMobile
                                    ? "h-auto max-h-[85vh] rounded-t-[20px] absolute bottom-0"
                                    : `h-auto rounded-lg relative ${maxWidth}`
                            )}
                        >
                            {/* Mobile Drag Indicator */}
                            {isMobile && (
                                <div className="w-full flex justify-center pt-3 pb-1">
                                    <div className="w-12 h-1.5 rounded-full bg-zinc-800" />
                                </div>
                            )}

                            {/* Header */}
                            {(title || showCloseButton) && (
                                <div className={cn("flex items-center justify-between px-6 py-4 border-b border-white/5", isMobile && !title && "border-none pt-0")}>
                                    {title && (
                                        <h3 className="text-lg font-semibold tracking-tight text-white">
                                            {title}
                                        </h3>
                                    )}
                                    {showCloseButton && !isMobile && (
                                        <button
                                            onClick={onClose}
                                            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="p-6 pt-0 mt-auto">
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
