import React from 'react';
import { StyleSheet, View } from 'react-native'; // Remotion support typical web styles but View is handy if using @remotion/layout, but standard div is safer for raw CSS
import { Img, staticFile } from 'remotion';

export const WindowFrame: React.FC<{
    children: React.ReactNode;
    style?: React.CSSProperties;
    title?: string;
}> = ({ children, style, title }) => {
    return (
        <div
            style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)', // Deep shadow
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(0,0,0,0.05)',
                ...style,
            }}
        >
            {/* Title Bar */}
            <div
                style={{
                    height: '40px',
                    background: '#f1f1f1',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '16px',
                    gap: '8px',
                    flexShrink: 0,
                }}
            >
                {/* Traffic Lights */}
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />

                {/* Optional Title */}
                {title && (
                    <div style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#888',
                        fontFamily: 'system-ui',
                        fontWeight: 600,
                        marginRight: '52px' // Balance the left padding + dots
                    }}>
                        {title}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {children}
            </div>
        </div>
    );
};
