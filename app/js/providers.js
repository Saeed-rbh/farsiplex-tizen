/* Explicit provider selection. Match published identities, never invent page URLs. */
(function(){
  'use strict';
  if(window.FP_DISABLE_EXTRA_SOURCE)return;
  var C=window.TitleProviders={};
  function host(p){return new URL(p.url).hostname;}
  function name(s){return String(s||'').toLowerCase().replace(/[\s\-_:،,.!؟?'’"()\u200c]+/g,'');}
  function kind(p){return /\/episodes?\//.test(p.url)?'episode':/\/tvshows?\//.test(p.url)?'series':'movie';}
  function year(p){return Number.isFinite(p._releaseNumber)?new Date(p._releaseNumber).getUTCFullYear():null;}
  function unique(rows){var seen={};return rows.filter(function(p){var key=FP.permalinkKey(p.url);if(seen[key])return false;seen[key]=true;return true;});}
  function info(p){var title=p.fullTitle||p.title||'',m=title.match(/^(.*?)\s*(?:SE?\s*0*(\d+)\s*)?EP(?:ISODE)?\s*0*(\d+)(?:\s*:\s*\d+x\d+)?\s*$/i),n=String(p.sub||'').match(/^(\d+)\s*-\s*(\d+)$/)||String(p.sub||'').match(/S(\d+)\s*E(\d+)/i);return {title:p.seriesTitle&&p.seriesTitle!=='Series'?p.seriesTitle:m?m[1]:'',season:p.seasonNumber||(n?+n[1]:m&&m[2]?+m[2]:null),episode:p.episodeNumber||(n?+n[2]:m?+m[3]:null)};}
  function error(){return new Error('This source has not listed a verified matching title or episode. Choose the other source or Back.');}
  C.label=function(p){return host(p)==='farsiland.com'?'Farsiland':'FarsiPlex';};
  C.select=function(post,provider){var wanted=provider==='Farsiland'?'farsiland.com':'farsiplex.com';if(host(post)===wanted)return Promise.resolve(post);
    var episode=kind(post)==='episode',id=episode?info(post):null,title=episode?id.title:post.title;if(!title) return Promise.reject(error());
    var origin='https://'+wanted;
    function sameYear(a,b){var x=year(a),y=year(b);return x!==null&&y!==null&&x===y;}
    function load(p){return FP.detail(p).then(function(d){if(host(d)!==wanted)throw error();return Object.assign({},p,d);});}
    function episodeFeed(){if(!id.season||!id.episode)throw error();return FP.list(origin+(wanted==='farsiplex.com'?'/episode/':'/episodes-15/')).then(function(r){var rows=unique(r.posts.filter(function(p){var x=info(p);return host(p)===wanted&&kind(p)==='episode'&&name(x.title)===name(title)&&x.episode===id.episode;}));if(window.FPDiagnostics)FPDiagnostics('episode-feed',{provider:wanted,total:r.posts.length,matches:rows.length,hasSeason:!!id.season,hasEpisode:!!id.episode});if(!rows.length||rows.length>3)throw error();return Promise.all(rows.map(function(p){return load(p).then(function(d){var x=info(d);return name(x.title)===name(title)&&x.season===id.season&&x.episode===id.episode?d:null;},function(){return null;});}));}).then(function(rows){rows=rows.filter(Boolean);if(rows.length!==1)throw error();return rows[0];});}
    var currentParent=episode&&post.seriesUrl?FP.detail({url:post.seriesUrl,title:title}).catch(function(){return null;}):Promise.resolve(post);
    return Promise.all([FP.list(origin+'/?s='+encodeURIComponent(title)),currentParent]).then(function(results){var rows=unique(results[0].posts.filter(function(p){return host(p)===wanted&&kind(p)===(episode?'series':kind(post))&&name(p.title)===name(title);}));
      if(window.FPDiagnostics)FPDiagnostics('provider-search',{provider:wanted,total:results[0].posts.length,matches:rows.length});if(rows.length!==1)throw error();
      return load(rows[0]).then(function(p){if(name(p.title)!==name(title)||!sameYear(results[1]||{},p))throw error();if(!episode)return p;
        var matches=p.episodes.filter(function(ep){var x=info(ep);return x.season===id.season&&x.episode===id.episode;});if(matches.length!==1)throw error();return load(matches[0]);
      });
    }).catch(function(e){if(window.FPDiagnostics)FPDiagnostics('alternate-lookup-fallback',{episode:episode});if(episode)return episodeFeed();throw e;});
  };
})();
