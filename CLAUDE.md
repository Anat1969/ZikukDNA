# ZikukDNA (זיקוק DNA)

מזקקים כל רעיון לקוד הגנטי העיצובי שלו: משפט זיקוק, מתח, שישה גנים (צורה, חומר, אור, צבע, תנועה, זמן), פלטה, פרומפט למידג'רני בעברית ותמונה 1:1. אפשר להכליא שני גנומים ולבצע מוטציה בגן אחד.

## מבנה
- Vite + React + framer-motion. עברית ו-RTL. ניתוב פשוט ב-`src/lib/router.jsx` (נתיבים: `/`, `/distill`, `/lab?a=&b=`, `/dna/:id?gene=`). סינון בדף הבית ב-`?lens=&q=`.
- Supabase: פרויקט משותף `cultura-GH` (ktqmwpbzcnzkhjskqisy). רק טבלאות `zikuk_*` והדלי `zikuk-media`.
  - `zikuk_dnas`: קריאה ציבורית למה שפורסם, עדכון ומחיקה לאדמין בלבד (`zikuk_is_admin()` לפי מייל בטבלת `zikuk_admins`).
  - פונקציית Edge `zikuk-distill` (מקור ב-`supabase/functions/zikuk-distill`): Claude לטקסט, fal.ai לתמונה, כתיבה עם service role, מגבלה של 20 זיקוקים בשעה. פתוחה לכל מבקר.
  - Google כבוי בפרויקט כרגע, ולכן חלון הכניסה מציע קישור חד־פעמי למייל. כשיופעל Google, הכפתור יופיע לבד.
- PWA: `public/manifest.webmanifest`, `public/sw.js`, אייקונים ב-`public/icons` (נוצרו מ-`public/favicon.svg`).
- פריסה: Vercel מ-main. `vercel.json` מפנה כל נתיב ל-index.html.

## בדיקה
`npm run build && npm test`: Playwright מול `vite preview` עם מוקים לכל Supabase, סשן אדמין מזויף, בדיקת גלילה אופקית בנייד, התקנה ושגיאות קונסול. צילומי מסך ב-`tests/shots`.

## החלטות ותיקונים של ענת
- עבודה לפי הסקיל end-to-end-builder. מיזוג PR ל-main אחרי בדיקה ירוקה בלי לשאול (אישור קבוע).
- בלי אייקונים. סרגל עליון קבוע: שם האפליקציה לדף הבית, העתקת קישור, שיחת הפיתוח, התקנה.
- פרומפט מידג'רני בעברית בלבד, ותמיד מסתיים ב-`Documentary realism, Professional architecture photography, 1:1 --no text, words, writing, frame divisions` (מתווסף בשרת).
- פרויקט Supabase הישן ZIKUK היה ריק (בלי טבלאות, פונקציות או משתמשים) ואפשר למחוק אותו.
