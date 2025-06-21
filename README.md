# Clarity-Voice 🎙️ 
Final project for B.SC Software Engineering Degree


היא אפליקציה קלה לשימוש לגישה למיקרופון במכשיר, הממירה קול לטקסט בזמן אמת באמצעות 🧠 מודל זיהוי דיבור (כמו OpenAI Whisper). Clarity-Voice 🎙️

---

## 🚀 תכונות

- **גישה אונ־ליין למיקרופון** – האפליקציה מאזינה לקול בזמן אמת.
- **זיהוי דיבור לטקסט** – מעבדת קלט דיבור וממירה אותו לטקסט בעזרת מודל AI.
- **תגובה בזמן אמת** – עדכון ממשק המשתמש בזמן שהמילים מזוהות.
- **יתכן טיפול בהרשאות** – ניהול הרשאת `RECORD_AUDIO` (אם מדובר באנדרואיד ואף macOS או Windows).

---

## ⚙️ דרישות מערכת

- **Node.js** v14+ או Python (בהתאם להטמעה)  
- גישה למיקרופון (מכשירים שולחניים או דפדפן)  
- חיבור לאינטרנט (אם נעשה שימוש בשירות ענן עבור Whisper)

---

## 🔧 התקנה והרצה

```bash
git clone https://github.com/your-username/microphone-app.git
cd microphone-app
npm install        # או pip install -r requirements.txt
npm start          # או python main.py
