import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc, collection, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "./firebase.js";
import PaymentBanner from "./PaymentBanner.jsx";
import PayButton from "./PayButton.jsx";
import AcceptModal from "./AcceptModal.jsx";
import InProgressModal from "./InProgressModal.jsx";
import { getDistanceKm } from "./utils/distance.js";
import ModalHelperList from "./ModalHelperList.jsx";
import { MATERIEL_OPTIONS } from "./constants/materiel.js";
import { Rating, Button } from "@mui/material";
import AvisModal from "./utils/AvisModal.jsx";

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

// === Recentrage sur utilisateur ===
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 25);
  }, [position, map]);
  return null;
}

// === Zoom sur alerte ===
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

// === MapView ===
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
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isInProgressOpen, setIsInProgressOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [distanceToHelper, setDistanceToHelper] = useState(null);
  const [currentUser, setCurrentUser] = useState(solidaires.find(s => s.uid === currentUserUid) || null);
  const [selectedPro, setSelectedPro] = useState(null);

  // === Fonction pour alerter un helper ===
  const alertHelper = (helper) => {
    console.log("⚡ Alerte envoyée à", helper.name);
    toast.info(`⚡ Alerte envoyée à ${helper.name}`);
  };

  // Pros
  const [pros, setPros] = useState([]);
  const [currentPro, setCurrentPro] = useState(null);
  const [avisModalOpen, setAvisModalOpen] = useState(false);

  const openAvisModal = (pro) => {
    setCurrentPro(pro);
    setAvisModalOpen(true);
  };
  const closeAvisModal = () => {
    setCurrentPro(null);
    setAvisModalOpen(false);
  };


  // Recenter map API
  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (mapRef.current && userPosition) {
        mapRef.current.setView(userPosition, 15);
      }
    },
  }));

  // Fetch pros Firestore
  useEffect(() => {
    const fetchPros = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filtered = await Promise.all(
          allUsers
            .filter(u => u.role === "garage" || u.role === "assurance")
            .filter(u => u.latitude != null && u.longitude != null) // garde la vérification de lat/lng
            .map(async (u) => {
              const avisSnap = await getDocs(collection(db, `users/${u.id}/avis`));
              const avis = avisSnap.docs.map(d => d.data());
              return { ...u, avis };
            })
        );

        setPros(filtered);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPros();
  }, []);


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

          if (data.helperConfirmed && !activeReport.helperConfirmed) {
            toast.info(`🚗 ${data.helperName} est en route pour vous aider`);
          }

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
        const solidaireMateriel = Array.isArray(s.materiel)
          ? s.materiel
          : typeof s.materiel === "string"
          ? [s.materiel]
          : [];
        const hasCompatibleMateriel =
          Boolean(activeReport.nature) &&
          solidaireMateriel.some((m) => {
            const matOption = MATERIEL_OPTIONS.find((o) => o.value === m);
            return matOption?.compatible?.includes(activeReport.nature);
          });
        const alertForSolidaire = alerts.some(
          (a) => a.reportId === activeReport.id && a.toUid === s.uid
        );
        return (hasCompatibleMateriel && !isOffline) || alertForSolidaire;
      })
    : solidaires;

  const availableHelpers = filteredSolidaires.slice(0, 10);
  const canPay = activeReport?.helperConfirmed && activeReport?.status === "aide en cours" && activeReport?.frais > 0;

  function HelperBanner({ activeReport, solidaires, userPosition }) {
    if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return null;
    const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
    if (!helper) return null;
    const distance =
      helper.latitude && helper.longitude
        ? getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude)
        : null;
    return (
      <div style={{
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
      }}>
        🚗 {helper.name} est en route pour vous aider
        {distance && <span>📏 Distance restante : {distance} km</span>}
      </div>
    );
  }

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
          activeReport={activeReport}
          onAlert={(helper) => {
            if (!activeReport) return toast.error("Vous devez avoir un signalement actif pour alerter un solidaire !");
            alertHelper(helper);
            setShowHelperList(false);
          }}
          onClose={() => setShowHelperList(false)}
        />
      )}

      {/* Map */}
      <MapContainer center={userPosition} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }} ref={mapRef} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetViewOnUser position={userPosition} />
        {alertLocation && <FlyToLocation alert={alertLocation} />}
        {activeReport?.helperConfirmed && activeReport.helperUid && <HelperBanner activeReport={activeReport} solidaires={solidaires} userPosition={userPosition} />}
        {activeReport?.helperConfirmed && activeReport.helperUid && activeReport.frais > 0 && <PaymentBanner report={activeReport} solidaire={solidaires.find(s => s.uid === activeReport.helperUid)} />}
        {canPay && <PayButton report={activeReport} />}

        {/* Utilisateur */}
        <Marker position={userPosition} icon={currentUserIcon}>
          <Popup>🙋‍♂️ Vous êtes ici</Popup>
        </Marker>

        {/* Reports */}
        {reports.map((report) => (
          <Marker key={report.id} position={[report.latitude, report.longitude]} icon={reportIcon} eventHandlers={{ click: () => onReportClick(report) }}>
            <Popup>
              <strong>⚠️ Panne :</strong> {report.nature} <br />
              {report.ownerUid === currentUserUid && <button onClick={() => cancelReport(report.id)}>❌ Annuler</button>}
            </Popup>
          </Marker>
        ))}

        {/* Solidaires */}
        {filteredSolidaires.filter(s => s.latitude != null && s.longitude != null).map((s) => {
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
          const alertCount = alerts.filter((a) => a.toUid === s.uid).length;
          return (
            <Marker key={s.uid} position={[s.latitude, s.longitude]} icon={getSolidaireIconWithBadge(status, alertCount)}>
              <Popup>
  <div style={{ fontFamily: "sans-serif", minWidth: "200px" }}>
    {/* Nom */}
    <div style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "4px" }}>
      👤 {s.name}
    </div>

    {/* Matériel */}
    <div style={{ fontSize: "0.9rem", color: "#444" }}>
      🛠️ Matériel :{" "}
      {Array.isArray(s.materiel)
        ? s.materiel.join(", ")
        : s.materiel || "Non spécifié"}
    </div>

    {/* Distance */}
    <div style={{ fontSize: "0.9rem", color: "#444" }}>
      📏 {distance} km
    </div>

    {/* Statut avec badge */}
    <div style={{ margin: "6px 0" }}>
      {status === "available" && (
        <span
          style={{
            background: "#d1fae5",
            color: "#065f46",
            padding: "2px 8px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: "500",
          }}
        >
          ✅ Disponible
        </span>
      )}
      {status === "offline" && (
        <span
          style={{
            background: "#f3f4f6",
            color: "#374151",
            padding: "2px 8px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: "500",
          }}
        >
          ⚪ Indisponible
        </span>
      )}
      {status === "alerted" && (
        <span
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "2px 8px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: "500",
          }}
        >
          ⏳ En attente
        </span>
      )}
      {status === "busy" && (
        <span
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "2px 8px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: "500",
          }}
        >
          🔴 Aide en cours
        </span>
      )}
    </div>

    {/* Actions */}
    {status === "available" && s.uid !== currentUserUid && (
      <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            onAlertUser(s);
            toast.info(`⚡ Alerte envoyée à ${s.name}`);
          }}
          style={{
            background: "#2563eb",
            color: "white",
            padding: "6px 12px",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          ⚡ Alerter
        </button>

        {Array.isArray(s.avis) && s.avis.length > 0 ? (
          <button
            onClick={() => openAvisModal(s)}
            style={{
              background: "#f59e0b",
              color: "white",
              padding: "6px 12px",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            ⭐ Lire les avis ({s.avis.length})
          </button>
        ) : (
          <span
            style={{
              fontSize: "0.8rem",
              color: "gray",
              alignSelf: "center",
            }}
          >
            Aucun avis
          </span>
        )}
      </div>
    )}
  </div>
</Popup>

            </Marker>
          );
        })}

        {/* Pros (garages / assurances) */}
        {pros.filter(pro => pro.latitude != null && pro.longitude != null).map((pro) => {
          const proIcon = new L.Icon({
            iconUrl: pro.role === "garage"
              ? "https://img.icons8.com/color/48/000000/garage.png"
              : "https://img.icons8.com/color/48/000000/bank-building.png",
            iconSize: [40, 40],
          });

          const moyenneAvis = pro.avis?.length
            ? pro.avis.reduce((sum, a) => sum + a.rating, 0) / pro.avis.length
            : null;

          return (
            <Marker key={pro.id} position={[pro.latitude, pro.longitude]} icon={proIcon}>
              <Popup>
                <strong>{pro.role === "garage" ? "🚗 Garage" : "🏢 Assurance"} :</strong> {pro.company?.name || pro.username} <br />
                {pro.company?.siret && <>SIRET : {pro.company.siret} <br /></>}
                {pro.company?.address && <>Adresse : {pro.company.address} <br /></>}
                {Array.isArray(pro.materiel) && pro.materiel.length > 0 && <>Matériel : {pro.materiel.join(", ")} <br /></>}

                {/* Affichage du rating seulement si il y a des avis */}
                {pro.avis && pro.avis.length > 0 && (
                  <>
                    <Rating
                      name={`rating-${pro.id}`}
                      value={moyenneAvis || 0}
                      readOnly
                      precision={0.5}
                      size="small"
                    /> ({pro.avis?.length || 0} avis)
                    <br />
                  </>
                )}

                {/* Toujours afficher le bouton */}
                <Button size="small" onClick={() => openAvisModal(pro)}>
                  {pro.avis?.length ? "Lire les avis" : "Aucun avis pour le moment"}
                </Button>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Modal des avis pros */}
      {currentPro && <AvisModal open={avisModalOpen} onClose={closeAvisModal} pro={currentPro} />}
    </>
  );
});

export default MapView;
