// src/SendMessageTest.jsx
import React, { useState } from "react";
import { auth, db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function SendMessageTest() {
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: message,
        createdAt: serverTimestamp(),
        uid: auth.currentUser?.uid || null
      });
      setMessage("");
    } catch (error) {
      console.error("Erreur envoi message:", error);
    }
  };

  return (
    <div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Écris un message" />
      <button onClick={sendMessage}>Envoyer</button>
    </div>
  );
}
