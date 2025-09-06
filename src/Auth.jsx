import React, { useState } from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  db,
} from "./firebase.js";
import { doc, setDoc } from "firebase/firestore";
import {
  TextField,
  Button,
  Box,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Paper,
  Checkbox,
  ListItemText,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import zxcvbn from "zxcvbn";

export default function Auth({ setUser }) {
  const [mode, setMode] = useState("login"); // "login" ou "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [userType, setUserType] = useState("user"); // "user" ou "pro"
  const [role, setRole] = useState(""); // "solidaire", "garage", "assurance" (sinistré = action)
  const [materiel, setMateriel] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [address, setAddress] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const PANNE_OPTIONS = [
    { value: "pinces", label: "🔋 Pinces (Batterie)" },
    { value: "cric", label: "🛞 Cric (Pneu)" },
    { value: "jerrican", label: "⛽ Jerrican (Carburant)" },
    { value: "outils", label: "🛠️ Outils divers" },
  ];

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordStrength(val ? zxcvbn(val).score : null);
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), { online: true }, { merge: true });

      setUser(user);
      setSnackbar({ open: true, message: "Connexion réussie ✅", severity: "success" });
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur : " + error.message, severity: "error" });
    }
  };

  const handleSignup = async () => {
    if (!username) {
      setSnackbar({ open: true, message: "Veuillez saisir un nom d'utilisateur.", severity: "warning" });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Données communes pour tous les utilisateurs
      const userData = {
        uid: user.uid,
        email: user.email,
        username,
        online: true,
        latitude: null,
        longitude: null,
        score_global: 0,
        points_experience: 0,
        niveau: "Débutant 🌱",
        currentReport: null,
        hasSeenFirstPanneModal: false,
        badges: [],
        avis: [],
        status: "disponible",
        stripeAccountId: null,
      };

      // Champs selon type
      if (userType === "user") {
        userData.role = "automobiliste_equipe"; // rôle identique pour tous les utilisateurs simples
        userData.materiel = materiel || []; // tableau vide si pas de matériel sélectionné
      } else if (userType === "pro") {
        userData.role = role === "garage" ? "professionnel_expert_certifie" : "assurance";
        userData.company = { name: companyName, siret, address };
        userData.materiel = [];
      }

      await setDoc(doc(db, "users", user.uid), userData);

      setUser(userData);
      setSnackbar({ open: true, message: "Compte créé avec succès 🎉", severity: "success" });
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur : " + error.message, severity: "error" });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f0f2f5",
        p: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          width: 400,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          borderRadius: 3,
          boxShadow: 4,
        }}
      >
        <Typography variant="h5" align="center" gutterBottom>
          🚗 U-Boto – {mode === "login" ? "Connexion" : "Inscription"}
        </Typography>

        {/* Switch Connexion / Inscription */}
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <Button
            variant={mode === "login" ? "contained" : "outlined"}
            onClick={() => setMode("login")}
            sx={{ flex: 1 }}
          >
            Connexion
          </Button>
          <Button
            variant={mode === "signup" ? "contained" : "outlined"}
            onClick={() => setMode("signup")}
            sx={{ flex: 1 }}
          >
            Inscription
          </Button>
        </Box>

        {mode === "signup" && (
          <>
            <TextField
              label="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Vous êtes</InputLabel>
              <Select
                value={userType}
                onChange={(e) => {
                  setUserType(e.target.value);
                  setRole(""); // reset role si changement type
                }}
              >
                <MenuItem value="user">Particulier</MenuItem>
                <MenuItem value="pro">Professionnel</MenuItem>
              </Select>
            </FormControl>

            {userType === "pro" && (
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Rôle professionnel</InputLabel>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <MenuItem value="garage">Garage</MenuItem>
                  <MenuItem value="assurance">Assurance</MenuItem>
                </Select>
              </FormControl>
            )}
          </>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />

        <TextField
          label="Mot de passe"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={handlePasswordChange}
          fullWidth
          InputProps={{
            endAdornment: (
              <IconButton onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />

        {mode === "signup" && passwordStrength !== null && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ height: 8, borderRadius: 4, backgroundColor: "#eee", overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${(passwordStrength + 1) * 20}%`,
                  height: "100%",
                  backgroundColor:
                    passwordStrength < 2 ? "red" : passwordStrength === 2 ? "orange" : "green",
                  transition: "width 0.3s",
                }}
              />
            </Box>
            <Typography variant="caption" color="textSecondary">
              {["Très faible", "Faible", "Moyen", "Fort", "Très fort"][passwordStrength]}
            </Typography>
          </Box>
        )}

        {/* Tous les utilisateurs simples peuvent déclarer du matériel */}
        {mode === "signup" && userType === "user" && (
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Matériel disponible (facultatif)</InputLabel>
            <Select
              multiple
              value={materiel}
              onChange={(e) => setMateriel(e.target.value)}
              renderValue={(selected) =>
                selected
                  .map((val) => PANNE_OPTIONS.find((o) => o.value === val)?.label)
                  .join(", ")
              }
            >
              {PANNE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={materiel.includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Champs conditionnels pour pro */}
        {mode === "signup" && userType === "pro" && (role === "garage" || role === "assurance") && (
          <>
            <TextField
              label="Nom de l'entreprise"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              fullWidth
            />
            <TextField
              label="SIRET"
              value={siret}
              onChange={(e) => setSiret(e.target.value)}
              fullWidth
            />
            <TextField
              label="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
            />
          </>
        )}

        <Button
          variant="contained"
          onClick={mode === "login" ? handleLogin : handleSignup}
          fullWidth
          sx={{ mt: 1 }}
        >
          {mode === "login" ? "Se connecter" : "Créer un compte"}
        </Button>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
