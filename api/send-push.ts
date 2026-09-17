import webPush from 'web-push';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscription, title, body, url } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Missing subscription' });

  webPush.setVapidDetails(
    'mailto:jujevin50@gmail.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  try {
    await webPush.sendNotification(subscription, JSON.stringify({ title, body, url }));
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Push error:', err);
    return res.status(500).json({ error: err.message });
  }
}
