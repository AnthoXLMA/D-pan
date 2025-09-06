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
  Stack,
} from "@mui/material";
import { AiOutlineCar, AiOutlineTool, AiOutlineDollarCircle, AiOutlineCheckCircle } from "react-icons/ai";

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
  const [assignedReports, setAssignedReports] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data());
    };

    const fetchAssignedReports = async () => {
      const q = query(collection(db, "reports"), where("helperUid", "==", user.uid));
      const snapshot = await getDocs(q);
      setAssignedReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    const fetchPayments = async () => {
      const q = query(collection(db, "payments"), where("userUid", "==", user.uid));
      const snapshot = await getDocs(q);
      setPayments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    fetchUserData();
    fetchAssignedReports();
    fetchPayments();
  }, [user]);

  if (!userData) return <Typography>Chargement des informations...</Typography>;

  const isGarage = userData.role === "garage";
  const isAssurance = userData.role === "assurance";

  return (
    <Box sx={{ p: 4, bgcolor: "#f5f6fa", minHeight: "100vh" }}>
      <Typography variant="h4" gutterBottom color="textPrimary" sx={{ mb: 4 }}>
        Bienvenue, {userData.username || userData.company?.name} !
      </Typography>

      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <AiOutlineTool size={28} color="#3f51b5" />
                <Typography variant="h6">Interventions Assignées</Typography>
              </Stack>
              <Typography variant="h3" color="primary">{assignedReports.length}</Typography>
              <Typography variant="body2" color="textSecondary">
                Total interventions actives
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <AiOutlineDollarCircle size={28} color="#4caf50" />
                <Typography variant="h6">Paiements Reçus</Typography>
              </Stack>
              <Typography variant="h3" color="primary">{payments.length}</Typography>
              <Typography variant="body2" color="textSecondary">
                Total transactions enregistrées
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <AiOutlineCheckCircle size={28} color="#ff9800" />
                <Typography variant="h6">Interventions Terminées</Typography>
              </Stack>
              <Typography variant="h3" color="primary">
                {assignedReports.filter(r => r.status === "terminé").length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total interventions terminées
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Profil / Informations */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 4, height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <AiOutlineCar size={28} color="#2196f3" />
                <Typography variant="h6">Profil</Typography>
              </Stack>
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
                {userData.materiel?.length > 0 ? (
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

        {/* Liste interventions assignées */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 4, height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <AiOutlineTool size={28} color="#3f51b5" />
                <Typography variant="h6">Liste Interventions</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {assignedReports.length === 0 ? (
                <Typography variant="body2">Aucune intervention assignée.</Typography>
              ) : (
                <List dense>
                  {assignedReports.map(r => (
                    <ListItem key={r.id} divider>
                      <ListItemText
                        primary={`#${r.id} - ${r.nature || "Inconnue"}`}
                        secondary={`Statut:`}
                      />
                      <Chip label={r.status} color={getStatusColor(r.status)} size="small" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
