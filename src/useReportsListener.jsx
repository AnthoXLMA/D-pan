import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { toast } from "react-toastify";

export default function useReportsListener(user) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!user) {
      setReports([]); // vider les rapports si pas d'utilisateur
      return;
    }

    const q = query(
      collection(db, "reports"),
      where("ownerUid", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const updatedReports = snapshot.docs.map(d => {
        const data = d.data();

        // Ajout de notified=false si le champ n'existe pas encore
        if (typeof data.notified === "undefined") {
          updateDoc(doc(db, "reports", d.id), { notified: false });
        }

        return { id: d.id, ...data };
      });

      setReports(updatedReports);

      // Vérifier les notifications à envoyer
      updatedReports.forEach(r => {
        if (r.status === "aide confirmée" && !r.notified) {
          toast.success(
            `✅ Votre demande d'aide est prise en charge par ${r.helperUid}`,
            {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              pauseOnHover: true,
              draggable: true,
              theme: "colored",
            }
          );

          // On marque comme notifié
          updateDoc(doc(db, "reports", r.id), { notified: true });
        }
      });
    });

    return () => unsub();
  }, [user]);

  return reports;
}
