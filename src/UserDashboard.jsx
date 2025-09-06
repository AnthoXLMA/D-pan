import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { FaBolt, FaUsers, FaExclamationTriangle, FaStar } from "react-icons/fa";

function StatCard({ icon, value, label, color }) {
  return (
    <div className="bg-white p-4 rounded shadow flex items-center gap-3">
      {React.cloneElement(icon, { size: 24, className: `text-${color}-500` })}
      <div>
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-gray-500 text-sm">{label}</div>
      </div>
    </div>
  );
}

export default function UserDashboard({ user }) {
  console.log("User passed to Dashboard:", user);

  // Hooks toujours au top
  const [myReports, setMyReports] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Écoute des reports
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "reports"), where("ownerUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) =>
      setMyReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsub();
  }, [user?.uid]);

  // Écoute des alertes
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) =>
      setActiveAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsub();
  }, [user?.uid]);

  // Écoute des utilisateurs pour compter les solidaires en ligne
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setAllUsers(snapshot.docs.map((d) => d.data()));
    });
    return () => unsub();
  }, []);

  const solidairesOnline = useMemo(
    () => allUsers.filter((u) => u.online).length,
    [allUsers]
  );

  // Chargement
  if (!user) return <div className="p-6">Chargement du dashboard…</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-full">
      <h2 className="text-2xl font-bold mb-4">
        Bienvenue dans votre espace personnel, {user.username || user.email || "Utilisateur"}
      </h2>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<FaBolt />} value={myReports.length} label="Mes reports" color="yellow" />
        <StatCard
          icon={<FaExclamationTriangle />}
          value={activeAlerts.length}
          label="Alertes actives"
          color="red"
        />
        <StatCard icon={<FaUsers />} value={solidairesOnline} label="Solidaires en ligne" color="green" />
      </div>

      {/* Profil utilisateur */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="text-xl font-semibold mb-2">Profil</h3>
        <p><strong>Nom :</strong> {user.username || "Non défini"}</p>
        <p><strong>Email :</strong> {user.email || "Non défini"}</p>
        <p><strong>Rôle :</strong> {user.role || "Non défini"}</p>
        {user.materiel?.length > 0 && <p><strong>Matériel disponible :</strong> {user.materiel.join(", ")}</p>}
        <p><strong>Score global :</strong> {user.score_global || 0}</p>
        <p><strong>Points d'expérience :</strong> {user.points_experience || 0}</p>
        <p><strong>Niveau :</strong> {user.niveau || "Débutant 🌱"}</p>
        {user.currentReport && <p><strong>Report en cours :</strong> {user.currentReport}</p>}
        {user.badges?.length > 0 && (
          <p>
            <strong>Badges :</strong>{" "}
            {user.badges.map((_, i) => <FaStar key={i} className="inline text-yellow-400 mr-1" />)}
          </p>
        )}
        {user.avis?.length > 0 && <p><strong>Avis :</strong> {user.avis.length} reçus</p>}
      </div>

      {/* Reports */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Mes reports</h3>
        {myReports.length === 0 ? (
          <p className="text-gray-500">Aucun report pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {myReports.map((r) => (
              <li key={r.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                <div>
                  <div className="font-medium">{r.nature || "Report"}</div>
                  <div className="text-gray-500 text-sm">
                    Statut : <span className="font-semibold">{r.status}</span>
                  </div>
                  {r.helperUid && <div className="text-gray-500 text-sm">Helper : {r.helperUid}</div>}
                </div>
                <div className="text-gray-400 text-xs">
                  {r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Alertes */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Alertes reçues</h3>
        {activeAlerts.length === 0 ? (
          <p className="text-gray-500">Aucune alerte pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {activeAlerts.map((a) => (
              <li key={a.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                <div>
                  <div className="font-medium">Report ID : {a.reportId}</div>
                  <div className="text-gray-500 text-sm">De : {a.fromUid}</div>
                  <div className="text-gray-500 text-sm">Statut : {a.status}</div>
                </div>
                <div className="text-gray-400 text-xs">
                  {a.timestamp?.toDate ? a.timestamp.toDate().toLocaleString() : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
