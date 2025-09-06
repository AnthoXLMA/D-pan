import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "./firebase.js";
import PaymentBanner from "./PaymentBanner.jsx";
import PayButton from "./PayButton.jsx";
import AcceptModal from "./AcceptModal.jsx";
import InProgressModal from "./InProgressModal.jsx";
import { getDistanceKm } from "./utils/distance.js";
import ModalHelperList from "./ModalHelperList.jsx";
import { MATERIEL_OPTIONS } from "./constants/materiel.js";
import { collection, getDocs } from "firebase/firestore";  // ✅ ajoute ça


// === Icônes ===
const currentUserIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/?size=100&id=19608&format=png&color=000000",
  iconSize: [60, 60],
});

const reportIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/?size=100&id=5tH5sHqq0t2q&format=png&color=000000",
  iconSize: [50, 50],
});

const getSolidaireIconWithBadge = (status, pendingAlertsCount) => {
  let baseIconUrl;
  switch (status) {
    case "alerted":
      baseIconUrl = "https://img.icons8.com/?size=100&id=I24lanX6Nq71&format=png&color=000000";
      break;
    case "busy":
      baseIconUrl = "https://img.icons8.com/?size=100&id=111638&format=png&color=000000";
      break;
    case "offline":
      baseIconUrl = "https://img.icons8.com/?size=100&id=7819&format=png&color=4D4D4D";
      break;
    default:
      baseIconUrl = "https://img.icons8.com/?size=100&id=hwOJ5x33ywg6&format=png&color=000000";
  }

  if (!pendingAlertsCount) return new L.Icon({ iconUrl: baseIconUrl, iconSize: [30, 30] });

  return L.divIcon({
    className: "solidaire-badge-icon",
    html: `<div style="position: relative; display: inline-block;">
            <img src="${baseIconUrl}" style="width:35px;height:35px;"/>
            <span class="pulse-badge">${pendingAlertsCount}</span>
           </div>`,
    iconSize: [35, 35],
    iconAnchor: [18, 18],
  });
};

// === Utilitaire distance (Haversine) ===
// function getDistanceKm(lat1, lon1, lat2, lon2) {
//   const R = 6371;
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return (R * c).toFixed(1);
// }

const alertHelper = (helper) => {
  // Ici tu mets ce que tu veux faire quand un solidaire est alerté
  console.log("⚡ Alerte envoyée à", helper.name);

  // Exemple basique : afficher une notification
  toast.info(`⚡ Alerte envoyée à ${helper.name}`);

  // Plus tard, tu pourras déclencher un enregistrement dans Firestore
  // pour notifier le solidaire directement.
};


// Recentrage sur utilisateur
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 25);
  }, [position, map]);
  return null;
}

// Zoom sur alerte
function FlyToLocation({ alert }) {
  const map = useMap();
  useEffect(() => {
    if (!alert) return;
    const { latitude, longitude } = alert;
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    map.flyTo([latitude, longitude], 15, { animate: true });
    toast.info("📍 Zoom sur la panne sélectionnée");
  }, [alert, map]);
  return null;
}

