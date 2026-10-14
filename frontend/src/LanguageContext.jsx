import { createContext, useContext, useState } from "react";

const LanguageContext = createContext({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

// Pick the selected language, falling back to English when Hindi is missing.
export const t = (text, lang) => (text ? (lang === "hi" && text.hi) || text.en || "" : "");

const UI_HI = {
  "New policy": "नई पॉलिसी",
  "High risk": "उच्च जोखिम",
  "Medium risk": "मध्यम जोखिम",
  "Low risk": "कम जोखिम",
  Medium: "मध्यम",
  Low: "कम",
  All: "सभी",
  Note: "नोट",
  Verify: "जाँचें",
  "We could not match the quote exactly. Please confirm with your insurer.":
    "हम उद्धरण को हू-ब-हू नहीं मिला सके। कृपया अपने बीमाकर्ता से पुष्टि करें।",
  "More details": "और जानकारी",
  "Show less": "कम दिखाएँ",
  "Pay first, then claim": "पहले भुगतान करें, फिर क्लेम करें",
  "Not payable": "भुगतान योग्य नहीं",
  "Partly payable": "आंशिक भुगतान",
  "No extra cost": "कोई अतिरिक्त खर्च नहीं",
  Depends: "निर्भर करता है",
  "No direct policy quote attached.": "कोई सीधा पॉलिसी उद्धरण संलग्न नहीं है।",
  "View Exact Policy Quotes": "पॉलिसी के सटीक उद्धरण देखें",
  Page: "पृष्ठ",
  Clause: "खंड",
  "Loading your Out-of-Pocket Map…": "आपका आउट-ऑफ-पॉकेट मैप लोड हो रहा है…",
  "Where you may pay from your pocket": "आपको अपनी जेब से कहाँ भुगतान करना पड़ सकता है",
  "No high-risk items found. Review the cards below.":
    "कोई उच्च जोखिम वाली बात नहीं मिली। नीचे दिए कार्ड देखें।",
  "Filter by risk": "जोखिम के अनुसार छाँटें",
  "Nothing in this category.": "इस श्रेणी में कुछ नहीं है।",
  "⚠️ Automated Policy Findings": "⚠️ स्वचालित पॉलिसी निष्कर्ष",
  "Questions worth asking your insurer before you need to claim.":
    "क्लेम करने से पहले अपने बीमाकर्ता से पूछने योग्य सवाल।",
  "No findings were reported.": "कोई निष्कर्ष नहीं मिला।",
  "Ask: ": "पूछें: ",
  "Segmenting PDF pages...": "PDF पृष्ठों को बाँटा जा रहा है...",
  "Extracting coverage...": "कवरेज निकाली जा रही है...",
  "Cross-checking quotes...": "उद्धरणों की जाँच हो रही है...",
  "Building Out-of-Pocket Map...": "आउट-ऑफ-पॉकेट मैप बनाया जा रहा है...",
  "Analysing your policy locally…": "आपकी पॉलिसी का विश्लेषण हो रहा है…",
  "Online LLM": "ऑनलाइन LLM",
  "First-time setup:": "पहली बार सेटअप:",
  "Gemma requires running": "Gemma के लिए चलाना ज़रूरी है",
  "with an approved Hugging Face token.": "स्वीकृत Hugging Face टोकन के साथ।",
  "Local LLM (Private)": "लोकल LLM (निजी)",
  "Active Local AI Environment": "सक्रिय लोकल AI वातावरण",
  "Refresh Status": "स्थिति रीफ़्रेश करें",
  "Policy Parser": "पॉलिसी पार्सर",
  "Indic Translation": "भारतीय भाषा अनुवाद",
  "Running": "चालू",
  "Offline": "बंद",
  "Port": "पोर्ट",
  "Start both local services above. The dropzone will unlock automatically once detected.":
    "ऊपर दी गई दोनों लोकल सेवाएँ शुरू करें। पता चलते ही अपलोड ज़ोन अपने आप खुल जाएगा।",
  "Local environment ready. Upload enabled.": "लोकल वातावरण तैयार है। अपलोड चालू है।",
  "Please upload a PDF file.": "कृपया PDF फ़ाइल अपलोड करें।",
  "Understand your health insurance,": "अपना स्वास्थ्य बीमा समझें,",
  "in plain language": "आसान भाषा में",
  "Upload your policy PDF and see exactly where you could end up paying out of pocket.":
    "अपनी पॉलिसी PDF अपलोड करें और देखें कि आपको कहाँ अपनी जेब से भुगतान करना पड़ सकता है।",
  "Drag & drop your policy PDF here": "अपनी पॉलिसी PDF यहाँ खींचकर छोड़ें",
  "or click to browse": "या ब्राउज़ करने के लिए क्लिक करें",
  "Private when you choose Local": "लोकल चुनने पर निजी",
  "We don't store or share your data.": "हम आपका डेटा न स्टोर करते हैं और न साझा करते हैं।",
  "Exact-Quote Evidence": "सटीक उद्धरण प्रमाण",
  "Every claim links to the policy text.": "हर दावा पॉलिसी के पाठ से जुड़ा है।",
};

export const tr = (s, lang) => (lang === "hi" ? UI_HI[s] || s : s);
