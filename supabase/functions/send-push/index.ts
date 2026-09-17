import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const vapidPublic  = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidEmail   = Deno.env.get("VAPID_EMAIL") ?? "mailto:admin@tradingjournal.app";

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { userId, title, body, url } = await req.json();

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs?.length) {
    return new Response(JSON.stringify({ sent: 0, error: error?.message }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url })
      )
    )
  );

  // Remove expired/invalid subscriptions
  const failed = results
    .map((r, i) => (r.status === "rejected" ? subs[i].endpoint : null))
    .filter(Boolean);

  if (failed.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", failed);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;

  return new Response(JSON.stringify({ sent }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
