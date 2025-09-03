import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

export default function Chat({ report, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!report) return; // ne fait rien si report est undefined

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("reportId", "==", report.id),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [report]);

  const handleSend = async () => {
    if (!report || newMessage.trim() === "") return;

    try {
      await addDoc(collection(db, "messages"), {
        reportId: report.id,
        text: newMessage,
        senderId: user.uid,
        senderEmail: user.email,
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Erreur en envoyant le message :", err);
    }
  };

  if (!report) {
    return <div>Sélectionnez un rapport pour voir le chat.</div>; // fallback si pas de report
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", width: "100%", maxWidth: "500px" }}>
      <h3>Chat pour la panne: {report.nature || "inconnue"}</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "10px" }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ margin: "5px 0", padding: "5px", backgroundColor: msg.senderId === user.uid ? "#e0ffe0" : "#f0f0f0" }}>
            <strong>{msg.senderEmail}</strong>: {msg.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Tapez votre message..."
        style={{ width: "80%", padding: "5px" }}
      />
      <button onClick={handleSend} style={{ padding: "5px 10px", marginLeft: "5px" }}>Envoyer</button>
    </div>
  );
}
