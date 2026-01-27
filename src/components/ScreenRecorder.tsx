import React, { useState, useRef } from 'react';
import { Video, Square, Download } from 'lucide-react';

export const ScreenRecorder: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "browser" },
                audio: false,
                preferCurrentTab: true, // @ts-ignore - this is a newer standard property
                selfBrowserSurface: "include" // @ts-ignore 
            } as any);

            // Create recorder
            // Use simpler codec for better compatibility on Windows/standard players
            // Try standard webm first (usually VP8), which is more compatible than VP9
            const mime = "video/webm";

            const mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks to clear the recording icon in tab
                stream.getTracks().forEach(track => track.stop());

                const blob = new Blob(chunks, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
                a.download = `tradesync-demo-${timestamp}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setIsRecording(false);
                setRecordedChunks([]); // Clear for next time
            };

            // Handle user clicking "Stop sharing" in the browser UI
            stream.getVideoTracks()[0].onended = () => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            };

            mediaRecorder.start();
            setIsRecording(true);

        } catch (err) {
            console.error("Error starting screen recording:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    // Only show in development or if specifically enabled? 
    // For now, we'll show it always as requested by the user for their demo making.

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
            {!isRecording ? (
                <button
                    onClick={startRecording}
                    className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center group"
                    title="Record this tab"
                >
                    <Video className="w-6 h-6" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap group-hover:ml-2">
                        Record Demo
                    </span>
                </button>
            ) : (
                <button
                    onClick={stopRecording}
                    className="bg-slate-800 hover:bg-slate-900 border-2 border-red-500 text-white p-4 rounded-full shadow-lg transition-all animate-pulse flex items-center justify-center"
                    title="Stop Recording"
                >
                    <Square className="w-6 h-6 fill-red-500 text-red-500" />
                </button>
            )}
        </div>
    );
};
