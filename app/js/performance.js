/* Scheduling, storage and image work; presentation and playback stay independent. */
(function(){'use strict';
 var stats=window.FPPerf={storageReads:0,storageParses:0,storageWrites:0,imagesStarted:0,backdropChanges:0,viewsPatched:0,cardsReused:0,clockPaints:0};
 var storageCache=Object.create(null),storage;
 try{storage=window.localStorage;}catch(_){}
 var proto=window.Storage&&Storage.prototype,nativeGet=proto&&proto.getItem,nativeSet=proto&&proto.setItem,nativeRemove=proto&&proto.removeItem,nativeClear=proto&&proto.clear;
 function entry(key){if(!Object.prototype.hasOwnProperty.call(storageCache,key)){stats.storageReads++;storageCache[key]={raw:nativeGet.call(storage,key),parsed:false};}return storageCache[key];}
 window.FPStore={read:function(key,fallback){try{var e=entry(key);if(!e.parsed){stats.storageParses++;try{e.value=JSON.parse(e.raw);}catch(_){e.value=null;}e.parsed=true;}return e.value===null||e.value===undefined?fallback:e.value;}catch(_){return fallback;}},raw:function(key){try{return entry(key).raw;}catch(_){return null;}},write:function(key,value){var raw=JSON.stringify(value),e=storageCache[key];if(e&&e.raw===raw)return true;storage.setItem(key,raw);return true;},invalidate:function(key){if(key)delete storageCache[key];else storageCache=Object.create(null);}};
 // Same-window writes do not emit a storage event. Keep cached reads coherent
 // with existing application code, imports, tests, and direct preference changes.
 if(proto&&storage){
  proto.setItem=function(key,value){var result=nativeSet.call(this,key,value);if(this===storage&&String(key).indexOf('farsiplex.')===0){storageCache[key]={raw:String(value),parsed:false};stats.storageWrites++;}return result;};
  proto.removeItem=function(key){var result=nativeRemove.call(this,key);if(this===storage)delete storageCache[key];return result;};
  proto.clear=function(){var result=nativeClear.call(this);if(this===storage)storageCache=Object.create(null);return result;};
 }
 window.addEventListener('storage',function(e){FPStore.invalidate(e.key);});

 var priorityVersion=0,wanted=Object.create(null),urgent=Object.create(null),resumers=[],deferred=[],resumeTimer=null;
 var W=window.FPWork={};
 W.paused=function(){return document.hidden||!!(window.TVPlayer&&TVPlayer.open);};
 W.prioritize=function(post,nearby){priorityVersion++;wanted=Object.create(null);if(post&&post.url)wanted[post.url]=0;(nearby||[]).forEach(function(p){if(p&&p.url&&!Object.prototype.hasOwnProperty.call(wanted,p.url))wanted[p.url]=2;});resumers.forEach(function(fn){fn();});};
 W.urgent=function(post){priorityVersion++;Object.keys(urgent).forEach(function(key){if(urgent[key]<Date.now())delete urgent[key];});if(post&&post.url)urgent[post.url]=Date.now()+15000;if(post&&post.seriesUrl)urgent[post.seriesUrl]=Date.now()+15000;resumers.forEach(function(fn){fn();});};
 W.priority=function(url){return urgent[url]>Date.now()?0:Object.prototype.hasOwnProperty.call(wanted,url)?wanted[url]:5;};
 W.order=function(queue,start){if(queue._fpPriorityVersion===priorityVersion)return;var tail=queue.splice(start);tail.sort(function(a,b){return W.priority(a.url)-W.priority(b.url);});Array.prototype.push.apply(queue,tail);queue._fpPriorityVersion=priorityVersion;};
 W.onResume=function(fn){resumers.push(fn);};
 W.background=function(fn){if(!W.paused())return Promise.resolve().then(fn);return new Promise(function(resolve,reject){deferred.push(function(){Promise.resolve().then(fn).then(resolve,reject);});});};
 function resume(){if(W.paused())return;clearTimeout(resumeTimer);resumeTimer=setTimeout(function(){if(W.paused())return;var queue=deferred;deferred=[];resumers.forEach(function(fn){fn();});queue.forEach(function(fn){fn();});},0);}
 document.addEventListener('visibilitychange',resume);
 new MutationObserver(function(){resume();}).observe(document.body,{attributes:true,attributeFilter:['class']});

 var imageObserver=null,pendingImages=[],imageFrame=null;
 function startImage(im){if(!im||!im._fpImage||!document.documentElement.contains(im)||document.hidden||(window.TVPlayer&&TVPlayer.open&&!im.closest('#player')))return;var source=im._fpImage;im._fpImage=null;if(imageObserver)imageObserver.unobserve(im);im.src=source;stats.imagesStarted++;}
 function scanImages(){imageFrame=null;if(document.hidden)return;var viewport={left:0,top:0,right:innerWidth,bottom:innerHeight};pendingImages=pendingImages.filter(function(im){if(!im._fpImage||!document.documentElement.contains(im))return false;var r=im.getBoundingClientRect();if(r.right>viewport.left-250&&r.left<viewport.right+250&&r.bottom>viewport.top-200&&r.top<viewport.bottom+200)startImage(im);return !!im._fpImage;});}
 function scheduleImages(){if(!imageFrame)imageFrame=requestAnimationFrame(scanImages);}
 if(window.IntersectionObserver)imageObserver=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)startImage(e.target);});},{root:null,rootMargin:'180px 240px',threshold:0});
 var I=window.FPImages={};
 I.attach=function(im,post,kind){im.decoding='async';im.classList.add('art-pending');im.addEventListener('load',function(){im.classList.remove('art-pending');im.classList.add('art-ready');},{once:true});var source=post.image;if(!source)return;if(kind!=='hero-art'&&kind!=='detail-poster'){var variants=Array.isArray(post.imageVariants)?post.imageVariants:[],chosen=variants.filter(function(v){return v&&typeof v.url==='string'&&/^https?:/.test(v.url)&&v.width>=440;}).sort(function(a,b){return a.width-b.width;})[0];if(chosen)source=chosen.url;}im._fpImage=source;if(kind==='hero-art'||kind==='detail-poster'){im.src=source;im._fpImage=null;stats.imagesStarted++;return;}if(imageObserver)imageObserver.observe(im);else{pendingImages.push(im);scheduleImages();}};
 I.focus=function(card){if(!card)return;Array.prototype.forEach.call(card.querySelectorAll('img'),startImage);var previous=card,next=card;for(var n=0;n<2;n++){previous=previous&&previous.previousElementSibling;next=next&&next.nextElementSibling;if(previous)Array.prototype.forEach.call(previous.querySelectorAll('img'),startImage);if(next)Array.prototype.forEach.call(next.querySelectorAll('img'),startImage);}};
 I.sweep=function(){if(imageObserver){Array.prototype.forEach.call(document.querySelectorAll('#view img,#episode-picker img'),function(im){if(im._fpImage)imageObserver.observe(im);});}else scheduleImages();};
 W.onResume(function(){if(!W.paused()){if(imageObserver)Array.prototype.forEach.call(document.querySelectorAll('#view img'),function(im){if(im._fpImage){imageObserver.unobserve(im);imageObserver.observe(im);}});else scheduleImages();}});
 document.addEventListener('scroll',scheduleImages,true);window.addEventListener('resize',scheduleImages);
 new MutationObserver(function(records){records.forEach(function(record){Array.prototype.forEach.call(record.removedNodes,function(node){if(node.nodeType!==1||document.documentElement.contains(node))return;var images=node.tagName==='IMG'?[node]:node.querySelectorAll('img');Array.prototype.forEach.call(images,function(im){if(imageObserver)imageObserver.unobserve(im);im._fpImage=null;});});});}).observe(document.getElementById('view'),{childList:true,subtree:true});
 new MutationObserver(function(){I.sweep();}).observe(document.getElementById('episode-picker'),{attributes:true,attributeFilter:['class']});
})();