// === Composant principal MapView avec forwardRef ===
const MapView = forwardRef(({
  reports = [],
  solidaires = [],
  alerts = [],
  userPosition,
  onReportClick,
  onAlertUser,
  activeReport,
  selectedAlert,
  cancelReport,
  currentUserUid,
  showHelperList,
  setShowHelperList
}, ref) => {
  const mapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (mapRef.current && userPosition) {
        mapRef.current.setView(userPosition, 15);
      }
    },
  }));

  // === États pour modals ===
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isInProgressOpen, setIsInProgressOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [distanceToHelper, setDistanceToHelper] = useState(null);
  const [currentUser, setCurrentUser] = useState(solidaires.find(s => s.uid === currentUserUid) || null);

  // const availableHelpers = solidaires
  // .filter(s => s.materiel?.includes(activeReport?.materiel) && s.uid !== currentUserUid)
  // .sort(
  //   (a, b) =>
  //     getDistanceKm(userPosition[0], userPosition[1], a.latitude, a.longitude) -
  //     getDistanceKm(userPosition[0], userPosition[1], b.latitude, b.longitude)
  // );


  // Suivi temps réel du report actif
  useEffect(() => {
    if (!activeReport) return;
    const reportRef = doc(db, "reports", activeReport.id);
    const unsub = onSnapshot(reportRef, (docSnap) => {
      if (!docSnap.exists()) {
        cancelReport(activeReport.id);
      } else {
        const data = docSnap.data();
        if (
          data.status !== activeReport.status ||
          data.helperConfirmed !== activeReport.helperConfirmed
        ) {
          onReportClick({
            ...activeReport,
            status: data.status,
            helperUid: data.helperUid,
            helperConfirmed: data.helperConfirmed,
          });

          // Toast pour solidaire en route
          if (data.helperConfirmed && !activeReport.helperConfirmed) {
            toast.info(`🚗 ${data.helperName} est en route pour vous aider`);
          }

          // Ouvrir InProgressModal uniquement si l'aide a commencé
          if (data.helperConfirmed && data.status === "aide en cours") {
            setCurrentReport({ ...activeReport, ...data });
            setIsInProgressOpen(true);
          }
        }
      }
    });
    return () => unsub();
  }, [activeReport, cancelReport, onReportClick]);

  // Calcul distance en temps réel
  useEffect(() => {
    if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return;

    const interval = setInterval(() => {
      const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
      if (!helper || !helper.latitude || !helper.longitude) return;
      const dist = getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude);
      setDistanceToHelper(dist);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeReport, solidaires, userPosition]);

  if (!userPosition || userPosition.length < 2 || userPosition[0] == null || userPosition[1] == null)
    return <div>📍 Localisation en cours...</div>;

  let alertLocation = null;
  if (selectedAlert) {
    const report = reports.find((r) => r.id === selectedAlert.reportId);
    if (report && report.latitude && report.longitude) {
      alertLocation = { latitude: report.latitude, longitude: report.longitude };
    }
  }

const filteredSolidaires = activeReport
  ? solidaires.filter((s) => {
      const isOffline = !s.online;

      // Toujours avoir un tableau
      const solidaireMateriel = Array.isArray(s.materiel)
        ? s.materiel
        : typeof s.materiel === "string"
        ? [s.materiel]
        : [];

      // Vérifier compatibilité uniquement si activeReport.nature existe
      const hasCompatibleMateriel =
        Boolean(activeReport.nature) &&
        solidaireMateriel.some((m) => {
          const matOption = MATERIEL_OPTIONS.find((o) => o.value === m);
          return matOption?.compatible?.includes(activeReport.nature);
        });

      // Vérifier si le solidaire a déjà été alerté pour ce report
      const alertForSolidaire = alerts.some(
        (a) => a.reportId === activeReport.id && a.toUid === s.uid
      );

      // Inclure le solidaire s'il est en ligne et compatible, ou s'il a déjà été alerté
      return (hasCompatibleMateriel && !isOffline) || alertForSolidaire;
    })
  : solidaires;

  const availableHelpers = filteredSolidaires.slice(0, 10); // les 10 premiers helpers, sans filtre

// === Pro Markers (garages et assurances Firestore) ===
function ProMarkers() {
  const [pros, setPros] = useState([]);

  useEffect(() => {
    const fetchPros = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const allUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // 👉 on garde seulement garages et assurances avec coordonnées valides
        const filtered = allUsers.filter(
          (u) =>
            (u.role === "garage" || u.role === "assurance") &&
            u.latitude != null &&
            u.longitude != null
        );

        setPros(filtered);
        console.log("✅ Pros Firestore:", filtered);
      } catch (error) {
        console.error("❌ Erreur Firestore:", error);
      }
    };

    fetchPros();
  }, []);

  return (
    <>
      {pros.map((pro) => {
        const proIcon = new L.Icon({
          iconUrl:
            pro.role === "garage"
              ? "https://img.icons8.com/color/48/000000/garage.png"
              : "https://img.icons8.com/color/48/000000/bank-building.png",
          iconSize: [40, 40],
        });

        return (
          <Marker key={pro.id} position={[pro.latitude, pro.longitude]} icon={proIcon}>
            <Popup>
              <strong>{pro.role === "garage" ? "🚗 Garage" : "🏢 Assurance"} :</strong>{" "}
              {pro.company?.name || pro.username} <br />
              {pro.company?.siret && <>SIRET : {pro.company.siret} <br /></>}
              {pro.company?.address && <>Adresse : {pro.company.address} <br /></>}
              {Array.isArray(pro.materiel) &&
                pro.materiel.length > 0 &&
                <>Matériel : {pro.materiel.join(", ")} <br /></>}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}


// Bandeau helper confirmé uniquement
  function HelperBanner({ activeReport, solidaires, userPosition }) {
    if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return null;
    const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
    if (!helper) return null;

    const distance =
      helper.latitude && helper.longitude
        ? getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude)
        : null;

    return (
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#e6f7ff",
          border: "1px solid #91d5ff",
          padding: "8px 16px",
          borderRadius: "12px",
          zIndex: 1000,
          fontWeight: "bold",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        🚗 {helper.name} est en route pour vous aider
        {distance && <span>📏 Distance restante : {distance} km</span>}
      </div>
    );
  }

  const canPay = activeReport?.helperConfirmed && activeReport?.status === "aide en cours" && activeReport?.frais > 0;

  return (
    <>
      {/* Modals */}
      <AcceptModal
        isOpen={isAcceptOpen}
        onClose={() => setIsAcceptOpen(false)}
        alerte={currentReport}
        onConfirm={(report, montant, fraisAnnules) => {
          setCurrentReport(report);
          setIsAcceptOpen(false);
          setIsInProgressOpen(true);
        }}
      />
      <InProgressModal
        isOpen={isInProgressOpen}
        onClose={() => setIsInProgressOpen(false)}
        report={currentReport}
        solidaire={currentUser}
        onComplete={() => {}}
      />

      {showHelperList && (
        <ModalHelperList
          helpers={availableHelpers}
          userPosition={userPosition}
          activeReport={activeReport} // <-- on passe le report actif
          onAlert={(helper) => {
            if (!activeReport) return toast.error("Vous devez avoir un signalement actif pour alerter un solidaire !");
            alertHelper(helper);
            setShowHelperList(false);
          }}
          onClose={() => setShowHelperList(false)}
        />
      )}

      {/* Map */}
      <MapContainer
        center={userPosition}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        ref={mapRef}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SetViewOnUser position={userPosition} />
        {alertLocation && <FlyToLocation alert={alertLocation} />}
        {activeReport?.helperConfirmed && activeReport.helperUid && (
          <HelperBanner activeReport={activeReport} solidaires={solidaires} userPosition={userPosition} />
        )}

        {activeReport?.helperConfirmed && activeReport.helperUid && activeReport.frais > 0 && (
          <PaymentBanner
            report={activeReport}
            solidaire={solidaires.find(s => s.uid === activeReport.helperUid)}
          />
        )}

        {canPay && <PayButton report={activeReport} />}

        {/* Utilisateur */}
        <Marker position={userPosition} icon={currentUserIcon}>
          <Popup>🙋‍♂️ Vous êtes ici</Popup>
        </Marker>

        {/* Reports */}
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={reportIcon}
            eventHandlers={{ click: () => onReportClick(report) }}
          >
            <Popup>
              <strong>⚠️ Panne :</strong> {report.nature} <br />
              {report.ownerUid === currentUserUid && (
                <button onClick={() => cancelReport(report.id)}>❌ Annuler</button>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Solidaires */}
        {filteredSolidaires
          .filter(s => s.latitude != null && s.longitude != null)
          .map((s) => {
          let status = "available";
          const isOffline = !s.online;
          const alertForSolidaire = activeReport
            ? alerts.find((a) => a.reportId === activeReport.id && a.toUid === s.uid)
            : null;

          if (isOffline) status = "offline";
          else if (activeReport?.helperUid === s.uid) {
            if (activeReport.helperConfirmed && activeReport.status === "aide en cours") status = "busy";
            else if (!activeReport.helperConfirmed && alertForSolidaire) status = "alerted";
          }

          const distance = getDistanceKm(userPosition[0], userPosition[1], s.latitude, s.longitude);

          // 👉 ici tu ajoutes le comptage
          const alertCount = alerts.filter((a) => a.toUid === s.uid).length;

          return (
            <Marker
              key={s.uid}
              position={[s.latitude, s.longitude]}
              icon={getSolidaireIconWithBadge(status, alertCount)} // 👈 tu passes alertCount
            >
              <Popup>
                <strong>👤 {s.name}</strong> <br />
                Matériel : {Array.isArray(s.materiel) ? s.materiel.join(", ") : s.materiel || "Non spécifié"} <br />
                📏 Distance : {distance} km <br />
                {status === "available" && "✅ Disponible"}
                {status === "offline" && "⚪ Indisponible"}
                {status === "alerted" && "⏳ En attente de réponse"}
                {status === "busy" && "⏳ Aide en cours"}
                {status === "available" && s.uid !== currentUserUid && (
                  <button
                    onClick={() => {
                      onAlertUser(s);
                      toast.info(`⚡ Alerte envoyée à ${s.name}`);
                    }}
                  >
                    ⚡ Alerter
                  </button>
                )}
              </Popup>
            </Marker>
          );
        })}

  <SetViewOnUser position={userPosition} />
  {alertLocation && <FlyToLocation alert={alertLocation} />}
  {activeReport?.helperConfirmed && activeReport.helperUid && (
    <HelperBanner activeReport={activeReport} solidaires={solidaires} userPosition={userPosition} />
  )}

  {/* 🔥 Pros */}
  <ProMarkers />

  {/* Utilisateur */}
  <Marker position={userPosition} icon={currentUserIcon}>
    <Popup>🙋‍♂️ Vous êtes ici</Popup>
  </Marker>

      </MapContainer>
    </>
  );
});
export default MapView;

//---------------PRO MARKERS-----------------------//
// export default function ProMarkers({ userPosition }) {
//   const [pros, setPros] = useState([]);

//   useEffect(() => {
//     const fetchPros = async () => {
//       try {
//         const snapshot = await getDocs(collection(db, "users"));
//         const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

//         // 👉 garde seulement garages + assurances avec coordonnées valides
//         const filtered = users.filter(
//           (u) =>
//             (u.role === "garage" || u.role === "assurance") &&
//             u.latitude != null &&
//             u.longitude != null
//         );

//         setPros(filtered);
//         console.log("Pros Firestore:", filtered);
//       } catch (error) {
//         console.error("Erreur récupération pros:", error);
//       }
//     };

//     fetchPros();
//   }, []);

//   return (
//     <>
//       {pros.map((pro) => {
//         const proIcon = new L.Icon({
//           iconUrl:
//             pro.role === "garage"
//               ? "https://img.icons8.com/color/48/000000/garage.png"
//               : "https://img.icons8.com/color/48/000000/bank-building.png",
//           iconSize: [40, 40],
//         });

//         return (
//           <Marker key={pro.id} position={[pro.latitude, pro.longitude]} icon={proIcon}>
//             <Popup>
//               <strong>{pro.role === "garage" ? "🚗 Garage" : "🏢 Assurance"} :</strong>{" "}
//               {pro.company?.name || pro.username} <br />
//               {pro.company?.siret && <>SIRET : {pro.company.siret} <br /></>}
//               {pro.company?.address && <>Adresse : {pro.company.address} <br /></>}
//               {Array.isArray(pro.materiel) &&
//                 pro.materiel.length > 0 &&
//                 <>Matériel : {pro.materiel.join(", ")} <br /></>}
//             </Popup>
//           </Marker>
//         );
//       })}
//     </>
//   );
// }

