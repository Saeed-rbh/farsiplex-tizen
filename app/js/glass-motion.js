/* 30nama motion values adapted to the existing FarsiPlex focus/player owner. */
(function(){'use strict';
 var reduced=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
 function calm(){return reduced&&reduced.matches;}
 // The reference's cubic-bezier(.16,1,.3,1), including interruption from current position.
 function curve(x){var lo=0,hi=1,t=.5;for(var i=0;i<12;i++){t=(lo+hi)/2;var v=3*(1-t)*(1-t)*t*.16+3*(1-t)*t*t*.3+t*t*t;if(v<x)lo=t;else hi=t;}return 1-Math.pow(1-t,3);}
 var G=window.TVGlass={};
 function scroll(node,to,vertical){var prop=vertical?'scrollTop':'scrollLeft',frameKey=vertical?'_glassYFrame':'_glassFrame',limit=vertical?node.scrollHeight-node.clientHeight:node.scrollWidth-node.clientWidth;to=Math.max(0,Math.min(to,limit));if(node[frameKey])cancelAnimationFrame(node[frameKey]);if(calm()||!window.requestAnimationFrame){node[prop]=to;return;}var start=node[prop],delta=to-start,begin=Date.now(),duration=document.body.classList.contains('fast')?130:240;if(Math.abs(delta)<2){node[prop]=to;return;}node[prop]=start+delta*.04;function frame(){var t=Math.min(1,(Date.now()-begin)/duration);node[prop]=start+delta*curve(t);node[frameKey]=t<1?requestAnimationFrame(frame):null;}node[frameKey]=requestAnimationFrame(frame);}
 G.backdropOut=function(node,art){if(calm())return;var previous=node.querySelector('.backdrop-out');if(previous)previous.remove();var layer=document.createElement('div');layer.className='backdrop-out';layer.style.backgroundImage=art;node.appendChild(layer);var a=layer.animate([{opacity:1},{opacity:0}],{delay:100,duration:480,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});a.onfinish=function(){layer.remove();};};
 // Commit the logical scroll once, then let the compositor move the track.
 // Reading the in-flight transform lets a held key or reversal continue smoothly.
 G.scroll=function(node,left){
   var track=node.querySelector('.scroll-track');
   if(!track||!track.animate){scroll(node,left,false);return;}
   var style=getComputedStyle(node);
   var limit=Math.max(0,track.offsetWidth+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)-node.clientWidth);
   left=Math.max(0,Math.min(left,limit));
   if(calm()){
     if(track._scrollAnimation)track._scrollAnimation.cancel();
     track._scrollAnimation=null;
     node.scrollLeft=left;
     return;
   }
   var previous=node.scrollLeft;
   if(Math.abs(left-previous)<1)return;
   var position=new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
   if(track._scrollAnimation)track._scrollAnimation.cancel();
   node.scrollLeft=left;
   var offset=position+node.scrollLeft-previous;
   var animation=track.animate([
     {transform:'translateX('+offset+'px)'},
     {transform:'translateX(0)'}
   ],{duration:document.body.classList.contains('fast')?130:240,easing:'cubic-bezier(.16,1,.3,1)'});
   track._scrollAnimation=animation;
   animation.onfinish=function(){if(track._scrollAnimation===animation)track._scrollAnimation=null;};
 };
 G.scrollY=function(node,top){scroll(node,top,true);};
 function enter(node,sheet){if(calm()||!node||!node.animate)return;node.animate([{opacity:sheet?1:0,transform:sheet?'translateY(100%)':'translateY(16px)'},{opacity:1,transform:'none'}],{duration:240,easing:sheet?'cubic-bezier(.16,1,.3,1)':'cubic-bezier(.2,.8,.2,1)'});}
 G.exit=function(node,sheet){if(calm()||!node||node.classList.contains('hidden')||!node.animate)return;var copy=node.cloneNode(true),originals=[node].concat(Array.prototype.slice.call(node.querySelectorAll('*'))),clones=[copy].concat(Array.prototype.slice.call(copy.querySelectorAll('*'))),rect=node.getBoundingClientRect();originals.forEach(function(original,i){var style=getComputedStyle(original),target=clones[i];target.style.cssText=Array.prototype.map.call(style,function(key){return key+':'+style.getPropertyValue(key)+';';}).join('');target.style.pointerEvents='none';target.removeAttribute('id');target.removeAttribute('class');Array.prototype.slice.call(target.attributes).forEach(function(a){if(a.name.indexOf('data-')===0)target.removeAttribute(a.name);});target.style.animation='none';target.style.transition='none';target.removeAttribute('autofocus');if(target.tagName==='BUTTON'||target.tagName==='INPUT')target.disabled=true;});copy.classList.add('motion-exit');copy.setAttribute('aria-hidden','true');copy.style.position='fixed';copy.style.left=rect.left+'px';copy.style.top=rect.top+'px';copy.style.right='auto';copy.style.bottom='auto';copy.style.width=rect.width+'px';copy.style.height=rect.height+'px';copy.style.zIndex='89';document.body.appendChild(copy);var animation=copy.animate([{opacity:1,transform:'none'},{opacity:sheet?1:0,transform:sheet?'translateY(100%)':'translateY(16px)'}],{duration:160,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});animation.onfinish=function(){copy.remove();};};
 ['modal','episode-picker','player-options'].forEach(function(id){var node=document.getElementById(id);if(!node)return;new MutationObserver(function(records){if(node.classList.contains('hidden'))return;for(var i=0;i<records.length;i++)if((records[i].oldValue||'').split(/\s+/).indexOf('hidden')>=0){enter(id==='modal'?node.querySelector('.modal-box'):node,id==='episode-picker');break;}}).observe(node,{attributes:true,attributeFilter:['class'],attributeOldValue:true});});
 var lastKey=0,fastTimer;
 document.addEventListener('keydown',function(e){if(e.keyCode<37||e.keyCode>40)return;var now=Date.now();if(e.repeat||now-lastKey<160)document.body.classList.add('fast');lastKey=now;clearTimeout(fastTimer);fastTimer=setTimeout(function(){document.body.classList.remove('fast');},220);},true);
 document.addEventListener('click',function(e){var target=e.target.closest('.tile,.action,.season-tab,#tools button');if(!target||calm()||target.closest('.keyboard'))return;target.classList.remove('select-feedback');void target.offsetWidth;target.classList.add('select-feedback');setTimeout(function(){target.classList.remove('select-feedback');},190);},true);
 if(reduced){var change=function(){Array.prototype.forEach.call(document.querySelectorAll('.grid-scroll,.details,.home-row,.related-row,#episode-picker-list'),function(node){if(node._glassFrame)cancelAnimationFrame(node._glassFrame);if(node._glassYFrame)cancelAnimationFrame(node._glassYFrame);node._glassFrame=node._glassYFrame=null;var track=node.querySelector('.scroll-track');if(track&&track._scrollAnimation){track._scrollAnimation.cancel();track._scrollAnimation=null;}});if(document.getAnimations)document.getAnimations().forEach(function(a){a.cancel();});Array.prototype.forEach.call(document.querySelectorAll('.motion-exit,.splash-exit'),function(node){node.remove();});};if(reduced.addEventListener)reduced.addEventListener('change',change);else if(reduced.addListener)reduced.addListener(change);}
})();
