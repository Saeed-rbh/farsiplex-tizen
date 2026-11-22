/* Device-local preferences and verified series subscriptions. No media URLs. */
(function(){
  'use strict';
  var E=window.TVExperience={};
  function read(k,f){try{return window.FPStore?FPStore.read('farsiplex.'+k,f):(JSON.parse(localStorage.getItem('farsiplex.'+k))||f);}catch(_){return f;}}
  function write(k,v){try{window.FPStore?FPStore.write('farsiplex.'+k,v):localStorage.setItem('farsiplex.'+k,JSON.stringify(v));return true;}catch(_){return false;}}
  function series(p){try{var u=new URL(p.url);return /^https:$/.test(u.protocol)&&/^(farsiplex|farsiland)\.com$/.test(u.hostname)&&/^\/tvshows?\/[^/]+\/$/.test(u.pathname);}catch(_){return false;}}
  E.preference=function(){var p=read('quality',null);return p&&typeof p.label==='string'?p:null;};
  E.rememberQuality=function(s){if(s)write('quality',{label:s.label,server:s.server||''});};
  E.pick=function(sources,p){p=p||E.preference();if(!p)return null;return sources.find(function(s){return s.label===p.label&&s.server===p.server;})||sources.find(function(s){return s.label===p.label;})||sources[0];};
  E.following=function(){var a=read('following.v1',[]);return Array.isArray(a)?a.filter(series).slice(0,100):[];};
  E.isFollowing=function(p){return E.following().some(function(x){return FP.permalinkKey(x.url)===FP.permalinkKey(p.url);});};
  E.toggleFollow=function(p){if(!series(p))return false;var a=E.following(),has=E.isFollowing(p);a=a.filter(function(x){return FP.permalinkKey(x.url)!==FP.permalinkKey(p.url);});if(!has)a.unshift({url:p.url,title:p.title,image:p.image});return write('following.v1',a);};
  E.newEpisodes=function(){return E.following().reduce(function(out,p){return out.concat((p.episodes||[]).filter(function(ep){return !WatchHistory.isWatched(ep.url)&&!WatchHistory.get(ep.url);}));},[]).slice(0,40);};
  E.updateFollow=function(p){if(!series(p))return;WatchHistory.linkSeries(p);var a=E.following(),item=a.find(function(x){return FP.permalinkKey(x.url)===FP.permalinkKey(p.url);});if(!item)return;item.url=p.url;item.title=p.title;item.image=p.image;item.checked=Date.now();item.episodes=(p.episodes||[]).slice(0,100).map(function(ep){return {url:ep.url,title:ep.title,image:ep.image,sub:ep.sub,seriesUrl:p.url,seriesTitle:p.title};});write('following.v1',a);};
  var checking=null,listeners=[];
  E.checkFollowing=function(changed){if(changed)listeners.push(changed);if(checking)return checking;var queue=E.following().filter(function(p){return !p.checked||Date.now()-p.checked>120000;}),i=0;
    function worker(){if(i>=queue.length)return Promise.resolve();if(window.FPWork&&FPWork.paused())return FPWork.background(worker);if(window.FPWork)FPWork.order(queue,i);return FP.detail(queue[i++]).then(function(p){if(E.isFollowing(p)){E.updateFollow(p);listeners.forEach(function(fn){fn();});}},function(){}).then(worker);}
    checking=Promise.all([worker(),worker()]).then(function(){checking=null;listeners=[];});return checking;
  };
  E.hydrateHistory=function(){var queue=WatchHistory.list().filter(function(p){return /\/episodes?\//.test(p.url)&&!p.seriesUrl;}),i=0,changed=0;function worker(){if(i>=queue.length)return Promise.resolve();if(window.FPWork&&FPWork.paused())return FPWork.background(worker);if(window.FPWork)FPWork.order(queue,i);return FP.detail(queue[i++]).then(function(p){if(p.seriesUrl){WatchHistory.attachParent(p);changed++;}},function(){}).then(worker);}return worker().then(function(){return changed;});};
  E.cached=function(path){var a=read('browse.v1',{}),v=a[path];return v&&Array.isArray(v.posts)&&Date.now()-v.time<86400000?v:null;};
  E.cache=function(path,data){if(!/^\/(explore|movie|tvshow)\/$/.test(path))return;var a=read('browse.v1',{});a[path]={time:Date.now(),posts:data.posts.slice(0,20)};write('browse.v1',a);};
})();
