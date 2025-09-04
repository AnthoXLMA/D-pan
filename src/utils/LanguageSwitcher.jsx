import React from "react";
import { useTranslation } from "react-i18next";
import frFlag from "../assets/fr.png"; // adapte le chemin
import enFlag from "../assets/en.png"; // adapte le chemin

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-3">
      {/* Français */}
      <button
        onClick={() => changeLanguage("fr")}
        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-transform transform hover:scale-110 ${
          i18n.language === "fr"
            ? "border-blue-500 shadow-lg"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        <img src={frFlag} alt="FR" className="w-full h-full object-cover" />
      </button>

      {/* Anglais */}
      <button
        onClick={() => changeLanguage("en")}
        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-transform transform hover:scale-110 ${
          i18n.language === "en"
            ? "border-blue-500 shadow-lg"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        <img src={enFlag} alt="EN" className="w-full h-full object-cover" />
      </button>
    </div>
  );
}
