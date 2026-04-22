import RunForm from "../components/RunForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

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

export default async function HomePage() {
  const runs = await getRuns();
  return <RunForm initialRuns={runs} />;
}
