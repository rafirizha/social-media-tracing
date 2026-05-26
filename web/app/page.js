import RunForm from "../components/RunForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

async function getRuns() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/runs`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}

async function getPlatforms() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/platforms`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [runs, platforms] = await Promise.all([getRuns(), getPlatforms()]);
  return <RunForm initialRuns={runs} initialPlatforms={platforms} />;
}
