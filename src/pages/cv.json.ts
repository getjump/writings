import { profile } from "../lib/profile";

export function GET() {
  return new Response(JSON.stringify(profile, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
