const CATEGORIES=['Jokes, Memes & Humor','Medicine & Health','Investing & Economics','Politics & Society','Science & Technology','Personal Travel','Entertainment / Culture','Religion','Personal Reflections','Other'];
const REPO='kavurum-byte/personal-perspectives';
const respond=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
  if(!env.GITHUB_TOKEN||!env.SUBMISSION_PASSWORD)return respond(503,{error:'Publishing is not configured yet. Set GITHUB_TOKEN and SUBMISSION_PASSWORD in Cloudflare Pages secrets.'});
  if(new URL(request.url).origin!==request.headers.get('origin'))return respond(403,{error:'Origin not permitted.'});
  let data;try{data=await request.json()}catch{return respond(400,{error:'Invalid submission.'})}
  if(typeof data.password!=='string'||data.password.length>256||data.password!==env.SUBMISSION_PASSWORD)return respond(401,{error:'Incorrect publishing password.'});
  if(typeof data.url!=='string'||data.url.length>2048||!CATEGORIES.includes(data.category))return respond(400,{error:'Invalid link or category.'});
  let url;try{url=new URL(data.url)}catch{return respond(400,{error:'Invalid Facebook URL.'})}
  if(url.protocol!=='https:'||!['facebook.com','www.facebook.com','m.facebook.com','web.facebook.com','fb.watch'].includes(url.hostname.toLowerCase()))return respond(400,{error:'Only Facebook post links are supported.'});
  const headers={'authorization':'Bearer '+env.GITHUB_TOKEN,'accept':'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'Manis-Perspectives-Cloudflare-Pages','content-type':'application/json'};
  const path='https://api.github.com/repos/'+REPO+'/contents/posts.json';
  try{
    const current=await fetch(path,{headers});if(!current.ok){const status=current.status;let reason=({401:'GitHub rejected the token.',403:'GitHub denied access.',404:'Repository or posts.json was not found or is inaccessible.'})[status]||'GitHub returned an unexpected response.';if(status===403){const remaining=current.headers.get('x-ratelimit-remaining');const retry=current.headers.get('retry-after');let detail='';try{const payload=await current.json();if(typeof payload.message==='string')detail=payload.message.slice(0,350)}catch{};if(remaining==='0')reason='GitHub API rate limit reached.';else if(retry)reason='GitHub requested a retry after '+retry+' seconds.';else if(/rate limit|secondary rate limit|abuse detection/i.test(detail))reason='GitHub API rate limiting: '+detail;else if(detail)reason='GitHub says: '+detail;const accepted=current.headers.get('x-accepted-github-permissions');const requestId=current.headers.get('x-github-request-id');const remainingLabel=remaining===null?'unknown':remaining;reason+=' [rate-limit remaining: '+remainingLabel+(accepted?'; required permissions: '+accepted.slice(0,120):'')+(requestId?'; GitHub request ID: '+requestId.slice(0,100):'')+']';}return respond(502,{error:`Could not load the website archive from GitHub (HTTP ${status}). ${reason}`});}
    const file=await current.json();
    const decoded=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
    const posts=JSON.parse(new TextDecoder().decode(decoded));
    if(posts.some(p=>(p.urls||[]).includes(url.href)))return respond(200,{status:'duplicate',message:'This Facebook link is already on the website.'});
    const id='fb-link-'+crypto.randomUUID();
    const submittedTitle=typeof data.title==='string'?data.title.trim().slice(0,120):'';
    const submittedDescription=typeof data.description==='string'?data.description.trim().slice(0,500):'';
    const title=submittedTitle||(data.category==='Jokes, Memes & Humor'?'Facebook humor post (link)':'Facebook post (link)');
    const commentary=submittedDescription||'View the original Facebook post.';
    posts.unshift({id,date:new Date().toISOString().slice(0,10),category:data.category,title,text:commentary,fullText:commentary,excerpt:commentary,urls:[url.href],sources:[{publisher:'Facebook',url:url.href,title:'Original Facebook post'}]});
    const bytes=new TextEncoder().encode(JSON.stringify(posts,null,2)+'\n');
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.slice(i,i+8192));
    const saved=await fetch(path,{method:'PUT',headers,body:JSON.stringify({message:'Publish Facebook link from website form',sha:file.sha,content:btoa(binary)})});
    if(!saved.ok)return respond(saved.status===409?409:502,{error:saved.status===409?'Another update occurred. Please submit again.':'GitHub could not save the post.'});
    return respond(200,{status:'published',message:'Facebook link saved. It should appear after Cloudflare redeploys.'});
  }catch{return respond(500,{error:'Publishing failed. Please try again later.'})}
}
