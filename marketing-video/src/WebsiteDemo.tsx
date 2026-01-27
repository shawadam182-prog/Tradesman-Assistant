import {
    AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame,
    useVideoConfig, Audio, spring, Easing, Sequence
} from 'remotion';
import React from 'react';

// ─── Scene definitions with timing matched to voiceover segments ───
// Scene durations in seconds (from voiceover + 1s gap between each)
const SCENE_TIMINGS = [
    { duration: 16.98, img: 'Homepage.png', title: 'Your Daily Brief', subtitle: 'Everything at a glance', tagline: 'One app. Your whole business.', type: 'hero' },
    { duration: 19.14, img: 'New Job Initiation.png', title: 'Job Setup', subtitle: 'Seconds to start', tagline: 'Hands-free. Hassle-free.', type: 'action', img2: 'Job Notes - Dictate or type.png' },
    { duration: 16.91, img: 'Photos - Take or upload photos straight into your job pack whilst on site.png', title: 'Photos & Materials', subtitle: 'Capture everything on site', tagline: 'Snap. Track. Done.', type: 'split', img2: 'Materials - dictate or use customisable wuick add buttons into your job pack.png' },
    { duration: 13.74, img: 'Create documents strigt into your job pack, Estimates, Quotes, Invoices.png', title: 'Professional Documents', subtitle: 'Estimates, quotes & invoices', tagline: 'Work into cash. Effortlessly.', type: 'hero' },
    { duration: 13.98, img: 'Filing Cabinet - ALL of your documents stored safecy securely and organised.png', title: 'Filing Cabinet', subtitle: 'Never lose a document', tagline: 'Searchable. Secure. Sorted.', type: 'action' },
    { duration: 15.28, img: 'Profit and loss statements.png', title: 'Financial Health', subtitle: 'Real-time P&L', tagline: 'Know where you stand.', type: 'split', img2: 'Receivables.png' },
    { duration: 14.37, img: 'VAT calculations and summary - utilising bank imports and reconciliation.png', title: 'Tax & Export', subtitle: 'VAT tracking & accountant export', tagline: 'Tax time? No sweat.', type: 'split', img2: 'Accountancy Export.png' },
    { duration: 12.54, img: 'Homepage.png', title: 'TradeSync', subtitle: 'Built for tradespeople', tagline: 'Get your time back.', type: 'finale' },
];

const FPS = 30;

// Convert timings to frame ranges
const getSceneFrames = () => {
    let currentFrame = 0;
    return SCENE_TIMINGS.map(scene => {
        const start = currentFrame;
        const frames = Math.round(scene.duration * FPS);
        currentFrame += frames;
        return { ...scene, startFrame: start, endFrame: start + frames, frames };
    });
};

const scenes = getSceneFrames();

// ─── Phone Mockup Component ───
const PhoneMockup: React.FC<{
    children: React.ReactNode;
    scale?: number;
    x?: number;
    y?: number;
    rotation?: number;
}> = ({ children, scale = 1, x = 0, y = 0, rotation = 0 }) => (
    <div style={{
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        width: 380,
        height: 780,
        borderRadius: 48,
        border: '8px solid #1e293b',
        overflow: 'hidden',
        boxShadow: '0 50px 100px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.3), inset 0 0 0 2px rgba(255,255,255,0.1)',
        background: '#0f172a',
        position: 'relative',
    }}>
        {/* Notch */}
        <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 140, height: 28, background: '#1e293b', borderRadius: '0 0 20px 20px', zIndex: 10
        }} />
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            {children}
        </div>
    </div>
);

