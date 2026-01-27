import { Composition } from 'remotion';
import { WebsiteDemo } from './WebsiteDemo';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="WebsiteDemo"
                component={WebsiteDemo}
                durationInFrames={3720} // 124 seconds at 30fps (voiceover ~122s + 2s buffer)
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
