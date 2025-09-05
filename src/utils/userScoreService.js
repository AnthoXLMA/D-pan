// src/utils/userScoreService.js
import { db } from "../firebase.js"; // 🔹 chemin corrigé
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";


export const recalcUserScore = async (uid) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const user = userSnap.data();
  const { expertise_materiel, points_experience, avis } = user;

  // Calcul du score matériel
  const matScore = Object.values(expertise_materiel || {}).reduce((sum, val) => sum + (val ? 20 : 0), 0);

  // Score expérience et avis
  const experienceScore = points_experience || 0;
  const avisScore = (avis?.length > 0) ? (avis.reduce((a, b) => a + b.note, 0) / avis.length) * 20 : 0;

  // Score global
  const score_global = Math.round(0.4 * matScore + 0.4 * experienceScore + 0.2 * avisScore);

  // Définition du niveau
  let niveau = "Débutant 🌱";
  if (score_global > 30) niveau = "Intermédiaire ⚡";
  if (score_global > 60) niveau = "Expert 🔥";
  if (score_global > 85) niveau = "Expert confirmé 🏆";

  // Mise à jour Firestore
  await updateDoc(userRef, { score_global, niveau });

  return { score_global, niveau };
};
