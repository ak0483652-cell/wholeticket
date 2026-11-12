# Work Portal - Node server + Supabase

## Supabase (pehle)
1. Project banao -> SQL Editor me `database/schema.sql` paste karke RUN.
2. Authentication -> Email provider ON.
3. Settings -> API se Project URL aur anon key copy karo.
4. Site pe sign up karne ke baad admin banao:
   update public.profiles set is_admin = true where email = 'TUMHARA_EMAIL@gmail.com';

## Local run
    npm install
    cp .env.example .env     (values bharo)
    npm run dev              (Node 20+)
    -> http://localhost:3000

## Render pe deploy (Web Service)
1. Folder GitHub pe daalo.
2. Render -> New -> Web Service -> repo chuno.
3. Build Command: `npm install`   Start Command: `npm start`
4. Environment me daalo: SUPABASE_URL aur SUPABASE_ANON_KEY
5. Deploy ke baad Supabase -> Authentication -> URL Configuration me Site URL = apni Render link.

Note: Render free Web Service kuch der idle rehne par sleep ho jaata hai, pehla load slow ho sakta hai.
