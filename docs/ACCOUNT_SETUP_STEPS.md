# Account Setup Steps — HF Token + New Instagram / Facebook / YouTube

Prepared 2026-09-30 for the live demo. Owner decisions locked in
`config/engine.json`: Brain = Muse (ChatGPT skipped), captions OFF,
free-tier spec accepted (~24s, 576x1024 → 1080x1920 upscale).

**Safety rule for every step below:** passwords, OTPs and tokens kabhi
chat / WhatsApp par mat bhejna. Login hamesha tum khud karoge. Token
ready hone par main ek secure entry khol dunga — token wahan paste
hoga, wo `config/.env` mein jayega (gitignored, kabhi commit nahi hoga).

---

## PART 1 — Hugging Face Token (100% free, ~5 minute)

Token kyun chahiye: bina token ke HF Spaces anonymous quota dete hain
(bahut kam). Apne token se tumhare account ki **poori free daily
ZeroGPU quota** milti hai — 3 scenes ke liye yahi difference hai
success vs quota-fail mein. **Koi card/payment nahi chahiye.**

1. Browser mein **huggingface.co** kholo → top-right **Sign Up**.
2. Email + password se free account banao (wahi email use kar sakte ho
   jo naye social accounts ke liye banaoge — Part 2, Step 0).
3. Email inbox mein verification mail ayega → **Verify** par click karo.
4. Login karke top-right apne **profile avatar → Settings** kholo.
5. Left sidebar mein **Access Tokens** → **+ Create new token**.
6. Token type = **Read** select karo (is pipeline ko sirf Read chahiye,
   Write kabhi mat dena), Name = `social-media-demo`, → **Create token**.
7. Token `hf_...` se start hoga — **ye screen sirf ek baar dikhta hai.**
   Copy karke apne paas safe rakho (password manager / notes, private).
8. Mujhe sirf itna bolo: **"HF token ready hai"** — main secure entry
   khol dunga, tum wahan paste karoge, main use `config/.env` ki
   `HF_TOKEN=` line mein daal ke ek test call se verify kar dunga.

Token leak ho jaye to: Settings → Access Tokens → us token ko
**Delete/Revoke** karke naya bana lena — purana turant bekaar ho jata hai.

---

## PART 2 — New Social Accounts + Tokens

### Step 0 — Pehle ek new email (sab accounts ki neev)

1. Ek **naya Gmail** banao (google.com → Sign in → Create account) —
   ya jo new email tumne socha hai wahi confirm karke mujhe sirf
   **email address** bata dena (password kabhi nahi).
2. Recovery phone/email set karna, 2-Step Verification ON karna —
   ye accounts aage chalke brand assets hain.

### Step 1 — YouTube channel + token

1. **youtube.com** par naye Google account se login → profile icon →
   **Create a channel** → channel ka naam + handle choose karo.
2. **console.cloud.google.com** kholo (usi account se) → top par
   **New Project** → naam `social-content-automation` → Create.
3. Left menu **APIs & Services → Library** → `YouTube Data API v3`
   search → **Enable**.
4. **APIs & Services → OAuth consent screen** → User type **External**
   → app name + apna email bhardo → **Test users** mein apna wahi
   email add karo (ye step bhoologe to OAuth fail hoga).
5. **APIs & Services → Credentials → + Create Credentials → OAuth
   client ID** → Application type **Desktop app** → Create →
   **Download JSON**.
6. Wo JSON file mujhe de dena / project mein rakhna hai is naam se:
   `config/youtube_client_secret.json` (ye secret hai — chat mein
   iska content paste mat karna, file ke roop mein dena).
7. Phir main chalaunga: `python scripts/youtube_oauth_setup.py` —
   browser khulega, **login + Allow tum khud karoge**, token apne aap
   `config/youtube_token.json` mein save ho jayega aur main use
   `.env` ki `YOUTUBE_TOKEN=` mein daal dunga. Bas, YouTube ready.

### Step 2 — Facebook Page (Instagram se pehle ye zaroori hai)

1. **facebook.com** par naye account se signup/login (new email se).
2. **facebook.com/pages/create** → Page name (channel wala hi naam
   rakho, branding ek rakho), Category = *Video Creator / Entertainment*
   → **Create Page**.
