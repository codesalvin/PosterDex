import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../config.js';

export const validShareToken=token=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token||'');

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed.'});}
  const token=String(req.query?.token||'');if(!validShareToken(token))return res.status(400).json({error:'Invalid share link.'});
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return res.status(503).json({error:'Sharing is not configured yet.'});
  const admin=createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:share,error:shareError}=await admin.from('share_links').select('user_id').eq('token',token).maybeSingle();
  if(shareError)return res.status(500).json({error:'Could not open this collection.'});
  if(!share)return res.status(404).json({error:'This shared collection is unavailable.'});
  const [{data:folders,error:folderError},{data:posters,error:posterError}]=await Promise.all([
    admin.from('folders').select('id,name,release_year,sort_order').eq('user_id',share.user_id).order('sort_order'),
    admin.from('posters').select('id,folder_id,title,release_year,rarity,quantity,image_url,image_path,sort_order').eq('user_id',share.user_id).order('sort_order')
  ]);
  if(folderError||posterError)return res.status(500).json({error:'Could not open this collection.'});
  const cards=await Promise.all(posters.map(async poster=>{
    let url=poster.image_url;
    if(poster.image_path){const {data,error}=await admin.storage.from('poster-images').createSignedUrl(poster.image_path,3600);if(error)throw error;url=data.signedUrl;}
    return {id:poster.id,folderId:poster.folder_id,title:poster.title,year:poster.release_year?String(poster.release_year):'',rarity:poster.rarity,quantity:poster.quantity,url};
  })).catch(()=>null);
  if(!cards)return res.status(500).json({error:'Could not load shared poster images.'});
  return res.status(200).json({folders:folders.map(folder=>({id:folder.id,name:folder.name,year:folder.release_year?String(folder.release_year):'',sort_order:folder.sort_order})),cards});
}
