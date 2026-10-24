# ZikukDNA (זיקוק DNA)

מזקקים כל רעיון לקוד הגנטי העיצובי שלו: משפט זיקוק, מתח, שישה גנים (צורה, חומר, אור, צבע, תנועה, זמן), פלטה, פרומפט למידג'רני בעברית ותמונה 1:1. אפשר להכליא שני גנומים ולבצע מוטציה בגן אחד.

## מבנה
- Vite + React + framer-motion. עברית ו-RTL. ניתוב פשוט ב-`src/lib/router.jsx` (נתיבים: `/`, `/distill`, `/lab?a=&b=`, `/dna/:id?gene=`). סינון בדף הבית ב-`?lens=&q=`.
- Supabase: פרויקט משותף `cultura-GH` (ktqmwpbzcnzkhjskqisy). רק טבלאות `zikuk_*` והדלי `zikuk-media`.
  - `zikuk_dnas`: קריאה ציבורית למה שפורסם, עדכון ומחיקה לאדמין בלבד (`zikuk_is_admin()` לפי מייל בטבלת `zikuk_admins`).
  - פונקציית Edge `zikuk-distill` (מקור ב-`supabase/functions/zikuk-distill`): Claude לטקסט, fal.ai לתמונה, כתיבה עם service role, מגבלה של 20 זיקוקים בשעה. פתוחה לכל מבקר.
  - פונקציית Edge `zikuk-upload` (מקור ב-`supabase/functions/zikuk-upload`): מצרפת לגנום את התמונה שנוצרה במידג'רני (`mj_image_url`). כל מבקר יכול להוסיף תמונה ראשונה, החלפה והסרה רק לאדמין (טוקן המשתמש נשלח ב-`x-user-token`). מגבלה של 30 העלאות בשעה, עד 10MB.
  - התמונה שמייצגת גנום היא `mainImage()`: תמונת מידג'רני אם יש, אחרת התמונה שנוצרה. משמשת בכרטיסים, בגנום המוביל, במעבדה ובראש דף הגנום.
  - Google כבוי בפרויקט כרגע, ולכן חלון הכניסה מציע קישור חד־פעמי למייל. כשיופעל Google, הכפתור יופיע לבד.
- PWA: `public/manifest.webmanifest`, `public/sw.js`, אייקונים ב-`public/icons` (נוצרו מ-`public/favicon.svg`).
- פריסה: פרויקט Vercel `zikuk-dna`, ענף הייצור main, כתובת https://zikuk-dna.vercel.app. `vercel.json` מפנה כל נתיב ל-index.html.

## בדיקה
`npm run build && npm test`: Playwright מול `vite preview` עם מוקים לכל Supabase, סשן אדמין מזויף, בדיקת גלילה אופקית בנייד, התקנה ושגיאות קונסול. צילומי מסך ב-`tests/shots`.

## החלטות ותיקונים של ענת
- עבודה לפי הסקיל end-to-end-builder. מיזוג PR ל-main אחרי בדיקה ירוקה בלי לשאול (אישור קבוע).
- בלי אייקונים. סרגל עליון קבוע: שם האפליקציה לדף הבית, ניווט התוכן, וכפתור הלוגו A&I (`src/components/BrandMenu.jsx`, עוטף את `<ai-menu>`). פעולות העריכה של דף הגנום (עריכת טקסט, פרסום, גנום מוביל, מחיקה) נכנסות לכפתור דרך `pageItems` ב-store, בלי פס עריכה צף. בנייד הניווט עובר לשורה שנייה בסרגל.
- פרומפט מידג'רני בעברית בלבד, ותמיד מסתיים ב-`Documentary realism, Professional architecture photography, 1:1 --no text, words, writing, frame divisions` (מתווסף בשרת).
- פרויקט Supabase הישן ZIKUK היה ריק (בלי טבלאות, פונקציות או משתמשים) ואפשר למחוק אותו.
- בדף הגנום: אזור "מהפרומפט לתמונה" שבו מעלים את התמונה ממידג'רני בגרירה, בהדבקה (Ctrl+V) או בבחירת קובץ. התמונה מוצגת עם הטקסט של הגנום, ואפשר להוריד כרטיס 1080x1350 של תמונה וטקסט.

## A&I logo button
The top bar holds only the app name (links home), content navigation, and ONE logo button "אד' ענת שטיבלמן A&I" (`<ai-menu>` from https://appofapp-gh.vercel.app/ai-menu.js). Every editing and development action (העתקת קישור, שיחת הפיתוח, פרויקט המחקר, התקנת האפליקציה, edit mode, add, delete) lives only inside it, never as loose buttons. Standard: https://github.com/Anat1969/AppOfApp-GH/blob/main/docs/ai-menu-standard.md
