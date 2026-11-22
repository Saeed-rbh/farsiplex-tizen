/* Public FarsiPlex catalogue adapter. No account credentials or persistent media URLs. */
(function () {
  'use strict';
  var base = 'https://farsiplex.com', cache = {}, pending = {}, episodeDates = {}, api = window.FP = {};
  api.base = base;
  function text(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function url(u, origin) { if(!u || !String(u).trim()) return ''; try { var x = new URL(u, origin || base); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (_) { return ''; } }
  function pageUrl(u) { var x = new URL(u, base); if (['farsiplex.com','farsiland.com'].indexOf(x.hostname)<0) throw new Error('Unexpected catalogue address.'); return x.href; }
  function doc(html) { return new DOMParser().parseFromString(html, 'text/html'); }
  function request(u, body) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(); x.open(body ? 'POST' : 'GET', u, true); x.timeout = 18000;
      if (body) x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      x.onload = function () { if (x.status >= 200 && x.status < 300) resolve({ html: x.responseText, url: x.responseURL || u }); else { var e=new Error('The website returned an error (' + x.status + '). Please try again.');e.status=x.status;reject(e); } };
      x.onerror = function () { reject(new Error('Cannot reach the video website. Check the connection and try again.')); };
      x.ontimeout = function () { reject(new Error('The website took too long to respond. Please try again.')); };
      x.send(body || null);
    });
  }
  var readQueue=[],activeReads=0;
  function queuedRead(u){return new Promise(function(resolve,reject){readQueue.push({url:u,resolve:resolve,reject:reject});pumpReads();});}
  function pumpReads(){readQueue.sort(function(a,b){return window.FPWork?FPWork.priority(a.url)-FPWork.priority(b.url):0;});while(activeReads<3&&readQueue.length){activeReads++;(function(job){request(job.url).then(function(r){activeReads--;job.resolve(r);pumpReads();},function(e){activeReads--;job.reject(e);pumpReads();});})(readQueue.shift());}}
  if(window.FPWork)FPWork.onResume(pumpReads);
  function get(u) { u = pageUrl(u); var c = cache[u]; if (c && Date.now() - c.time < 120000) return Promise.resolve(c.data); if(pending[u])return pending[u];pending[u]=queuedRead(u).catch(function(e){return recoverMovedPage(u,e);}).then(function (r) { delete pending[u];if(Object.keys(cache).length>=32){var oldest=Object.keys(cache).sort(function(a,b){return cache[a].time-cache[b].time;})[0];delete cache[oldest];} cache[u] = { time: Date.now(), data: r }; return r; },function(e){delete pending[u];throw e;});return pending[u]; }

  // FarsiPlex periodically changes the eight-hex suffix on public permalinks.
  // Recover only a unique, same-site, same-kind, exact slug match after a 404.
  function permalink(u){var x=new URL(u,base),m=x.pathname.match(/^\/(movie|tvshow|episode)\/([^/]+)\/?$/);return x.origin===base&&m?{kind:m[1],slug:m[2].replace(/-[a-f0-9]{8}$/i,'')}:null;}
  api.permalinkKey=function(u){var p=permalink(u);return p?p.kind+'/'+p.slug:u;};
  function recoverMovedPage(u,error){var original=permalink(u);if(error.status!==404||!original)throw error;
    return get(base+'/?s='+encodeURIComponent(original.slug.replace(/-/g,' '))).then(function(r){
      var matches={},rows=catalogue(doc(r.html),r.url);
      rows.forEach(function(p){var candidate=permalink(p.url);if(candidate&&candidate.kind===original.kind&&candidate.slug===original.slug&&p.url!==u)matches[p.url]=true;});
      var urls=Object.keys(matches);if(!urls.length&&original.kind==='episode')return recoverMovedEpisode(original,error);if(urls.length!==1)throw error;
      return queuedRead(urls[0]);
    });
  }

  function recoverMovedEpisode(original,error){var m=original.slug.match(/^(.+)-ep\d+(?:-.*)?$/i);if(!m)throw error;
    return get(base+'/?s='+encodeURIComponent(m[1].replace(/-/g,' '))).then(function(r){
      var parents=catalogue(doc(r.html),r.url).filter(function(p){var k=permalink(p.url);return k&&k.kind==='tvshow'&&k.slug===m[1];});
      if(parents.length!==1)throw error;
      return get(parents[0].url).then(function(page){var matches={};episodeRows(doc(page.html),parents[0]).forEach(function(ep){var k=permalink(ep.url);if(k&&k.slug===original.slug)matches[ep.url]=true;});var urls=Object.keys(matches);if(urls.length!==1)throw error;return queuedRead(urls[0]);});
    });
  }

  // Episode lists can run oldest-first within seasons and newest-season-first.
  // Prefer the highest season/episode: an older episode may carry a recent edit date.
  function dateNumber(value){var m=value.trim().match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i),year,month,day;if(m){year=+m[3];month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].toLowerCase());day=+m[2];}else{m=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);if(!m)return null;year=+m[1];month=+m[2]-1;day=+m[3];}var d=new Date(Date.UTC(year,month,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month&&d.getUTCDate()===day?d.getTime():null;}
  function latestEpisode(d){var best=null,ordered=null;Array.prototype.forEach.call(d.querySelectorAll('#seasons .episodiotitle, #serie_contenido .episodiotitle'),function(item){var node=item.querySelector('.date,time');if(!node)return;var date=node.getAttribute('datetime')||text(node),number=dateNumber(date),li=item.closest('li'),m=li&&text(li.querySelector('.numerando')).match(/^(\d+)\s*-\s*(\d+)$/);if(number===null)return;var value={date:text(node)||date.slice(0,10),number:number};if(!best||number>best.number)best=value;if(m){var season=+m[1],episode=+m[2];value.season=season;value.episode=episode;if(!ordered||season>ordered.season||season===ordered.season&&episode>ordered.episode)ordered={season:season,episode:episode,data:value};}});return ordered?ordered.data:best;}
  api.latestEpisode=function(post){var u=pageUrl(post.url),saved=episodeDates[u];if(saved&&Date.now()-saved.time<120000)return Promise.resolve(saved.data);return get(u).then(function(r){var value=latestEpisode(doc(r.html));if(Object.keys(episodeDates).length>100)episodeDates={};episodeDates[u]={time:Date.now(),data:value};return value;});};
  function headerDate(d){var n=d.querySelector('.data .extra > .date');if(!n)return null;var label=text(n),number=dateNumber(label);return number===null?null:{date:label,number:number};}
  var recoveredSeries={},episodeFeeds={};
  function canonical(u){return new URL(u,base).href.replace(/\/?$/,'/');}
  function episodeRows(d,series){var seen={},out=[];Array.prototype.forEach.call(d.querySelectorAll('#seasons .episodiotitle a, #serie_contenido .episodiotitle a'),function(a){var u=url(a.getAttribute('href'),series.url);if(!u||new URL(u).hostname!==new URL(series.url).hostname||!/\/episodes?\/[^/]+\/?$/.test(new URL(u).pathname)||seen[u])return;seen[u]=true;var li=a.closest('li');out.push({seriesUrl:series.url,seriesTitle:series.title,url:u,title:text(a),image:li?picture(li):'',imageVariants:li?pictureVariants(li):[],date:li?text(li.querySelector('.date')):'',sub:li?text(li.querySelector('.numerando')):''});});return out;}
  // Some series pages omit their episode list. An episode's ALL link supplies
  // explicit parent identity; a similar title or slug alone is never sufficient.
  function recoverEpisodes(post){var key=canonical(post.url),saved=recoveredSeries[key];if(saved&&Date.now()-saved.time<120000)return saved.promise;var entry={time:Date.now(),promise:null};recoveredSeries[key]=entry;
    var origin=new URL(post.url).origin,slug=new URL(post.url).pathname.split('/').filter(Boolean).pop(),visited={};
    function candidates(r,feed){return r.posts.filter(function(p){var u=new URL(p.url),stem=u.pathname.split('/').filter(Boolean).pop();return u.hostname===new URL(post.url).hostname&&/\/episodes?\//.test(u.pathname)&&!visited[p.url]&&(!feed||stem.indexOf(slug+'-')===0);}).sort(function(a,b){var prefix='/'+slug+'-';return (b.url.indexOf(prefix)>=0?1:0)-(a.url.indexOf(prefix)>=0?1:0);}).slice(0,3);}
    function verify(rows){var i=0;function next(){if(i>=rows.length)return null;var candidate=rows[i++];visited[candidate.url]=true;return get(candidate.url).then(function(r){var d=doc(r.html),parent=Array.prototype.some.call(d.querySelectorAll('.pag_episodes a[href]'),function(a){var u=url(a.getAttribute('href'),candidate.url);return u&&canonical(u)===key;});if(!parent)return next();var episodes=episodeRows(d,post);if(!episodes.some(function(p){return canonical(p.url)===canonical(candidate.url);})){episodes.push({url:candidate.url,title:candidate.title,image:candidate.image||'',seriesUrl:post.url,seriesTitle:post.title,sub:''});}return{episodes:episodes,latest:latestEpisode(d)};});}return Promise.resolve().then(next);}
    entry.promise=api.list(new URL('/?s='+encodeURIComponent(post.title),post.url).href).then(function(r){return verify(candidates(r,false));}).then(function(found){if(found)return found;var feed=episodeFeeds[origin];if(!feed||Date.now()-feed.time>=120000){feed={time:Date.now(),promise:api.list(origin+(origin==='https://farsiland.com'?'/episodes-15/':'/episode/'))};episodeFeeds[origin]=feed;feed.promise.catch(function(){if(episodeFeeds[origin]===feed)delete episodeFeeds[origin];});}return feed.promise.then(function(r){return verify(candidates(r,true));}).then(function(result){return result||{episodes:[],latest:null};});}).catch(function(e){if(recoveredSeries[key]===entry)delete recoveredSeries[key];throw e;});return entry.promise;
  }
  api.dateInfo=function(post){return get(post.url).then(function(r){var d=doc(r.html);if(!d.querySelector('.data h1'))throw new Error('The website did not provide a usable title page. Please try Refresh.');var series=/\/tvshows?\//.test(post.url),episodes=series?episodeRows(d,post):[],result={header:headerDate(d),latest:latestEpisode(d),episodeCount:series?episodes.length:null};if(!series||episodes.length)return result;return recoverEpisodes(post).then(function(recovered){result.episodeCount=recovered.episodes.length;if(recovered.latest)result.latest=recovered.latest;return result;});});};
  api.headerDate=function(post){return get(post.url).then(function(r){return headerDate(doc(r.html));});};
  function picture(node) { var im = node.querySelector('img[data-src], img'); return im ? url(im.getAttribute('data-src') || im.getAttribute('src') || '') : ''; }
  function pictureVariants(node){var im=node.querySelector('img[data-srcset],img[srcset]');if(!im)return [];var origin=picture(node),out=[];(im.getAttribute('data-srcset')||im.getAttribute('srcset')||'').split(',').forEach(function(item){var m=item.trim().match(/^(\S+)\s+(\d+)w$/),u=m&&url(m[1]);if(u&&origin&&new URL(u).origin===new URL(origin).origin)out.push({url:u,width:+m[2]});});return out.sort(function(a,b){return a.width-b.width;});}

  function catalogue(d,origin) {
    var found = {}, posts = [];
    Array.prototype.forEach.call(d.querySelectorAll('article.item, .search-page .result-item'), function (a) {
      var link = a.querySelector('.data h3 a, .title a, h3 a, .poster a, .image a');
      if (!link) return; var href = url(link.getAttribute('href'),origin);
      if (!href || !/\/(movies?|tvshows?|episodes?|season)\//.test(href) || found[href]) return;
      found[href] = true;
      var title = text(a.querySelector('.data h3, .title, h3')) || (a.querySelector('img') || {}).alt || text(link);
      var summary = text(a.querySelector('.data > span, .metadata, .details')); var rating = text(a.querySelector('.rating'));if(/\/tvshows?\//.test(href))summary='Latest episode…';
      posts.push({ url: href, title: title, image: picture(a), imageVariants:pictureVariants(a), sub: summary, fullTitle:(a.querySelector('img')||{}).alt||title, rating: Number(rating) > 0 ? rating : '' });
    });
    return posts;
  }
  api.list = function (path) { return get(path).then(function (r) {
    var d = doc(r.html), next = d.querySelector('.pagination a.next, a.next.page-numbers'), current = d.querySelector('.pagination .current');
    if (!next && current) { var sibling = current.nextElementSibling; if (sibling && sibling.tagName === 'A') next = sibling; }
    if (!next) { var links = d.querySelectorAll('.pagination a'); for (var i = 0; i < links.length; i++) if (/next|›|»|chevron-right|arrow-right/i.test(links[i].outerHTML)) next = links[i]; }
    return { posts: catalogue(d,r.url), next: next ? url(next.getAttribute('href'),r.url) : null };
  }); };

  var sortedSeries=null,seriesSnapshots={},seriesVersion=0;
  function seriesPage(snapshot,start){return{posts:snapshot.posts.slice(start,start+30),next:start+30<snapshot.posts.length?'fp-series:'+snapshot.id+':'+(start+30):null,sortLabel:'Newest episodes first'};}
  // Build one globally sorted series snapshot before slicing it into TV-sized pages.
  function sortedSeriesList(progress){if(sortedSeries&&Date.now()-sortedSeries.time<120000)return sortedSeries.promise;var state={time:Date.now(),promise:null};sortedSeries=state;var posts=[],seen={},pages={};
    function collect(page){if(pages[page]||Object.keys(pages).length>=100)throw new Error('The website returned an invalid catalogue page sequence.');pages[page]=true;return api.list(page).then(function(r){r.posts.forEach(function(p){if(p.url.indexOf('/tvshow/')>=0&&!seen[p.url]){seen[p.url]=true;p._sortIndex=posts.length;posts.push(p);}});if(r.next){var n=new URL(r.next);if(n.hostname!=='farsiplex.com'||!/^\/tvshow\/(?:page\/\d+\/)?$/.test(n.pathname))throw new Error('Unexpected TV show catalogue page.');return collect(r.next);}});}
    state.promise=collect(base+'/tvshow/?orderby=modified&order=DESC').then(function(){var index=0,finished=0;function worker(){if(index>=posts.length)return Promise.resolve();if(window.FPWork&&FPWork.paused())return FPWork.background(worker);var p=posts[index++];return api.latestEpisode(p).then(function(d){p.latestEpisodeDate=d?d.date:null;p._latestNumber=d?d.number:null;p.sub=d?'Latest: '+d.date:'Latest episode unavailable';},function(){p.latestEpisodeDate=null;p._latestNumber=null;p.sub='Latest episode unavailable';}).then(function(){finished++;if(progress)progress('Checking latest episodes… '+finished+' / '+posts.length);return worker();});}return Promise.all([worker(),worker(),worker()]);}).then(function(){posts.sort(function(a,b){var x=a._latestNumber,y=b._latestNumber;return x===y?a._sortIndex-b._sortIndex:x===null?1:y===null?-1:y-x;});var id=++seriesVersion,snapshot={id:id,posts:posts};seriesSnapshots[id]=snapshot;Object.keys(seriesSnapshots).sort(function(a,b){return +a-+b;}).slice(0,-4).forEach(function(k){delete seriesSnapshots[k];});return snapshot;},function(e){if(sortedSeries===state)sortedSeries=null;throw e;});return state.promise;
  }
  api.catalogue=function(path,progress){var token=String(path).match(/^fp-series:(\d+):(\d+)$/);if(token){var snapshot=seriesSnapshots[token[1]];return snapshot?Promise.resolve(seriesPage(snapshot,+token[2])):Promise.reject(new Error('This catalogue has refreshed. Choose Refresh to load it again.'));}var u=new URL(path,base);if(u.pathname==='/tvshow/'&&!u.search)return sortedSeriesList(progress).then(function(s){return seriesPage(s,0);});if(/^\/movie\/(?:page\/\d+\/)?$/.test(u.pathname)&&!u.searchParams.has('s')){u.searchParams.set('orderby','date');u.searchParams.set('order','DESC');return api.list(u.href).then(function(r){r.sortLabel='Newest uploads first';return r;});}return api.list(path);};
  api.detail = function (post) { return get(post.url).then(function (r) {
    var d = doc(r.html), p = { url: post.url, title: text(d.querySelector('.data h1, .epih1, h1')) || post.title, image: post.image || picture(d.querySelector('.poster') || d), detailImage: picture(d.querySelector('.poster') || d), plot: '', meta: Array.prototype.map.call(d.querySelectorAll('.data .extra > span:not(.date)'),function(n){return text(n);}).filter(Boolean).join(' · '), episodes: [], watch: null, seasons: [], seriesUrl:post.seriesUrl||null, seriesTitle:post.seriesTitle||null, nextEpisode:null };
    var published=headerDate(d);p.headerDate=published?published.date:null;p._releaseNumber=published?published.number:null;
    var latest=latestEpisode(d);p.latestEpisodeDate=latest?latest.date:null;p._latestNumber=latest?latest.number:null;
    var extra=Array.prototype.map.call(d.querySelectorAll('.data .extra > span:not(.date)'),function(n){return text(n);}).filter(Boolean);
    p.meta=(published?published.date:'Title date unavailable')+(extra.length?' · '+extra.join(' · '):'');if(window.CatalogueDates){CatalogueDates.apply(p);if(p.dateBasis==='episode')p.meta+=' · Latest episode: '+p.latestEpisodeDate;}
    Array.prototype.forEach.call(d.querySelectorAll('.pag_episodes a[href]'),function(a){var raw=a.getAttribute('href');if(!raw||raw==='#'||a.classList.contains('nonex'))return;var u=url(raw,p.url);if(!u||new URL(u).hostname!==new URL(p.url).hostname)return;if(/\/tvshows?\/[^/]+\/?$/.test(new URL(u).pathname)){p.seriesUrl=u;p.seriesTitle=a.getAttribute('title')||'Series';}else if(/^NEXT$/i.test(text(a))&&/\/episodes?\/[^/]+\/?$/.test(new URL(u).pathname)&&u!==p.url)p.nextEpisode={url:u,title:a.getAttribute('title')||'Next episode'};});
    var plot = d.querySelector('#info .wp-content, .wp-content'); if (plot) { var clean = plot.cloneNode(true); Array.prototype.forEach.call(clean.querySelectorAll('.galeria,script,style'), function (n) { n.remove(); }); p.plot = text(clean); }
    p.cast=[];Array.prototype.forEach.call(d.querySelectorAll('#cast .person, .persons .person[itemprop="actor"]'),function(person){var name=text(person.querySelector('.name'))||((person.querySelector('meta[itemprop="name"]')||{}).content||'');if(name&&!p.cast.some(function(c){return c.name===name;}))p.cast.push({name:name,image:picture(person)});});p.cast=p.cast.slice(0,12);
    p.related=[];var relatedSeen={};Array.prototype.forEach.call(d.querySelectorAll('#single_relacionados article, #single_relacionados .item, .related article'),function(item){var a=item.querySelector('a[href]'),u=a&&url(a.getAttribute('href'),r.url);if(!u||relatedSeen[u]||u===p.url||['farsiplex.com','farsiland.com'].indexOf(new URL(u).hostname)<0||!/^\/(movies?|tvshows?)\//.test(new URL(u).pathname))return;relatedSeen[u]=true;p.related.push({url:u,title:text(item.querySelector('h3,.title'))||(item.querySelector('img')||{}).alt||text(a),image:picture(item)});});
    var bg=d.querySelector('.wallpaper img, .backdrop img, .galeria img');p.backdrop=bg?url(bg.getAttribute('data-src')||bg.getAttribute('src'),r.url):p.detailImage;
    var preview=d.querySelector('track[label*="thumbnail" i], track[kind="metadata"][src*="thumb"]');if(preview)p.previewTrack=url(preview.getAttribute('src'),r.url);
    var form = d.querySelector('form[id^="watch-"]');
    if (form) { var id = form.querySelector('input[name="id"]'); if (id && /^\d+$/.test(id.value)) p.watch = { id: id.value, action: url(form.getAttribute('action')) }; }
    if(new URL(p.url).hostname==='farsiland.com'){
      var content=d.querySelector('link[itemprop="contentUrl"]'),media=content&&url(content.getAttribute('href'));
      if(media&&/^https:\/\/pl\.farsiland\.buzz\/[^?#]+\.(480|720|1080)\.mp4$/.test(media))p.watch={provider:'farsiland',media:media};
      else {var publicForm=d.querySelector('form#watch'),action=publicForm&&url(publicForm.getAttribute('action'));if(action&&/^https:\/\/farsiland\.buzz\/redirect\.php\?id=[a-f0-9]+$/i.test(action))p.watch={provider:'farsiland',action:action};}
    }
    if(/\/episodes?\//.test(p.url)){var self=episodeRows(d,p).find(function(ep){return api.permalinkKey(ep.url)===api.permalinkKey(p.url);}),number=self&&String(self.sub).match(/^(\d+)\s*-\s*(\d+)$/);if(!number)number=p.title.match(/:\s*(\d+)x(\d+)\s*$/i);if(number){p.seasonNumber=+number[1];p.episodeNumber=+number[2];}}
    var seen = {};
    Array.prototype.forEach.call(/\/tvshows?\//.test(p.url)?d.querySelectorAll('#seasons .episodiotitle a, #serie_contenido .episodiotitle a'):[], function (a) {
      var u = url(a.getAttribute('href'),p.url); if (!u || seen[u]) return; seen[u] = true; var li = a.closest('li');
      p.episodes.push({ seriesUrl:p.url, seriesTitle:p.title, url: u, title: text(a), image: li ? picture(li) : '', date: li ? text(li.querySelector('.date')) : '', sub: li ? text(li.querySelector('.numerando')) : '' });
    });
    p.episodes.sort(function(a,b){var x=String(a.sub).match(/^(\d+)\s*-\s*(\d+)$/),y=String(b.sub).match(/^(\d+)\s*-\s*(\d+)$/);return x&&y?(+y[1]-+x[1]||+y[2]-+x[2]):0;});
    Array.prototype.forEach.call(d.querySelectorAll('form[action*="/season"]'), function (f) { var id = f.querySelector('input[name="id"]'); if (id && /^\d+$/.test(id.value)) p.seasons.push({ id: id.value, title: text(f.closest('.se-c') && f.closest('.se-c').querySelector('.se-q')) || 'Season ' + (p.seasons.length + 1) }); });
    if(/\/tvshows?\//.test(p.url)&&!p.episodes.length&&!p.seasons.length)return recoverEpisodes(p).then(function(recovered){p.episodes=recovered.episodes;p.episodes.sort(function(a,b){var x=String(a.sub).match(/^(\d+)\s*-\s*(\d+)$/),y=String(b.sub).match(/^(\d+)\s*-\s*(\d+)$/);return x&&y?(+y[1]-+x[1]||+y[2]-+x[2]):0;});if(recovered.latest){p.latestEpisodeDate=recovered.latest.date;p._latestNumber=recovered.latest.number;if(window.CatalogueDates){CatalogueDates.apply(p);if(p.dateBasis==='episode')p.meta+=' · Latest episode: '+p.latestEpisodeDate;}}return p;});
    return p;
  }); };

  api.nextEpisode=function(post){if(!/\/episodes?\//.test(post.url))return Promise.resolve(null);if(post.nextEpisode&&api.permalinkKey(post.nextEpisode.url)!==api.permalinkKey(post.url))return Promise.resolve(post.nextEpisode);if(!post.seriesUrl)return Promise.resolve(null);return api.detail({url:post.seriesUrl,title:post.seriesTitle||'Series'}).then(function(series){function canonical(u){return api.permalinkKey(new URL(u,base).href);}function number(ep){var m=String(ep.sub||'').match(/^(\d+)\s*-\s*(\d+)$/);return m?[+m[1],+m[2]]:null;}var current=series.episodes.find(function(ep){return canonical(ep.url)===canonical(post.url);}),n=current&&number(current);if(!n)return null;var ordered=series.episodes.filter(function(ep){var next=number(ep);return next&&(next[0]>n[0]||next[0]===n[0]&&next[1]>n[1]);});ordered.sort(function(a,b){var x=number(a),y=number(b);return x[0]-y[0]||x[1]-y[1];});return ordered[0]||null;});};
  api.season = function (id) { return request(base + '/season/', 'id=' + encodeURIComponent(id)).then(function (r) { var d = doc(r.html), seen = {}, out = []; Array.prototype.forEach.call(d.querySelectorAll('a[href*="/episode/"]'), function (a) { var u = url(a.getAttribute('href')); if (!u || seen[u]) return; seen[u] = true; var li = a.closest('li, article'); out.push({ url: u, title: text(a) || (a.querySelector('img') || {}).alt || 'Episode', image: li ? picture(li) : '', date: li ? text(li.querySelector('.date')) : '', sub: li ? text(li.querySelector('.numerando')) : '' }); }); return out; }); };
  api.sources = function (watch) {
    if(!watch||!/^\d+$/.test(String(watch.id||'')))return Promise.reject(new Error('The title page did not provide a valid video ID.'));
    // The public /play/ form now opens /play-live-now/. POST directly to
    // its canonical page so redirects cannot discard the episode ID.
    // Retain the earlier endpoint for older/cached site pages.
    var endpoints=['/play-adaptive-stream/','/play-live-now/'];
    if(watch.action){try{var action=new URL(watch.action,base);if(action.origin===base&&/^\/play(?:-live-now)?\/?$/.test(action.pathname))endpoints.reverse();}catch(_){} }
    function load(index){return request(base+endpoints[index],'id='+encodeURIComponent(watch.id)).then(function(r){
      var d=doc(r.html),seen={},out=[];
      Array.prototype.forEach.call(d.querySelectorAll('iframe.metaframe'),function(f,i){
        var u=url(f.getAttribute('src'),r.url);if(!u||seen[u]||new URL(u).origin!==base)return;seen[u]=true;
        var li=d.querySelector('#player-option-'+(i+1)),label=text(li&&li.querySelector('.title'))||('Source '+(i+1));
        if(/^(360|480|720|1080|2160)$/.test(label))label+='p';
        out.push({url:u,label:label,server:text(li&&li.querySelector('.server'))});
      });
      if(!out.length)throw new Error('No playable video sources were returned by the website.');return out;
    }).catch(function(e){if(index+1<endpoints.length)return load(index+1);throw e;});}
    return load(0);
  };
  api.resolve = function (embed) { return request(pageUrl(embed)).then(function (r) {
    var scripts = doc(r.html).querySelectorAll('script'), data = null;
    for (var i = 0; i < scripts.length; i++) { var match = scripts[i].textContent.match(/var\s+jw\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/); if (match) { try { data = JSON.parse(match[1]); } catch (_) {} } }
    if (!data) throw new Error('The website player format has changed. Please try again later.');
    var list = [data.file, data.file2].map(function (u) { return url(u); }).filter(function (u, i, a) { return u && a.indexOf(u) === i; });
    var preview=(Array.isArray(data.tracks)?data.tracks:[]).find(function(t){return t.kind==='thumbnails'&&t.file;});if(preview)list.previewTrack=url(preview.file,r.url);
    if (!list.length) throw new Error('The website did not provide a video link.'); return list;
  }); };
  api.refresh = function(){cache={};episodeDates={};recoveredSeries={};episodeFeeds={};sortedSeries=null;};
  api._parseCatalogue = function (html) { return catalogue(doc(html)); };
})();
