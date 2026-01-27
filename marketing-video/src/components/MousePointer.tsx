import React from 'react';
import { Img } from 'remotion';

export const MousePointer: React.FC<{
    x: number;
    y: number;
    scale?: number;
    click?: boolean; // Changes state if clicked?
}> = ({ x, y, scale = 1 }) => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translateX(${x}px) translateY(${y}px) scale(${scale})`,
                pointerEvents: 'none',
                zIndex: 100,
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))'
            }}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 320 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    width: '32px', // Nice large visible cursor
                    height: 'auto'
                }}
            >
                {/* Standard White Cursor with Black Outline */}
                <path d="M302.189 329.126H196.105L158.752 493.53C155.731 506.845 142.062 514.975 128.847 511.954L16.299 486.273C3.085 483.253 -5.045 469.584 -2.025 456.369L56.541 198.59L0.003 162.26C-5.188 158.924 0.695 148.98 6.551 148.98H296.643C303.882 148.98 307.765 158.058 302.189 162.26L182.028 251.52L302.189 329.126Z"
                    fill="black" />
                <path d="M0 0V370.8L106.8 264H274.6L0 0Z" fill="black" /> {/* Fallback/Simple shape if needed, but lets use a standard Mac path */}
                <path
                    d="M13.4 12l216.7 200.7-93.5 6.3 64.6 153.2-34.8 14.7-64.2-152.2-68.6 69.8V12z"
                    fill="black"
                    stroke="white"
                    strokeWidth="30"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
};

// Simple cleaner cursor SVG
export const SimpleCursor = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
        }}
    >
        <path d="M5.5 3.5L11.5 19.5L14.5 12.5L21.5 9.5L5.5 3.5Z" fill="black" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    </svg>
)
