// src/AlertsListener.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase.js";
import AcceptModal from "./AcceptModal.jsx";
import InProgressModal from "./InProgressModal.jsx";
import { toast } from "react-toastify";
import { updateUserStatus } from "./userService.js";
import { createEscrow, releaseEscrow } from "./services/escrowService";
import HelpBanner from "./HelpBanner.jsx";
import PaymentBanner from "./PaymentBanner.jsx";


export default function AlertsListener({ user, setSelectedAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [removingIds, setRemovingIds] = useState([]);
  const [acceptModal, setAcceptModal] = useState({ isOpen: false, alerte: null });
  const [inProgressModal, setInProgressModal] = useState({ isOpen: false, report: null });
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [alerteActuelle, setAlerteActuelle] = useState(null);
  const [solidaireActuel, setSolidaireActuel] = useState(null);

  // 🔥 Marquer le solidaire en ligne / hors ligne
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "solidaires", user.uid);
    updateDoc(userRef, { status: "disponible" }).catch(console.error);
    return () => updateDoc(userRef, { status: "indisponible" }).catch(console.error);
  }, [user]);

  // 🔔 Écoute des alertes reçues
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const sorted = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      const initialized = sorted.map((a) => ({ ...a, status: a.status || "en attente" }));
      setAlerts(initialized);

      const newStatus = initialized.length > 0 ? "en attente de réponse" : "disponible";
      updateDoc(doc(db, "solidaires", user.uid), { status: newStatus }).catch(console.error);
    });
    return () => unsub();
  }, [user]);

  // 🔔 Écoute des reports liés au solidaire (paiements Stripe)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "reports"), where("solidaireId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach((docSnap) => {
        const report = { id: docSnap.id, ...docSnap.data() };

        if (report.escrowStatus === "created") {
          setInProgressModal({ isOpen: true, report });
        }

        if (["released", "refunded"].includes(report.escrowStatus)) {
          setInProgressModal({ isOpen: false, report: null });
        }
      });
    });

    return () => unsub();
  }, [user]);

  const removeAlertWithAnimation = (id) => {
    setRemovingIds((prev) => [...prev, id]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setRemovingIds((prev) => prev.filter((rid) => rid !== id));
    }, 300);
  };

  const acceptAlert = async (alerte) => {
    if (!alerte?.id) return toast.error("ID de l'alerte manquant !");
    if (alerte.status === "accepté" || alerte.status === "refusé") return;

    try {
      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });
      await updateDoc(doc(db, "solidaires", user.uid), { status: "aide en cours" });

      setAcceptModal({ isOpen: true, alerte });
      toast.success("✅ Alerte acceptée !");
    } catch (err) {
      console.error("Erreur acceptation :", err);
      toast.error("❌ Une erreur est survenue lors de l’acceptation.");
    }
  };

  const rejectAlert = async (alerte) => {
    if (!alerte?.id) return toast.error("ID de l'alerte manquant !");
    if (alerte.status === "accepté" || alerte.status === "refusé") return;

    try {
      const reportRef = doc(db, "reports", alerte.reportId);
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) await updateDoc(reportRef, { status: "aide refusée" });

      await deleteDoc(doc(db, "alertes", alerte.id));
      removeAlertWithAnimation(alerte.id);

      await updateDoc(doc(db, "solidaires", user.uid), { status: "disponible" });
      await updateUserStatus(user.uid, "disponible", true, null);

      toast.info("❌ Alerte rejetée !");
    } catch (err) {
      console.error("Erreur rejet :", err);
      toast.error("❌ Une erreur est survenue lors du rejet.");
    }
  };

  // 🔑 Solidaire valide les frais et déclenche le séquestre
  const handleConfirmPricing = async (alerte, montant, fraisAnnules) => {
  if (!alerte?.reportId) return;

  try {
    const reportRef = doc(db, "reports", alerte.reportId);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      await deleteDoc(doc(db, "alertes", alerte.id));
      removeAlertWithAnimation(alerte.id);
      setAcceptModal({ isOpen: false, alerte: null });
      toast.error("⚠️ Rapport introuvable. Alerte supprimée.");
      return;
    }

    const reportData = reportSnap.data();
    const finalAmount = fraisAnnules ? 0 : montant;

    await updateDoc(reportRef, {
      status: "attente séquestre",
      helperUid: user.uid,
      helperConfirmed: true,
      frais: finalAmount,
      notificationForOwner: `🚨 Solidaire en route ! Montant : ${finalAmount} €`,
    });

    await updateUserStatus(user.uid, "aide en cours", true, alerte.reportId);

    // Crée le séquestre Stripe
    const escrowResult = await createEscrow(alerte.reportId, finalAmount, setPaymentStatus);

    if (!escrowResult.success) {
      toast.error("⚠️ Impossible de créer le paiement. Réessayez plus tard.");
      return;
    }

    // Affiche le modal InProgress pour le solidaire si séquestre créé ou montant 0
    if (escrowResult.status === "created" || finalAmount === 0) {
      setAcceptModal({ isOpen: false, alerte: null });
      setInProgressModal({ isOpen: true, report: { id: alerte.reportId, ...reportData } });
      toast.success("💰 Montant séquestré ! Vous pouvez aller aider le sinistré.");
    } else {
      toast.info("Le sinistré doit maintenant séquestrer le montant.");
    }

  } catch (err) {
    console.error("Erreur confirmation frais :", err);
    toast.error("❌ Erreur lors de la validation des frais.");
  }
};


