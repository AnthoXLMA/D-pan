import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from "@mui/material";
import { AiOutlineCar, AiOutlineTool, AiOutlineDollarCircle } from "react-icons/ai";
import { calculateScoreFromReviews } from "./utils/score";


// Définition des rôles
const ROLES = [
  { value: "automobiliste_equipe", label: "Automobiliste" },
  { value: "automobiliste_intervenant_confirme", label: "Dépanneur Occasionnel" },
  { value: "professionnel_expert_certifie", label: "Professionnel Certifié" }
];

const getRoleLabel = (value) => {
  const role = ROLES.find((r) => r.value === value);
  return role ? role.label : value;
};

export default function Dashboard({ user }) {
  const [userData, setUserData] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [myHelpedReports, setMyHelpedReports] = useState([]);
  const [payments, setPayments] = useState([]);

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

    fetchUserData();
    fetchReports();
    fetchPayments();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case "en attente":
        return "warning";
      case "aide en cours":
        return "info";
      case "terminé":
        return "success";
      default:
        return "default";
    }
  };

  if (!user) return <Typography>Veuillez vous connecter pour accéder au dashboard.</Typography>;
  if (!userData) return <Typography>Chargement des informations...</Typography>;

  return (
    <Box sx={{ p: 4, bgcolor: "#f5f7fa", minHeight: "100vh" }}>
      <Typography variant="h4" gutterBottom color="primary">
        Bonjour, {userData.username} !
      </Typography>

      <Grid container spacing={3}>
        {/* Profil */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", bgcolor: "white", border: "1px solid #e0e0e0" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
                color="primary"
              >
                <AiOutlineCar style={{ marginRight: 8 }} /> Profil
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">Rôle : {getRoleLabel(userData.role)}</Typography>
              <Typography>Score global : {userData.score_global}</Typography>
              <Typography>Niveau : {userData.niveau}</Typography>
              <Typography sx={{ mt: 2, fontWeight: "bold" }}>Matériel :</Typography>
              <List dense>
                {userData.materiel.map((m) => (
                  <ListItem key={m}>
                    <ListItemText primary={m} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pannes déclarées */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", bgcolor: "white", border: "1px solid #e0e0e0" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
                color="primary"
              >
                <AiOutlineTool style={{ marginRight: 8 }} /> Mes pannes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h3" color="secondary">
                {myReports.length}
              </Typography>
              <List dense>
                {myReports.length === 0 && (
                  <Typography variant="body2">Aucune panne signalée.</Typography>
                )}
                {myReports.map((r) => (
                  <ListItem key={r.id} divider>
                    <ListItemText
                      primary={`#${r.id} - ${r.nature || "Inconnue"}`}
                      secondary={`Statut:`}
                    />
                    <Chip label={r.status} color={getStatusColor(r.status)} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Dépannages réalisés */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", bgcolor: "white", border: "1px solid #e0e0e0" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
                color="primary"
              >
                <AiOutlineTool style={{ marginRight: 8 }} /> Dépannages réalisés
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h3" color="success.main">
                {myHelpedReports.length}
              </Typography>
              <List dense>
                {myHelpedReports.length === 0 && (
                  <Typography variant="body2">Aucun dépannage réalisé.</Typography>
                )}
                {myHelpedReports.map((r) => (
                  <ListItem key={r.id} divider>
                    <ListItemText
                      primary={`#${r.id} - ${r.nature || "Inconnue"}`}
                      secondary={`Statut:`}
                    />
                    <Chip label={r.status} color={getStatusColor(r.status)} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Paiements */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: "white", border: "1px solid #e0e0e0" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
                color="primary"
              >
                <AiOutlineDollarCircle style={{ marginRight: 8 }} /> Paiements & Versements (
                {payments.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                {payments.length === 0 && (
                  <Typography variant="body2">Aucun paiement enregistré.</Typography>
                )}
                {payments.map((p) => (
                  <ListItem key={p.id} divider>
                    <ListItemText
                      primary={`#${p.id} - ${p.type} : ${p.amount || 0} €`}
                      secondary={`Statut: ${
                        p.status || "En attente"
                      } | Date: ${
                        p.timestamp?.toDate().toLocaleString() || "Inconnue"
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
