// AvisModal.jsx
import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import { Rating } from "@mui/material";

export default function AvisModal({ open, onClose, pro }) {
  if (!pro) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {pro.role === "garage" ? "🚗 Garage" : "🏢 Assurance"} : {pro.company?.name || pro.username}
      </DialogTitle>
      <DialogContent dividers>
        {pro.avis && pro.avis.length > 0 ? (
          pro.avis.map((avis, index) => (
            <div key={index} style={{ marginBottom: "12px" }}>
              <Typography variant="subtitle2">{avis.fromUsername}</Typography>
              <Rating value={avis.rating} readOnly size="small" precision={0.5} />
              <Typography variant="body2">{avis.comment}</Typography>
              <Typography variant="caption" color="textSecondary">
                {new Date(avis.date).toLocaleDateString()}
              </Typography>
            </div>
          ))
        ) : (
          <Typography>Aucun avis pour le moment</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
