const root = `${import.meta.env.VITE_API_URL}/dashboard`;

const dashboardServices = {
  async getSummary({ signal } = {}) {
    const response = await fetch(`${root}/summary`, { signal });
    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(typeof result?.body === "string" ? result.body : result?.message || "Não foi possível carregar o painel.");
    }
    return result?.body ?? result;
  }
};

export default dashboardServices;
