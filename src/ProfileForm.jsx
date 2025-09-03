import React, { useState, useEffect } from "react";
import { db } from "./firebase.js";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { toast } from "react-toastify";

export default function ProfileForm({ user, onClose, onUpdate }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [materiel, setMateriel] = useState([]); // tableau pour matériel multiple

  const PANNE_OPTIONS = [
    { value: "pinces", label: "🔋 Pinces (Batterie)" },
    { value: "cric", label: "🛞 Cric (Pneu)" },
    { value: "jerrican", label: "⛽ Jerrican (Carburant)" },
  ];

  // Chargement des données Firestore
  useEffect(() => {
    if (!user) return;

    setEmail(user.email);

    const fetchUserData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsername(data.username || "");
        setMateriel(Array.isArray(data.materiel) ? data.materiel : [data.materiel] || []);
      }
    };
    fetchUserData();
  }, [user]);

  // Sauvegarde des modifications
  const handleSave = async () => {
    if (!username || materiel.length === 0) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { username, materiel });
      if (onUpdate) onUpdate({ ...user, username, materiel });

      toast.success("Profil mis à jour ✅");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Box
        sx={{
          bgcolor: "white",
          p: 4,
          borderRadius: 2,
          maxWidth: 400,
          width: "100%",
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
          Modifier mon profil
        </Typography>

        <TextField
          fullWidth
          label="Nom d'utilisateur *"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          fullWidth
          label="Email"
          value={email}
          disabled
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Matériel disponible *</InputLabel>
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

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Button variant="outlined" onClick={onClose} fullWidth sx={{ mr: 1 }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!username || materiel.length === 0}
            fullWidth
            sx={{ ml: 1 }}
          >
            Enregistrer
          </Button>
        </Box>
      </Box>
    </div>
  );
}
