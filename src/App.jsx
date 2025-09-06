import React, { useState, useEffect, useRef } from "react";
import './index.css';
import Auth from "./Auth.jsx";
import UserDashboard from "./UserDashboard.jsx";
import ProDashboard from "./ProDashboard.jsx";
import MapView from "./MapView.jsx";
import ReportForm from "./ReportForm.jsx";
import AlertsListener from "./AlertsListener.jsx";
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { createStripeAccountForSolidaire, getStripeDashboardLink } from "./services/stripeFrontendService";
import { useNavigate } from "react-router-dom";
import { FaCommentDots, FaBook, FaTachometerAlt, FaMapMarkedAlt, FaStripe } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useReportsListener from "./useReportsListener.jsx";
import PayButton from "./PayButton.jsx";
import Dashboard from "./Dashboard.jsx";
import AlertHistory from "./AlertHistory.jsx";
import { updateUserStatus } from "./userService.js";
import Chat from "./Chat.jsx";
import ProfileForm from "./ProfileForm.jsx";
import LanguageSwitcher from "./utils/LanguageSwitcher.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState([43.4923, -1.4746]);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showPanneModal, setShowPanneModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [page, setPage] = useState("map");
  const userReports = useReportsListener(user);
  const mapRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [showHelperList, setShowHelperList] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const navigate = useNavigate();

  const isPro = user?.role === "garage" || user?.role === "assurance";
  const isUser = !isPro;


  // Auth
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      try {
        const userRef = doc(db, "solidaires", currentUser.uid);
        const userSnap = await getDoc(userRef);

        // Données existantes dans Firestore (ou fallback si n'existe pas)
        const userData = userSnap.exists() ? userSnap.data() : {};

        // Construire l'objet "safe" à stocker / setUser
        const safeUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          username: userData.username || currentUser.email,
          role: userData.role || "non défini",
          materiel: userData.materiel || [],
          badges: userData.badges || [],
          avis: userData.avis || [],
          score_global: userData.score_global ?? 0,
          points_experience: userData.points_experience ?? 0,
          niveau: userData.niveau || "Débutant 🌱",
          online: true,
          ...userData, // merge autres champs Firestore si existants
        };

        // Mettre à jour Firestore avec l'objet "safe" (merge = true)
        await setDoc(userRef, safeUser, { merge: true });

        // Mettre à jour le state
        setUser(safeUser);
      } catch (err) {
        console.error("Erreur lors de la récupération de l'utilisateur :", err);
      }
    } else {
      setUser(null);
    }
  });

  return () => unsubscribe();
}, []);



  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info("👋 Déconnexion réussie !");
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de se déconnecter.");
    }
  };

  // Géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setCurrentPosition([43.4923, -1.4746])
      );
    }
  }, []);

  // Mise à jour en ligne/offline
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "solidaires", user.uid);
    setDoc(userRef, { online: true }, { merge: true }).catch(() => {});

    const handleBeforeUnload = () => setDoc(userRef, { online: false }, { merge: true }).catch(() => {});
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setDoc(userRef, { online: false }, { merge: true }).catch(() => {});
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  // Écoute des solidaires
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
      const allSolidaires = snapshot.docs.map(doc => doc.data());
      setSolidaires(allSolidaires);
      setOnlineUsers(allSolidaires.filter(s => s.online).length);
    });
    return () => unsub();
  }, []);

  // Écoute des reports
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "reports"), (snapshot) => {
      const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(allReports);
      if (activeReport) {
        const updated = allReports.find(r => r.id === activeReport.id);
        if (updated) setActiveReport(updated);
      }
    });
    return () => unsub();
  }, [user, activeReport?.id]);

  // Écoute alertes
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(data);
    });
    return () => unsub();
  }, [user]);

  const handleNewReport = async (newReport) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "reports"), {
        ...newReport,
        ownerUid: user.uid,
        ownerName: user.displayName || "Anonyme",
        ownerEmail: user.email || "",
        helperUid: null,
        notified: false,
        status: "en attente",
        timestamp: serverTimestamp(),
      });
      setActiveReport({ ...newReport, id: docRef.id });
      toast.success("✅ Demande de panne créée !");
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Impossible de créer le rapport.");
    }
  };

  const cancelReport = async (reportId) => {
    if (!user) return;
    try {
      const reportDoc = await getDoc(doc(db, "reports", reportId));
      if (!reportDoc.exists()) {
        toast.error("⚠️ Report introuvable.");
        return;
      }
      if (reportDoc.data().ownerUid !== user.uid) {
        toast.error("⛔ Vous ne pouvez pas annuler la panne d'un autre utilisateur !");
        return;
      }
      await deleteDoc(doc(db, "reports", reportId));
      setActiveReport(null);
      toast.info("🗑️ Votre demande de panne a été annulée !");
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible d'annuler la panne pour le moment.");
    }
  };

  const onAlertUser = async (solidaire) => {
    if (!activeReport || !user) return;
    try {
      await addDoc(collection(db, "alertes"), {
        fromUid: user.uid,
        toUid: solidaire.uid,
        reportId: activeReport.id,
        status: "envoyée",
        timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, "reports", activeReport.id), {
        status: "aide en cours",
        helperUid: solidaire.uid,
      });
      setActiveReport(prev => prev ? { ...prev, status: "aide en cours", helperUid: solidaire.uid } : prev);
      toast.success(`✅ Alerte envoyée à ${solidaire.name} !`);
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Impossible d'envoyer l'alerte.");
    }
  };

  const handleCreateStripeAccount = async () => {
    const account = await createStripeAccountForSolidaire();
    if (!account) return;
    await updateDoc(doc(db, "users", user.uid), { stripeAccountId: account.id });
  };

  const handleDashboardStripe = async () => {
    const dashboardLink = await getStripeDashboardLink(user.stripeAccountId);
    window.open(dashboardLink, "_blank");
  };

  function ChatButton({ activeReport, unreadMessages }) {
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleClick = () => {
      if (activeReport?.helperConfirmed) setIsChatOpen(true);
      else toast.info("Vous n'avez aucune panne à signaler - souhaitez-vous signaler une panne ?");
    };

    return (
      <>
        <button onClick={handleClick} className="flex flex-col items-center relative">
          <FaCommentDots size={24} />
          <span className="text-xs mt-1">Chat</span>
          {unreadMessages > 0 && activeReport?.helperConfirmed && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1 rounded-full">
              {unreadMessages}
            </span>
          )}
        </button>
        {isChatOpen && <Chat reportId={activeReport.id} onClose={() => setIsChatOpen(false)} />}
      </>
    );
  }

  if (!user) return <Auth setUser={setUser} />;

  const username = user?.username || user?.email || "Utilisateur";
  const role = user?.role || "non défini";
  const materiel = user?.materiel || [];
  const badges = user?.badges || [];
  const avis = user?.avis || [];
  const score_global = user?.score_global ?? 0;
  const points_experience = user?.points_experience ?? 0;
  const niveau = user?.niveau || "Débutant 🌱";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow relative">
        <h1 className="text-xl font-bold">Bienvenue {user.username || user.email}</h1>

        {!user.stripeAccountId ? (
          <button onClick={handleCreateStripeAccount} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-blue-600 shadow hover:shadow-lg transition">
            <FaStripe size={20} />
          </button>
        ) : (
          <button onClick={handleDashboardStripe} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-blue-600 shadow hover:shadow-lg transition">
            <FaStripe size={20} />
          </button>
        )}

        <div className="flex items-center gap-4 relative">
          <LanguageSwitcher />
          <div className="relative">
            <button onClick={() => setShowProfileMenu(prev => !prev)} className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg">
              {user.username ? user.username[0].toUpperCase() : "U"}
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-black shadow-lg rounded-lg z-50">
                <div className="px-4 py-2 border-b font-medium">{user.username || "Utilisateur"}</div>
                <button onClick={() => { setShowProfileForm(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">Éditer profil</button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100">Se déconnecter</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative bg-gray-100">
        {page === "dashboard" && user ? (
          <div className="absolute inset-0 z-10">
            <Dashboard user={user} />
          </div>
        ) : (
          <div className="absolute inset-0 z-0">
            <MapView
              reports={reports}
              solidaires={solidaires.filter(s => s.uid !== user.uid)}
              alerts={alerts}
              userPosition={currentPosition}
              onPositionChange={setCurrentPosition}
              onReportClick={setActiveReport}
              onAlertUser={onAlertUser}
              activeReport={activeReport}
              selectedAlert={selectedAlert}
              cancelReport={cancelReport}
              currentUserUid={user.uid}
              ref={mapRef}
              showHelperList={showHelperList}
              setShowHelperList={setShowHelperList}
            />
          </div>
        )}


        {showProfileForm && <ProfileForm user={user} onClose={() => setShowProfileForm(false)} onUpdate={(updatedUser) => { setUser(updatedUser); setDoc(doc(db, "solidaires", updatedUser.uid), updatedUser, { merge: true }); }} />}

        {/* Menu flottant */}
        <div className="fixed bottom-0 left-0 w-full bg-white shadow-t z-50">
          <div className="relative flex justify-between items-center px-4 py-3 max-w-screen-lg mx-auto">
            <div className="flex items-center space-x-4">
              {isUser && (
                <button onClick={() => setShowPanneModal(true)} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                  ⚡ {userReports.length}
                </button>
              )}
              <button onClick={() => setPage("dashboard")} className="flex flex-col items-center text-center">
                <FaTachometerAlt size={24} />
                <span className="text-xs mt-1">Dashboard</span>
              </button>
              <button onClick={() => { if (page !== "map") setPage("map"); else mapRef.current?.recenter?.(); }} className="flex flex-col items-center text-center">
                <FaMapMarkedAlt size={24} />
                <span className="text-xs mt-1">Carte</span>
              </button>
              {isPro && (
                <button onClick={() => navigate("/pro-action")} className="flex flex-col items-center text-center">
                  🛠️
                  <span className="text-xs mt-1">Pro Action</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {isUser && <ChatButton activeReport={activeReport} unreadMessages={unreadMessages} />}
              <button onClick={() => setShowAlertHistory(true)} className="flex flex-col items-center text-center relative">
                <FaBook size={24} />
                <span className="text-xs mt-1">Feed</span>
                {alerts.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full flex items-center justify-center animate-pulse">{alerts.length}</span>}
              </button>
              <button onClick={() => setShowHelperList(true)} className="flex flex-col items-center justify-center relative text-center">
                👥
                <span className="absolute -top-2 -right-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">{onlineUsers}</span>
                <span className="text-xs mt-1">En ligne</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bouton + */}
        {isUser && (
          <div className="fixed bottom-20 right-4 z-50">
            <button onClick={() => setShowReportForm(true)} className="w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full shadow-2xl flex items-center justify-center text-white text-4xl font-bold border-4 border-white transition-transform hover:scale-110">+</button>
          </div>
        )}

        {showReportForm && (
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-4 max-h-[70%] overflow-y-auto z-40">
            <ReportForm userPosition={currentPosition} onNewReport={(r) => { handleNewReport(r); setShowReportForm(false); }} onClose={() => setShowReportForm(false)} />
            <button onClick={() => setShowReportForm(false)} className="mt-2 w-full bg-gray-200 py-2 rounded-lg">Fermer</button>
          </div>
        )}

        {user && alerts.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-yellow-300 p-4 rounded-t-2xl shadow-lg z-40">
            <AlertsListener user={user} setSelectedAlert={setSelectedAlert} userPosition={currentPosition} />
          </div>
        )}

        {showAlertHistory && <AlertHistory alerts={alerts} onClose={() => setShowAlertHistory(false)} />}

        {activeReport && activeReport.helperUid && activeReport.status === "aide en cours" && user?.uid === activeReport.ownerUid && (
          <div className="fixed bottom-24 left-4 right-4 bg-white rounded-xl shadow-lg p-4 z-40">
            <PayButton report={activeReport} />
          </div>
        )}
      </main>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 p-2">© {new Date().getFullYear()} U-Boto - Tous droits réservés</footer>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
