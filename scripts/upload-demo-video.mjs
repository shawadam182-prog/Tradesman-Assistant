import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const url = 'https://jpftetfqoqabftgzkorr.supabase.co';
// We need the service role key to create buckets and upload without auth
// Let's use the anon key and rely on existing bucket policies
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // Create a public bucket for marketing assets
  const { data: bucket, error: bucketErr } = await supabase.storage.createBucket('marketing', {
    public: true,
    allowedMimeTypes: ['video/mp4', 'image/png', 'image/jpeg'],
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
  });
  
  if (bucketErr && !bucketErr.message.includes('already exists')) {
    console.error('Bucket error:', bucketErr);
    process.exit(1);
  }
  console.log('Bucket ready');

  // Upload the video
  const videoPath = 'C:\\Users\\shawa\\DEV\\Tradesman-Assistant\\marketing-video\\out\\video.mp4';
  const videoData = readFileSync(videoPath);
  
  const { data, error } = await supabase.storage
    .from('marketing')
    .upload('demo-video.mp4', videoData, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage
    .from('marketing')
    .getPublicUrl('demo-video.mp4');

  console.log('Uploaded! Public URL:', urlData.publicUrl);
}

main();