// Exemple AlertsListener.jsx
const handleReleasePayment = async (report) => {
  if (!report?.paymentIntentId) {
    toast.error("❌ PaymentIntent ID manquant !");
    return;
  }

  await releaseEscrow(report.paymentIntentId, setPaymentStatus);
  setInProgressModal({ isOpen: false, report: null });
  toast.success("✅ Paiement libéré !");
};


  const statusColor = (status) => {
    switch (status) {
      case "accepté":
        return "#d1e7dd";
      case "refusé":
        return "#f8d7da";
      default:
        return "#fff3cd";
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <h4 className="mb-4 font-semibold text-lg">📢 Mes alertes reçues</h4>

        <AcceptModal
          isOpen={acceptModal.isOpen}
          onClose={() => setAcceptModal({ isOpen: false, alerte: null })}
          alerte={acceptModal.alerte}
          onConfirm={handleConfirmPricing}
        />

        <InProgressModal
          isOpen={inProgressModal.isOpen}
          onClose={() => setInProgressModal({ isOpen: false, report: null })}
          report={inProgressModal.report}
          solidaire={user}
          onComplete={handleReleasePayment}
        />

        {alerteActuelle && solidaireActuel && (
          <PaymentBanner
            report={alerteActuelle}
            solidaire={solidaireActuel}
            setInProgressModal={setInProgressModal}
          />
        )}
{/*
        <PaymentBanner
          report={report}
          solidaire={solidaire}
          setInProgressModal={setInProgressModal}
        />*/}

        <HelpBanner
          report={inProgressModal.report}
          onComplete={() => handleReleasePayment(inProgressModal.report?.id)}
        />

        {alerts.length === 0 ? (
          <p>Aucune alerte pour l’instant</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="p-3 rounded-lg shadow-sm"
                style={{ backgroundColor: statusColor(a.status) }}
              >
                <h5 className="font-medium">
                  🚨 {a.ownerName || a.fromUid} a signalé : {a.nature || "Panne"}
                </h5>
                <p>📍 À {a.distance || "?"} km de vous</p>
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => setSelectedAlert(a)}
                  >
                    📍 Voir sur la carte
                  </button>
                  <button
                    className="px-2 py-1 rounded text-white"
                    style={{ backgroundColor: a.status ? "#6c757d" : "green" }}
                    onClick={() => acceptAlert(a)}
                    disabled={a.status === "accepté" || a.status === "refusé"}
                  >
                    ✅ Accepter
                  </button>
                  <button
                    className="px-2 py-1 rounded text-white"
                    style={{ backgroundColor: a.status ? "#6c757d" : "red" }}
                    onClick={() => rejectAlert(a)}
                    disabled={a.status === "accepté" || a.status === "refusé"}
                  >
                    ❌ Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
