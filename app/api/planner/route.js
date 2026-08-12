import { NextResponse } from 'next/server';
import { decryptSession, tiktokCookie } from '../../lib/tiktokSession';
import { deleteDocument, firebaseConfigured, listDocuments, setDocument } from '../../lib/firebaseServer';

export const runtime = 'nodejs';

function sessionFrom(request) { return decryptSession(request.cookies.get(tiktokCookie.name)?.value); }
function normalizedOwner(session) { return session?.open_id || session?.profile?.open_id || 'default'; }

export async function GET(request) {
  const session = sessionFrom(request);
  if (!session?.access_token) return NextResponse.json({ ok:false, error:'Conecta TikTok primero.' }, { status:401 });
  if (!firebaseConfigured()) return NextResponse.json({ ok:true, cloud:false, items:[] });
  const owner = normalizedOwner(session);
  const docs = await listDocuments('scheduled_posts');
  const items = docs.filter(doc => doc.owner === owner).map(doc => ({ ...JSON.parse(doc.payload || '{}'), id:doc.id, status:doc.status || 'Programada' })).sort((a,b)=>String(a.scheduledAt||'').localeCompare(String(b.scheduledAt||'')));
  return NextResponse.json({ ok:true, cloud:true, storageMode:'free-firestore', items });
}

export async function POST(request) {
  const session = sessionFrom(request);
  if (!session?.access_token) return NextResponse.json({ ok:false, error:'Conecta TikTok primero.' }, { status:401 });
  if (!firebaseConfigured()) return NextResponse.json({ ok:false, error:'Configura Firestore en Vercel para activar la nube.' }, { status:503 });
  const form = await request.formData();
  const id = crypto.randomUUID();
  const owner = normalizedOwner(session);
  const title = String(form.get('title') || '').trim();
  const caption = String(form.get('caption') || '').trim();
  const platform = String(form.get('platform') || 'TikTok');
  const date = String(form.get('date') || '');
  const time = String(form.get('time') || '');
  const file = form.get('media');
  if (!title || !date || !time) return NextResponse.json({ ok:false, error:'Completa nombre, fecha y hora.' }, { status:400 });
  const scheduledAt = new Date(`${date}T${time}:00-05:00`).toISOString();
  const hasLocalMedia = Boolean(file && typeof file.arrayBuffer === 'function' && file.size > 0);
  const item = { id,title,caption,platform,date,time,scheduledAt,status:hasLocalMedia?'Pendiente de archivo':'Programada',mediaName:hasLocalMedia?(file.name||'video'):'',mediaType:hasLocalMedia?(file.type||'video/mp4'):'',mediaSize:hasLocalMedia?file.size:0,mediaStored:false,createdAt:Date.now() };
  await setDocument('scheduled_posts', id, { owner,status:item.status,scheduledAt,payload:JSON.stringify(item),updatedAt:Date.now() });
  return NextResponse.json({ ok:true, cloud:true, storageMode:'free-firestore', item, note:hasLocalMedia?'El calendario quedó guardado. Por ahora el video no se sube a la nube para mantener el proyecto sin facturación.':'' });
}

export async function PATCH(request) {
  const session=sessionFrom(request); if(!session?.access_token) return NextResponse.json({ok:false,error:'Conecta TikTok primero.'},{status:401});
  const body=await request.json(); const owner=normalizedOwner(session); const docs=await listDocuments('scheduled_posts'); const current=docs.find(doc=>doc.id===body.id&&doc.owner===owner);
  if(!current) return NextResponse.json({ok:false,error:'Publicación no encontrada.'},{status:404});
  const item={...JSON.parse(current.payload||'{}'),status:body.status||current.status||'Programada'};
  await setDocument('scheduled_posts',body.id,{owner,status:item.status,scheduledAt:current.scheduledAt||item.scheduledAt,payload:JSON.stringify(item),updatedAt:Date.now()}); return NextResponse.json({ok:true,item});
}

export async function DELETE(request) {
  const session=sessionFrom(request); if(!session?.access_token) return NextResponse.json({ok:false,error:'Conecta TikTok primero.'},{status:401});
  const id=new URL(request.url).searchParams.get('id'); if(!id) return NextResponse.json({ok:false,error:'Falta id.'},{status:400});
  const owner=normalizedOwner(session); const docs=await listDocuments('scheduled_posts'); const current=docs.find(doc=>doc.id===id&&doc.owner===owner); if(!current) return NextResponse.json({ok:false,error:'Publicación no encontrada.'},{status:404});
  await deleteDocument('scheduled_posts',id); return NextResponse.json({ok:true});
}
