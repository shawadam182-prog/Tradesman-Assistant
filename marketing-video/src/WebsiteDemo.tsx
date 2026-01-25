import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion';

export const WebsiteDemo: React.FC = () => {
    const frame = useCurrentFrame();

    // Scroll animation: Wait 2s (60 frames), then scroll down over 5s (150 frames)
    // Assuming a long page, we scroll up to -2000px (adjust based on actual height)
    const scroll = interpolate(
        frame,
        [60, 210],
        [0, -2000],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <AbsoluteFill style={{ backgroundColor: 'white' }}>
            <Img
                src={staticFile('homepage.png')}
                style={{
                    width: '100%',
                    // Use object-fit cover or strict width? 
                    // Since we set viewport to 1920 in capture, and composition is 1920, simple width 100% works.
                    transform: `translateY(${scroll}px)`,
                }}
            />
        </AbsoluteFill>
    );
};
