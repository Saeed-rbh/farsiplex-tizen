/* Device-local progress, keyed by public title page rather than expiring media URL. */
(function(){
  'use strict';
  var H=window.WatchHistory={},key='farsiplex.progress.v1';
  function identity(u){try{var x=new URL(u);return ((x.hostname==='farsiplex.com'&&/^\/(movie|episode)\/[^/]+\/?$/.test(x.pathname))||(x.hostname==='farsiland.com'&&/^\/(movies|episodes)\/[^/]+\/?$/.test(x.pathname)))?'https://'+x.hostname+x.pathname.replace(/\/?$/,'/'):null;}catch(_){return null;}}
  // Keep a usable page URL in storage; compare stable same-site permalinks.
  function stable(u){var id=identity(u);return id&&id.replace(/^(https:\/\/farsiplex\.com\/(?:movie|episode)\/[^/]+?)-[a-f0-9]{8}\/$/i,'$1/');}
  function same(a,b){var k=stable(a);return k!==null&&k===stable(b);}

  function read(){try{var a=(window.FPStore?FPStore.read(key,[]):JSON.parse(localStorage.getItem(key)||'[]'));return Array.isArray(a)?a.filter(function(p){return p&&identity(p.url)&&typeof p.title==='string'&&Number.isFinite(p.position)&&p.position>=5&&Number.isFinite(p.updated);}):[];}catch(_){return [];}}
  function write(a){try{window.FPStore?FPStore.write(key,a.slice(0,100)):localStorage.setItem(key,JSON.stringify(a.slice(0,100)));return true;}catch(_){return false;}}
  H.list=function(){var seen={};return read().sort(function(a,b){return b.updated-a.updated;}).filter(function(p){var k=stable(p.url);if(seen[k])return false;seen[k]=true;return true;});};
  H.continueList=function(){var seen={};return H.list().filter(function(p){var k=p.seriesUrl?FP.permalinkKey(p.seriesUrl):stable(p.url),latest;try{latest=(window.FPStore?FPStore.read('farsiplex.series-current.v1',{}):JSON.parse(localStorage.getItem('farsiplex.series-current.v1')||'{}'))[k];}catch(_){}if(latest&&!same(latest,p.url))return false;if(seen[k])return false;seen[k]=true;return true;});};
  H.attachParent=function(post){if(!post.seriesUrl)return;var a=read();a.forEach(function(p){if(same(p.url,post.url)){p.seriesUrl=post.seriesUrl;p.seriesTitle=post.seriesTitle;}});write(a);};
  H.linkSeries=function(series){var known={};(series.episodes||[]).forEach(function(ep){known[stable(ep.url)]=true;ep.seriesUrl=series.url;ep.seriesTitle=series.title;});var a=read(),changed=false;a.forEach(function(p){if(known[stable(p.url)]){p.seriesUrl=series.url;p.seriesTitle=series.title;changed=true;}});if(changed)write(a);};
  H.get=function(u){u=identity(u);return H.list().find(function(p){return same(p.url,u);})||null;};
  H.remove=function(u){u=identity(u);return write(read().filter(function(p){return !same(p.url,u);}));};
  H.save=function(post,position,duration){var u=post&&identity(post.url);if(!u||!Number.isFinite(position)||position<5)return false;
    if(post.seriesUrl){try{var current=(window.FPStore?FPStore.read('farsiplex.series-current.v1',{}):JSON.parse(localStorage.getItem('farsiplex.series-current.v1')||'{}'));current[FP.permalinkKey(post.seriesUrl)]=u;localStorage.setItem('farsiplex.series-current.v1',JSON.stringify(current));}catch(_){}}
    duration=Number.isFinite(duration)&&duration>0?duration:0;
    if(duration&&duration-position<=Math.min(30,duration*.02)){H.markWatched(post,true);return H.remove(u);}
    var p={url:u,title:String(post.title||'Untitled').slice(0,300),image:typeof post.image==='string'?post.image:'',backdrop:typeof post.backdrop==='string'?post.backdrop:'',sub:post.sub||'',seriesUrl:post.seriesUrl||'',seriesTitle:post.seriesTitle||'',position:position,duration:duration,updated:Date.now()},a=read().filter(function(x){return !same(x.url,u);});a.unshift(p);return write(a);
  };

  var watchedKey='farsiplex.watched.v1',watchedRaw=null,watchedCache=[];
  function watched(){try{var raw=(window.FPStore?FPStore.raw(watchedKey):localStorage.getItem(watchedKey))||'[]';if(raw!==watchedRaw){var a=JSON.parse(raw);watchedCache=Array.isArray(a)?a.filter(function(p){return p&&identity(p.url)&&/\/episodes?\//.test(p.url)&&Number.isFinite(p.updated);}):[];watchedRaw=raw;}return watchedCache;}catch(_){watchedRaw=null;watchedCache=[];return[];}}
  H.isWatched=function(u){u=identity(u);return watched().some(function(p){return same(p.url,u);});};
  H.markWatched=function(post,value){var u=post&&identity(post.url);if(!u||!/\/episodes?\//.test(u))return false;var a=watched().filter(function(p){return !same(p.url,u);});if(value)a.unshift({url:u,updated:Date.now()});try{localStorage.setItem(watchedKey,JSON.stringify(a.slice(0,1000)));watchedRaw=null;if(value)H.remove(u);return true;}catch(_){return false;}};
  H.complete=function(post){if(post)H.markWatched(post,true);return post?H.remove(post.url):false;};
  H.time=function(s){s=Math.max(0,Math.floor(s));return(s>=3600?Math.floor(s/3600)+':':'')+(s>=3600?('0'+Math.floor(s/60)%60).slice(-2):Math.floor(s/60))+':'+('0'+s%60).slice(-2);};
})();
