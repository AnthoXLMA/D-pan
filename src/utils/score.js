import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";  // ⚠️ ajuste le chemin selon ton projet

export const calculateScoreFromReviews = async (
  userUid,
  expertise_materiel,
  points_experience = 0
) => {
  const q = query(collection(db, "reviews"), where("toUid", "==", userUid));
  const snap = await getDocs(q);

  const avis = snap.docs.map((d) => d.data());
  const avisScore =
    avis.length > 0
      ? (avis.reduce((a, b) => a + b.note, 0) / avis.length) * 20
      : 0;

  const matScore = Object.values(expertise_materiel).reduce(
    (sum, val) => sum + (val ? 20 : 0),
    0
  );
  const experienceScore = points_experience;

  const score_global = Math.round(
    0.4 * matScore + 0.4 * experienceScore + 0.2 * avisScore
  );

  let niveau = "Débutant 🌱";
  if (score_global > 30) niveau = "Intermédiaire ⚡";
  if (score_global > 60) niveau = "Expert 🔥";
  if (score_global > 85) niveau = "Expert confirmé 🏆";

  return { score_global, niveau };
};
