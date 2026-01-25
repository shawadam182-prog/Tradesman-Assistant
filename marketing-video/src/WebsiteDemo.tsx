import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Sequence } from 'remotion';

export const WebsiteDemo: React.FC = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: 'white' }}>
            <Sequence from={0} durationInFrames={120}>
                <HomepageScene />
            </Sequence>
            <Sequence from={120} durationInFrames={90}>
                <DashboardScene />
            </Sequence>
            <Sequence from={210} durationInFrames={90}>
                <CustomersScene />
            </Sequence>
        </AbsoluteFill>
    );
};

const HomepageScene: React.FC = () => {
    const frame = useCurrentFrame();
    const scroll = interpolate(frame, [30, 90], [0, -1000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
        <AbsoluteFill>
            <Img src={staticFile('homepage.png')} style={{ transform: `translateY(${scroll}px)` }} />
            <div style={{ position: 'absolute', top: 50, left: 50, fontSize: 60, fontWeight: 'bold', color: 'white', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                TradeSync Info
            </div>
        </AbsoluteFill>
    );
}

const DashboardScene: React.FC = () => {
    return (
        <AbsoluteFill>
            <Img src={staticFile('dashboard.png')} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 80, fontWeight: 'bold', color: '#0f172a', textShadow: '0 0 20px white' }}>
                Powerful Dashboard
            </div>
        </AbsoluteFill>
    )
}

const CustomersScene: React.FC = () => {
    return (
        <AbsoluteFill>
            <Img src={staticFile('customers.png')} />
            <div style={{ position: 'absolute', bottom: 50, right: 50, fontSize: 50, fontWeight: 'bold', color: 'teal', background: 'white', padding: '10px 20px', borderRadius: 10 }}>
                Manage Customers
            </div>
        </AbsoluteFill>
    )
}
