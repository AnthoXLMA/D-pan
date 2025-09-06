// AvisModal.jsx
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField } from "@mui/material";
import { Rating } from "@mui/material";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { recalcUserScore } from "./userScoreService.js";

export default function AvisModal({ open, onClose, pro, currentUser, setPro }) {
  const [newRating, setNewRating] = useState(null);
  const [newComment, setNewComment] = useState("");

  if (!pro) return null;

  const handleSubmitAvis = async () => {
    if (!currentUser) return;

    const avisRef = collection(db, `users/${pro.uid}/avis`);
    const avisDoc = {
      fromUid: currentUser.uid,
      fromUsername: currentUser.username,
      rating: newRating,
      comment: newComment,
      date: Timestamp.now()
    };

    await addDoc(avisRef, avisDoc);

    // Recalcul du score global
    await recalcUserScore(pro.uid);

    // Mise à jour locale
    setPro(prev => ({
      ...prev,
      avis: [...(prev.avis || []), { ...avisDoc, date: new Date() }]
    }));

    setNewRating(null);
    setNewComment("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {pro.role === "garage" ? "🚗 Garage" : "🏢 Assurance"} : {pro.company?.name || pro.username}
      </DialogTitle>
      <DialogContent dividers>
        {/* Lecture des avis */}
        {Array.isArray(pro?.avis) && pro.avis.length > 0 ? (
          pro.avis.map((avis, index) => (
            <div key={index}>
              <Typography variant="subtitle2">{avis.fromUsername || "Anonyme"}</Typography>
              <Rating value={avis.rating || 0} readOnly size="small" precision={0.5} />
              <Typography variant="body2">{avis.comment || "Pas de commentaire"}</Typography>
              <Typography variant="caption" color="textSecondary">
                {avis.date ? new Date(avis.date).toLocaleDateString() : ""}
              </Typography>
            </div>
          ))
        ) : (
          <Typography>Aucun avis pour le moment</Typography>
        )}


        {/* Formulaire pour ajouter un avis */}
        <div style={{ marginTop: "16px" }}>
          <Typography variant="subtitle1">Ajouter un avis</Typography>
          <Rating
            value={newRating}
            onChange={(e, val) => setNewRating(val)}
            precision={0.5}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Votre commentaire..."
            sx={{ mt: 1 }}
          />
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={handleSubmitAvis}
            disabled={!newRating || !newComment}
          >
            Envoyer
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
