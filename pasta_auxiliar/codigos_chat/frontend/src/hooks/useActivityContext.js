import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/* Resolve a turma a partir do estado de navegação ou da matrícula na URL.
   A busca de recuperação aproveita a rota de consulta já existente. */
export default function useActivityContext() {
  const location = useLocation();
  const initial = location.state?.activityData || null;
  const query = new URLSearchParams(location.search);
  const activityMat = query.get("activityMat") || initial?.activity_mat || "";
  const initialMatches = initial && String(initial.activity_mat) === String(activityMat);
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activityMat || initialMatches) { setLoading(false); setError(""); return; }
    let alive = true;
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`${import.meta.env.VITE_API_URL}/activities/activitiesByMat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_activities: [activityMat] }),
      signal: controller.signal
    })
      .then(async response => {
        const json = await response.json();
        if (!response.ok || json.success === false) throw new Error("Não foi possível consultar a turma.");
        const activity = (Array.isArray(json.body) ? json.body : []).find(item => String(item.activity_mat) === String(activityMat));
        if (!activity) throw new Error("Turma não encontrada.");
        return activity;
      })
      .then(activity => { if (alive) setLoaded({ mat: String(activityMat), data: activity }); })
      .catch(err => { if (alive && err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [activityMat, initialMatches]);

  const activityData = initialMatches ? initial : loaded?.mat === String(activityMat) ? loaded.data : null;
  return { activityData, activityMat, activityLoading: loading, activityError: error };
}
