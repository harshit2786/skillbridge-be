// Zoom Server-to-Server OAuth — creates meetings under the account's host user

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

async function getAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID!;
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    `${ZOOM_TOKEN_URL}?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom token request failed: ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface ZoomMeeting {
  id: string;          // numeric meeting ID as string
  join_url: string;    // participants use this
  start_url: string;   // host uses this to start
}

export async function createZoomMeeting(payload: {
  title: string;
  scheduledAt: Date;  // UTC Date
  duration: number;   // minutes
}): Promise<ZoomMeeting> {
  const token = await getAccessToken();

  const res = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: payload.title,
      type: 2, // scheduled meeting
      start_time: payload.scheduledAt.toISOString(),
      duration: payload.duration,
      timezone: "UTC",
      settings: {
        join_before_host: false,
        waiting_room: true,
        approval_type: 0, // automatic approval
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom meeting creation failed: ${body}`);
  }

  const data = (await res.json()) as {
    id: number;
    join_url: string;
    start_url: string;
  };

  return {
    id: String(data.id),
    join_url: data.join_url,
    start_url: data.start_url,
  };
}
