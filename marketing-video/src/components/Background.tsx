import React from 'react';
import { AbsoluteFill } from 'remotion';

export const PremiumBackground: React.FC = () => {
    return (
        <AbsoluteFill
            style={{
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // Default clean
                // Option 2: "SaaS Blur"
                backgroundImage: `
                    radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
                    radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), 
                    radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)
                `,
                backgroundColor: '#111', // Dark mode premium
            }}
        >
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'transparent',
                // Could add subtle noise here or floating orbs
            }} />
        </AbsoluteFill>
    );
};
