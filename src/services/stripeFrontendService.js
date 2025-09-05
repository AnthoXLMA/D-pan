// const API_URL = "http://localhost:4242/api/stripe";
const API_URL = "http://192.168.1.42:4242/api/stripe";


export const createStripeAccountForSolidaire = async () => {
  try {
    const res = await fetch(`${API_URL}/create-account`, {
      method: "POST",
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const data = await res.json();

    return data.account;
  } catch (err) {
    console.error("❌ Erreur lors de la création du compte Stripe:", err);
    return null;
  }
};

export const getStripeDashboardLink = async (stripeAccountId) => {
  try {
    const res = await fetch(`${API_URL}/create-login-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stripeAccountId }),
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const data = await res.json();

    return data.url;
  } catch (err) {
    console.error("❌ Erreur lors de la récupération du login link:", err);
    return null;
  }
};