// ─── Kinetic Text Overlay ───
const KineticText: React.FC<{
    text: string;
    frame: number;
    startFrame: number;
    sceneFrames: number;
    style?: 'tagline' | 'title' | 'subtitle';
}> = ({ text, frame, startFrame, sceneFrames, style = 'tagline' }) => {
    const localFrame = frame - startFrame;
    // Title appears early, subtitle slightly after, tagline last
    const appearAt = style === 'title' ? sceneFrames * 0.08
        : style === 'subtitle' ? sceneFrames * 0.12
        : sceneFrames * 0.4;
    const fadeOutAt = sceneFrames - 15;

    const progress = spring({
        frame: localFrame - appearAt,
        fps: FPS,
        config: { stiffness: 80, damping: 14, mass: 0.8 },
    });

    const opacity = localFrame > fadeOutAt
        ? interpolate(localFrame, [fadeOutAt, sceneFrames], [1, 0])
        : interpolate(localFrame, [appearAt, appearAt + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    const translateY = interpolate(progress, [0, 1], [40, 0]);

    const styles: Record<string, React.CSSProperties> = {
        tagline: {
            fontSize: 42, fontWeight: 900, color: 'white', letterSpacing: '-0.02em',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)', textTransform: 'uppercase' as const,
        },
        title: {
            fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-0.03em',
            textShadow: '0 4px 30px rgba(0,0,0,0.6)',
        },
        subtitle: {
            fontSize: 28, fontWeight: 600, color: '#99f6e4', letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
        },
    };

    return (
        <div style={{
            opacity, transform: `translateY(${translateY}px)`,
            ...styles[style],
            position: 'absolute', bottom: style === 'subtitle' ? 60 : style === 'title' ? 160 : 100,
            left: 80, right: 80, textAlign: 'left',
        }}>
            {text}
        </div>
    );
};

// ─── Scene Renderers ───

const HeroScene: React.FC<{ scene: typeof scenes[0]; frame: number }> = ({ scene, frame }) => {
    const localFrame = frame - scene.startFrame;
    const progress = localFrame / scene.frames;

    // Phone slides in from right
    const phoneX = interpolate(localFrame, [0, 25], [400, 0], {
        extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
    });
    const phoneScale = interpolate(localFrame, [0, 25], [0.8, 0.85], {
        extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
    });
    // Gentle float
    const floatY = Math.sin(progress * Math.PI * 2) * 8;
    // Slow zoom on screenshot
    const imgScale = interpolate(progress, [0, 1], [1, 1.15]);

    return (
        <>
            <div style={{ position: 'absolute', right: 160, top: '50%', transform: `translateY(-50%)` }}>
                <PhoneMockup scale={phoneScale} x={phoneX} y={floatY}>
                    <Img src={staticFile(scene.img)} style={{
                        width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                        transform: `scale(${imgScale})`, transformOrigin: 'top center'
                    }} />
                </PhoneMockup>
            </div>
            <KineticText text={scene.title} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="title" />
            <KineticText text={scene.subtitle!} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="subtitle" />
            <KineticText text={scene.tagline} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="tagline" />
        </>
    );
};

const ActionScene: React.FC<{ scene: typeof scenes[0]; frame: number }> = ({ scene, frame }) => {
    const localFrame = frame - scene.startFrame;
    const progress = localFrame / scene.frames;
    const midpoint = scene.frames / 2;
    const hasSecondImg = !!scene.img2;
    const showSecond = hasSecondImg && localFrame > midpoint;

    const phone1Opacity = showSecond ? interpolate(localFrame, [midpoint, midpoint + 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
    const phone2Opacity = showSecond ? interpolate(localFrame, [midpoint, midpoint + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

    const slideIn = interpolate(localFrame, [0, 20], [300, 0], {
        extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
    });
    const floatY = Math.sin(progress * Math.PI * 2) * 6;
    const imgScale = interpolate(progress, [0, 1], [1, 1.1]);

    // Single-image action: render phone directly (no collapsed container)
    if (!hasSecondImg) {
        return (
            <>
                <div style={{ position: 'absolute', right: 160, top: '50%', transform: `translateY(-50%)` }}>
                    <PhoneMockup scale={0.85} x={slideIn} y={floatY}>
                        <Img src={staticFile(scene.img)} style={{
                            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                            transform: `scale(${imgScale})`, transformOrigin: 'top center'
                        }} />
                    </PhoneMockup>
                </div>
                <KineticText text={scene.title} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="title" />
                <KineticText text={scene.tagline} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="tagline" />
            </>
        );
    }

    // Two-image action: crossfade between phones
    return (
        <>
            <div style={{ position: 'absolute', right: 160, top: '50%', transform: `translateY(-50%)` }}>
                <div style={{ position: 'relative', width: 380, height: 780 }}>
                    <div style={{ opacity: phone1Opacity, position: 'absolute', top: 0, left: 0 }}>
                        <PhoneMockup scale={0.85} x={slideIn} y={floatY}>
                            <Img src={staticFile(scene.img)} style={{
                                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                                transform: `scale(${imgScale})`, transformOrigin: 'top center'
                            }} />
                        </PhoneMockup>
                    </div>
                    <div style={{ opacity: phone2Opacity, position: 'absolute', top: 0, left: 0 }}>
                        <PhoneMockup scale={0.85} x={0} y={floatY}>
                            <Img src={staticFile(scene.img2!)} style={{
                                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                                transform: `scale(${imgScale})`, transformOrigin: 'top center'
                            }} />
                        </PhoneMockup>
                    </div>
                </div>
            </div>
            <KineticText text={scene.title} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="title" />
            <KineticText text={scene.tagline} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="tagline" />
        </>
    );
};

const SplitScene: React.FC<{ scene: typeof scenes[0]; frame: number }> = ({ scene, frame }) => {
    const localFrame = frame - scene.startFrame;
    const progress = localFrame / scene.frames;

    // Two phones side by side with staggered entry
    const phone1X = interpolate(localFrame, [0, 25], [-300, 0], {
        extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
    });
    const phone2X = interpolate(localFrame, [10, 35], [300, 0], {
        extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
    });
    const phone1Rotate = interpolate(localFrame, [0, 25], [-8, -3], { extrapolateRight: 'clamp' });
    const phone2Rotate = interpolate(localFrame, [10, 35], [8, 3], { extrapolateRight: 'clamp' });

    const floatY1 = Math.sin(progress * Math.PI * 2) * 6;
    const floatY2 = Math.cos(progress * Math.PI * 2) * 6;
    const imgScale = interpolate(progress, [0, 1], [1, 1.08]);

    return (
        <>
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: 40 }}>
                <PhoneMockup scale={0.72} x={phone1X} y={floatY1} rotation={phone1Rotate}>
                    <Img src={staticFile(scene.img)} style={{
                        width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                        transform: `scale(${imgScale})`, transformOrigin: 'top center'
                    }} />
                </PhoneMockup>
                {scene.img2 && (
                    <PhoneMockup scale={0.72} x={phone2X} y={floatY2} rotation={phone2Rotate}>
                        <Img src={staticFile(scene.img2)} style={{
                            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                            transform: `scale(${imgScale})`, transformOrigin: 'top center'
                        }} />
                    </PhoneMockup>
                )}
            </div>
            <KineticText text={scene.title} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="title" />
            <KineticText text={scene.tagline} frame={frame} startFrame={scene.startFrame} sceneFrames={scene.frames} style="tagline" />
        </>
    );
};

const FinaleScene: React.FC<{ scene: typeof scenes[0]; frame: number }> = ({ scene, frame }) => {
    const localFrame = frame - scene.startFrame;
    const progress = localFrame / scene.frames;

    // Logo scales up dramatically
    const logoScale = spring({
        frame: localFrame,
        fps: FPS,
        config: { stiffness: 60, damping: 12, mass: 1.2 },
    });

    const taglineProgress = spring({
        frame: localFrame - 30,
        fps: FPS,
        config: { stiffness: 80, damping: 14 },
    });

    const ctaProgress = spring({
        frame: localFrame - 60,
        fps: FPS,
        config: { stiffness: 100, damping: 16 },
    });

    // Subtle phone in background
    const bgPhoneOpacity = interpolate(progress, [0, 0.3], [0, 0.15], { extrapolateRight: 'clamp' });

    return (
        <>
            {/* Background phone */}
            <div style={{ position: 'absolute', right: -50, top: '50%', transform: 'translateY(-50%)', opacity: bgPhoneOpacity }}>
                <PhoneMockup scale={1} rotation={5}>
                    <Img src={staticFile(scene.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                </PhoneMockup>
            </div>

            {/* Center content */}
            <div style={{
                position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                zIndex: 10,
            }}>
                <Img src={staticFile('tradesync-logo.png')} style={{
                    width: 120, height: 120, borderRadius: 24,
                    transform: `scale(${logoScale})`,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    marginBottom: 30,
                }} />
                <div style={{
                    fontSize: 72, fontWeight: 900, color: 'white', letterSpacing: '-0.03em',
                    transform: `scale(${logoScale})`, marginBottom: 16,
                }}>
                    Trade<span style={{ color: '#14b8a6' }}>Sync</span>
                </div>
                <div style={{
                    fontSize: 28, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    transform: `translateY(${interpolate(taglineProgress, [0, 1], [30, 0])}px)`,
                    opacity: taglineProgress,
                }}>
                    Built for tradespeople. By a tradesperson.
                </div>
                <div style={{
                    marginTop: 40,
                    padding: '16px 48px',
                    background: '#14b8a6',
                    borderRadius: 16,
                    fontSize: 22,
                    fontWeight: 800,
                    color: 'white',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em',
                    transform: `translateY(${interpolate(ctaProgress, [0, 1], [30, 0])}px)`,
                    opacity: ctaProgress,
                    boxShadow: '0 10px 40px rgba(20, 184, 166, 0.4)',
                }}>
                    Start Your Free Trial →
                </div>
            </div>
        </>
    );
};

// ─── Main Composition ───

export const WebsiteDemo: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    // Find current scene
    const currentScene = scenes.find(s => frame >= s.startFrame && frame < s.endFrame) || scenes[scenes.length - 1];
    const localFrame = frame - currentScene.startFrame;

    // Scene transition (cross-fade)
    const sceneOpacity = interpolate(localFrame, [0, 12, currentScene.frames - 12, currentScene.frames], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
    });

    // Animated gradient background
    const gradientAngle = interpolate(frame, [0, durationInFrames], [135, 225]);
    const tealShift = interpolate(frame, [0, durationInFrames], [0, 30]);

    return (
        <AbsoluteFill style={{ background: '#0a0a0a' }}>
            {/* Animated dark gradient background */}
            <AbsoluteFill style={{
                background: `linear-gradient(${gradientAngle}deg, 
                    #0f172a 0%, 
                    hsl(${180 + tealShift}, 40%, 8%) 40%, 
                    #0f172a 70%, 
                    hsl(${190 + tealShift}, 50%, 6%) 100%)`,
            }} />

            {/* Subtle grid overlay */}
            <AbsoluteFill style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
                backgroundSize: '40px 40px',
            }} />

            {/* Ambient glow */}
            <div style={{
                position: 'absolute',
                width: 600, height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)',
                top: '30%', right: '10%',
                filter: 'blur(60px)',
            }} />

            {/* Audio */}
            <Audio src={staticFile('voiceover.mp3')} />

            {/* Scene content with cross-fade */}
            <AbsoluteFill style={{ opacity: sceneOpacity }}>
                {currentScene.type === 'hero' && <HeroScene scene={currentScene} frame={frame} />}
                {currentScene.type === 'action' && <ActionScene scene={currentScene} frame={frame} />}
                {currentScene.type === 'split' && <SplitScene scene={currentScene} frame={frame} />}
                {currentScene.type === 'finale' && <FinaleScene scene={currentScene} frame={frame} />}
            </AbsoluteFill>

            {/* Top bar - logo watermark */}
            <div style={{
                position: 'absolute', top: 30, left: 40,
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: currentScene.type === 'finale' ? 0 : 0.6,
            }}>
                <Img src={staticFile('tradesync-logo.png')} style={{ width: 36, height: 36, borderRadius: 8 }} />
                <span style={{ color: 'white', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Trade<span style={{ color: '#14b8a6' }}>Sync</span>
                </span>
            </div>
        </AbsoluteFill>
    );
};
