import {createClient} from '@supabase/supabase-js';

export function serviceClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Object.assign(new Error('Supabase server kaliti sozlanmagan. Vercel env’da SUPABASE_SERVICE_ROLE_KEY kiriting.'),{status:503});
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
