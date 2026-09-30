import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import vi from "./locales/vi";

export type Language = "vi" | "en";

const STORAGE_KEY = "lang";

// Vietnamese unless the user picked English in the app. navigator.language is ignored on purpose:
// a phone set to English does not mean the user wants to read this app in English.
function savedLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

export function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage blocked (private mode): the choice lasts for this tab only.
  }
  document.documentElement.lang = language;
  void i18n.changeLanguage(language);
}

const initial = savedLanguage();
document.documentElement.lang = initial;

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: initial,
  fallbackLng: "vi",
  // React already escapes text.
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
