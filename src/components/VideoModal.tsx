import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoUrl }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Video Player */}
                <div className="aspect-[9/16] md:aspect-video w-full bg-black flex items-center justify-center">
                    {/* 
                For mobile-optimized video (9:16), we want to respect its ratio 
                but not take up the whole desktop screen height unnecessarily.
                However, usually 'aspect-video' (16:9) is standard for modals.
                Since our video is 9:16 vertical, we can either:
                1. Put it in a 16:9 container with black bars (standard player feel)
                2. Make the modal vertical (like a TikTok embed).
                
                Given this is a desktop landing page primarily, a vertical modal might look odd if huge.
                Let's use a responsive container. 
            */}
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="max-h-[85vh] w-auto mx-auto shadow-2xl"
                        style={{ maxHeight: '80vh' }}
                    />
                </div>
            </div>
        </div>
    );
};
