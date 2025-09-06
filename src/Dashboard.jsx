import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Typography } from "@mui/material";
import UserDashboard from "./UserDashboard.jsx";
import ProDashboard from "./ProDashboard.jsx";

export default function Dashboard({ user }) {
  const [userData, setUserData] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [myHelpedReports, setMyHelpedReports] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data());
    };

    const fetchReports = async () => {
      const q1 = query(collection(db, "reports"), where("ownerUid", "==", user.uid));
      const q2 = query(collection(db, "reports"), where("helperUid", "==", user.uid));
      const snapshot1 = await getDocs(q1);
      const snapshot2 = await getDocs(q2);
      setMyReports(snapshot1.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setMyHelpedReports(snapshot2.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    const fetchPayments = async () => {
      const q = query(collection(db, "payments"), where("userUid", "==", user.uid));
      const snapshot = await getDocs(q);
      setPayments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchUserData(), fetchReports(), fetchPayments()]);
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  if (!user) return <Typography>Veuillez vous connecter pour accéder au dashboard.</Typography>;
  if (loading) return <Typography>Chargement des informations...</Typography>;
  if (!userData) return <Typography>Utilisateur introuvable.</Typography>;

  // Vérifie si l'utilisateur est un professionnel (garage ou assurance)
  const isPro = userData.role === "garage" || userData.role === "assurance";

  // Redirection vers le dashboard approprié
  return isPro ? (
    <ProDashboard
      user={userData}
      myReports={myReports}
      myHelpedReports={myHelpedReports}
      payments={payments}
    />
  ) : (
    <UserDashboard
      user={userData}
      myReports={myReports}
      myHelpedReports={myHelpedReports}
      payments={payments}
    />
  );
}

