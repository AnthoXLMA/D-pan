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
  Divider,
} from "@mui/material";
import { AiOutlineCar, AiOutlineTool, AiOutlineDollarCircle } from "react-icons/ai";

// Définition des statuts
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

export default function ProDashboard({ user }) {
  const [userData, setUserData] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [assignedReports, setAssignedReports] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data());
    };

    const fetchReports = async () => {
      // Reports créés par le pro (si applicable)
      const q1 = query(collection(db, "reports"), where("ownerUid", "==", user.uid));
      const snapshot1 = await getDocs(q1);
      setMyReports(snapshot1.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // Reports assignés au pro
      const q2 = query(collection(db, "reports"), where("helperUid", "==", user.uid));
      const snapshot2 = await getDocs(q2);
      setAssignedReports(snapshot2.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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

  if (!userData) return <Typography>Chargement des informations...</Typography>;

  const isGarage = userData.role === "garage";
  const isAssurance = userData.role === "assurance";

  return (
    <Box
      sx={{
        p: 4,
        bgcolor: "#007bff", // bleu
        minHeight: "100vh",
        color: "#fff", // texte blanc pour contraster
      }}
    >

      <Typography variant="h4" gutterBottom color="primary">
        Espace Professionnel, {userData.username || userData.company?.name} !
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
              {isGarage && (
                <>
                  <Typography>Type : Garage 🚗</Typography>
                  <Typography>Entreprise : {userData.company?.name}</Typography>
                  <Typography>SIRET : {userData.company?.siret}</Typography>
                  <Typography>Adresse : {userData.company?.address}</Typography>
                </>
              )}
              {isAssurance && (
                <>
                  <Typography>Type : Assurance 🏢</Typography>
                  <Typography>Nom : {userData.company?.name}</Typography>
                  <Typography>SIRET : {userData.company?.siret}</Typography>
                </>
              )}
              <Typography sx={{ mt: 2, fontWeight: "bold" }}>Matériel :</Typography>
              <List dense>
                {userData.materiel && userData.materiel.length > 0 ? (
                  userData.materiel.map((m) => (
                    <ListItem key={m}>
                      <ListItemText primary={m} />
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2">Aucun matériel enregistré.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Reports assignés (différents pour Garage / Assurance) */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", bgcolor: "white", border: "1px solid #e0e0e0" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
                color="primary"
              >
                <AiOutlineTool style={{ marginRight: 8 }} /> Pannes Assignées
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h3" color="secondary">
                {assignedReports.length}
              </Typography>
              <List dense>
                {assignedReports.length === 0 && (
                  <Typography variant="body2">Aucune intervention assignée.</Typography>
                )}
                {assignedReports.map((r) => (
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

        {/* Paiements (affiché pour tous les pros) */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", bgcolor: "white", border: "1px solid #e0e0e0" }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
                color="primary"
              >
                <AiOutlineDollarCircle style={{ marginRight: 8 }} /> Paiements & Versements ({payments.length})
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
                      secondary={`Statut: ${p.status || "En attente"} | Date: ${
                        p.timestamp?.toDate().toLocaleString() || "Inconnue"
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Section spécifique Garage */}
        {isGarage && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: "white", border: "1px solid #e0e0e0" }}>
              <CardContent>
                <Typography variant="h6" color="primary" sx={{ display: "flex", alignItems: "center" }}>
                  <AiOutlineTool style={{ marginRight: 8 }} /> Statistiques Garage
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography>Total interventions réalisées : {assignedReports.length}</Typography>
                {/* Ajoute ici d’autres KPIs spécifiques garage */}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Section spécifique Assurance */}
        {isAssurance && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: "white", border: "1px solid #e0e0e0" }}>
              <CardContent>
                <Typography variant="h6" color="primary" sx={{ display: "flex", alignItems: "center" }}>
                  <AiOutlineTool style={{ marginRight: 8 }} /> Statistiques Assurance
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography>Total sinistres gérés : {assignedReports.length}</Typography>
                {/* Ajoute ici d’autres KPIs spécifiques assurance */}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
