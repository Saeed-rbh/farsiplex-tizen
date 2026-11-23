/* 30nama-inspired rail behavior; adapted to FarsiPlex's existing focus owner. */
(function(){'use strict';
 var root=document.getElementById('rail')||document.getElementById('header');
 if(!root)return;
 var nav,pill,panel,buttons=[],memory=null,opened=false,mutating=false;
 var scrim=document.createElement('div');scrim.className='fp-rail-scrim';scrim.setAttribute('aria-hidden','true');
 var stage=document.querySelector('.screen')||document.body;stage.appendChild(scrim);
 function isVisible(e){return e&&document.body.contains(e)&&e.offsetWidth>0&&getComputedStyle(e).visibility!=='hidden';}
 function focus(e){if(!isVisible(e))return;if(window.FPTV)FPTV.focus(e);else e.focus({preventScroll:true});}
 function selected(){return buttons.filter(function(b){return b.classList.contains('cur')||b.classList.contains('active');})[0]||buttons[0];}
 function mark(button,instant){if(!pill||!button)return;if(instant)pill.style.transition='none';pill.style.transform='translateY('+(nav.offsetTop+button.offsetTop)+'px)';pill.style.setProperty('--rail-position',pill.style.transform);if(instant){void pill.offsetHeight;pill.style.transition='';}buttons.forEach(function(b){b.classList.toggle('fp-rail-focus',opened&&b===button);});}
 function setOpen(value){opened=value;root.classList.toggle('fp-open',value);root.setAttribute('aria-expanded',String(value));scrim.classList.toggle('fp-open',value);buttons.forEach(function(b){b.classList.toggle('fp-rail-focus',value&&b===document.activeElement);});}
 function close(restore){setOpen(false);var target=memory;memory=null;if(restore){if(!isVisible(target))target=document.querySelector('#view .tile,#view button,#content .primary,#content .vcard,#content button');focus(target);}}
 function open(){if(opened||document.body.classList.contains('playing'))return;var modal=document.getElementById('modal');if(modal&&!modal.classList.contains('hidden'))return;if(document.activeElement&&!root.contains(document.activeElement))memory=document.activeElement;setOpen(true);var target=selected();mark(target,true);focus(target);}
 function init(){
  if(mutating)return;mutating=true;
  nav=root.querySelector('nav');if(!nav){mutating=false;return;}
  root.classList.add('fp-rail');nav.setAttribute('data-fp-nav','');
  Array.prototype.forEach.call(nav.querySelectorAll('.nav-highlight'),function(e){e.remove();});
  panel=root.querySelector('.fp-rail-panel');if(!panel){panel=document.createElement('div');panel.className='fp-rail-panel';panel.setAttribute('aria-hidden','true');root.insertBefore(panel,nav);}
  pill=root.querySelector('.fp-rail-pill');if(!pill){pill=document.createElement('div');pill.className='fp-rail-pill';pill.setAttribute('aria-hidden','true');root.insertBefore(pill,nav);}
  buttons=Array.prototype.slice.call(nav.querySelectorAll('button'));
  buttons.forEach(function(b,i){
   var label=b.querySelector('.fp-rail-label');
   if(!label){label=b.querySelector('span:not(.symbol)');if(!label){label=document.createElement('span');label.textContent=b.textContent;b.textContent='';b.appendChild(label);}label.classList.add('fp-rail-label');}
   var slot=[1,2,3,4,0,5][i];b.style.top=(slot*72)+'px';label.style.transitionDelay=(slot*20)+'ms';b.setAttribute('aria-label',label.textContent);b.title=label.textContent;
   if(!b.querySelector('.symbol')){var symbol=document.createElement('span');symbol.className='symbol';var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');var path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',['M3 10 12 3l9 7v10H6V10m3 10v-7h6v7','M4 4h16v16H4zM4 9h16M9 4v5m6-5v5','M3 5h18v13H3zM8 21h8m-4-3v3','M12 3a9 9 0 1 1-9 9 9 9 0 0 1 9-9m0 4v5l4 2','M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8','M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0'][i]);svg.appendChild(path);var referenceIcons=["<path d=\"M4 11l8-7 8 7v8.5a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z\"/>", "<rect x=\"3.5\" y=\"6\" width=\"17\" height=\"14\" rx=\"2\"/><path d=\"M3.5 10.5h17M7 6l2.5 4.5M12 6l2.5 4.5M17 6l2.5 4.5\"/>", "<rect x=\"3\" y=\"5\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 21h8M12 17v4\"/>", "", "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"M16 16l4.5 4.5\"/>", "<path d=\"M9 7h11M9 12h11M9 17h11M4.5 7h.1M4.5 12h.1M4.5 17h.1\"/>"];if(referenceIcons[i])svg.innerHTML=referenceIcons[i];symbol.appendChild(svg);b.insertBefore(symbol,label);}
   if(!b._fpRailHandled){var original=b.onclick;b.onclick=function(e){e.stopPropagation();close(false);if(original)original.call(b,e);};b._fpRailHandled=true;}
  });
  buttons.sort(function(a,b){return a.offsetTop-b.offsetTop;});if(!nav.contains(document.activeElement))setOpen(false);mark(nav.contains(document.activeElement)?document.activeElement:selected(),true);
  mutating=false;
 }
 document.addEventListener('focusin',function(e){if(!nav)return;if(nav.contains(e.target)){if(!opened){setOpen(true);mark(e.target,true);}else mark(e.target,false);}else{if(opened)close(false);if(!e.target.closest('#player,.player-page,.choice-panel,#modal,.player-episode-picker'))memory=e.target;}});
 function handleKey(e){
  if(e._fpRailHandled||document.body.classList.contains('playing')||getComputedStyle(root).display==='none')return;
  var k=e.keyCode||({ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Escape:27,Enter:13}[e.key]);
  if(!nav)return;
  if(k===10252){var dialog=document.getElementById('modal');if(dialog&&!dialog.classList.contains('hidden'))return;e._fpRailHandled=true;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){if(opened)close(true);else open();}return;}
  if(opened){
   if(k===39||k===27||k===10009||k===8){e._fpRailHandled=true;e.preventDefault();e.stopImmediatePropagation();close(true);return;}
   if(k===38||k===40){e._fpRailHandled=true;e.preventDefault();e.stopImmediatePropagation();var i=buttons.indexOf(document.activeElement);focus(buttons[Math.max(0,Math.min(buttons.length-1,i+(k===40?1:-1)))]);return;}
   if(k===37){e._fpRailHandled=true;e.preventDefault();e.stopImmediatePropagation();return;}
  }
  // Match 30nama: a held key must not unexpectedly reopen a just-closed rail.
  if(!opened&&e.repeat&&k===37){var current=document.activeElement,row=current.closest('.home-row,.related-row,.poster-row'),atEdge=row?row.querySelector('button')===current:current.dataset&&current.dataset.grid?Number(current.dataset.index||0)%(current.closest('.episode-grid')?4:7)===0:current===document.querySelector('.home-hero button,.discover-hero button');if(atEdge){e._fpRailHandled=true;e.preventDefault();e.stopImmediatePropagation();return;}}
 }
 document.addEventListener('keydown',handleKey,true);
 scrim.onclick=function(){close(true);};
 new MutationObserver(function(){var next=root.querySelector('nav');if(next!==nav||!root.querySelector('.fp-rail-pill'))init();}).observe(root,{childList:true});
 if(root.id==='rail')new MutationObserver(function(){if(document.body.classList.contains('playing'))close(false);}).observe(document.body,{attributes:true,attributeFilter:['class']});
 window.FPGlassRail={open:open,close:close,key:handleKey,isOpen:function(){return opened;},remembered:function(){return memory;},init:init};init();
})();
