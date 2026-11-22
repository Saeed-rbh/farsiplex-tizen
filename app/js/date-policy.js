/* One cross-source rule for ranking titles; episode upload dates cannot revive old shows. */
(function(){
  'use strict';
  var policy=window.CatalogueDates={recentYears:4};
  function valid(n){return typeof n==='number'&&Number.isFinite(n);}
  policy.apply=function(p,clock){var now=new Date(clock===undefined?Date.now():clock),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()),cutoff=Date.UTC(now.getUTCFullYear()-policy.recentYears,now.getUTCMonth(),now.getUTCDate()),title=p._releaseNumber,episode=p._latestNumber;
    p.dateBasis='unknown';p._balancedNumber=null;p.recentSeries=false;p.sub=p.headerDate||'Title date unavailable';
    if(!valid(title)||title>today)return p;
    p.dateBasis='title';p._balancedNumber=title;
    if(/\/tvshows?\//.test(p.url)&&title>=cutoff){p.recentSeries=true;if(valid(episode)&&episode>=title&&episode<=today){p.dateBasis='episode';p._balancedNumber=episode;p.sub='Latest: '+p.latestEpisodeDate;}}
    return p;
  };
  policy.sort=function(posts,clock){posts.forEach(function(p,i){policy.apply(p,clock);p._dateOrder=i;});return posts.sort(function(a,b){var x=a._balancedNumber,y=b._balancedNumber;if(x!==y)return x===null?1:y===null?-1:y-x;var u=valid(a._releaseNumber)?a._releaseNumber:-Infinity,v=valid(b._releaseNumber)?b._releaseNumber:-Infinity;return u===v?a._dateOrder-b._dateOrder:v-u;});};
})();