3. Profile photo + cover laga do — Page complete dikhna chahiye,
   warna API permissions mein dikkat aati hai.
4. Page ID ready rakhna: Page kholo → **About → Page ID** (ya Page
   settings mein milta hai). Ye ID secret nahi hai, mujhe de sakte ho.

### Step 3 — Instagram (Professional + Page se link — dono compulsory)

1. **instagram.com** → new email se signup → username channel naam
   jaisa rakho.
2. App/browser mein **Settings → Account type and tools → Switch to
   Professional account** → **Creator** (ya Business) select karo.
   *Bina Professional account ke API se Reel publish nahi hota.*
3. Instagram ko Facebook Page se link karo: IG **Settings →
   Accounts Centre → Profiles** mein Facebook Page add karo, **ya**
   Facebook Page → **Settings → Linked Accounts → Instagram** →
   login karke Connect. Dono taraf same Meta/Facebook login hona chahiye.

### Step 4 — Meta Developer App + tokens (sabse technical hissa)

Menu ke naam Meta kabhi-kabhi badalta hai — jab tum is step par
pahunchoge, main browser mein live saath-saath guide kar dunga.

1. **developers.facebook.com** → usi Facebook account se login →
   **My Apps → Create App** → app type/use case mein *Other →
   Business* (ya Instagram/Facebook use case jo dikhe) → app naam
   `social-content-automation` → Create.
2. **Graph API Explorer** (developers.facebook.com/tools/explorer)
   kholo → apni app select karo → **Generate Access Token**, aur ye
   permissions add karo:
   `instagram_basic`, `instagram_content_publish`, `pages_show_list`,
   `pages_read_engagement`, `pages_manage_posts`
3. Ye token sirf ~1 ghanta valid hota hai → ise **long-lived token**
   (~60 din) mein badalna hoga — ye exchange main tumhare diye hue
   token par kar dunga, ya Explorer ke "i" (Access Token Info) →
   *Open in Access Token Tool → Extend Access Token* se hota hai.
4. Explorer mein query `me/accounts` chalao → tumhari **Page ID +
   Page Access Token** milega. Page token hi Facebook publish ke liye
   lagega (`FACEBOOK_PAGE_ID` + `FACEBOOK_PAGE_ACCESS_TOKEN`).
5. Phir query: `{page-id}?fields=instagram_business_account` →
   **Instagram Business Account ID** milega
   (`INSTAGRAM_BUSINESS_ACCOUNT_ID`). Instagram publish ke liye
   `INSTAGRAM_ACCESS_TOKEN` mein upar wala long-lived token lagega.
6. Teeno values ready hote hi mujhe bolo — secure entry se `.env`
   mein jayengi, aur main har platform par ek **read-only test call**
   (koi post nahi) karke verify kar dunga ki token sahi hai.

Note: App jab tak *Development mode* mein hai, tokens sirf tumhare
apne Page/IG par kaam karenge — **demo ke liye yahi kaafi hai.**
Public/live mode aur App Review baad ki baat hai, demo ke liye
zaroori nahi.

---

## PART 3 — Tokens ke baad kya hoga (mere steps)

1. `config/.env` banega (sirf tokens, koi commit nahi).
2. HF test call → Excel ki Pending row claim → script → FLUX
   reference image → 3 × LTX scenes → ffmpeg upscale → concat →
   final video (captions OFF, music abhi library khaali hai to
   bina music pass-through).
3. Final video tumhe approval ke liye dikhaunga.
4. **Tumhare Approve ke baad hi** `scripts/publish.py` se Instagram
   Reel + Facebook Page video + YouTube Short publish hoga, aur
   har platform ka result Excel row mein likha jayega.
   (IG/FB ke liye final video ka public URL lagega — publish time
   par main uska intezaam karke tumhe pehle bataunga.)

## Abhi tumhe sirf 2 kaam karne hain

- [ ] **Part 1** — HF account + Read token ready karke bolo "HF token ready"
- [ ] **Part 2, Step 0–3** — new email, YouTube channel, FB Page,
      IG Professional + link. Step 4 (Meta tokens) hum saath karenge.
