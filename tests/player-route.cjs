const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});try{const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:path.join(root,'app/js/source.js')});
const result=await page.evaluate(async()=>{
 var calls=[],mode='modern';
 window.XMLHttpRequest=function(){this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=()=>{};this.send=body=>{calls.push({method:this.method,url:this.url,body:body});this.status=200;this.responseURL=this.url;
 if(this.method==='GET'&&this.url.includes('/episode/'))this.responseText='<h1>Fun Abutaleb EP05</h1><form id="watch-17450" action="https://farsiplex.com/play/" method="post"><input type="hidden" name="id" value="17450"></form>';
 else if(this.url.includes('/jwplayer/'))this.responseText='<script>var jw = '+JSON.stringify({file:'https://media.example.test/fun-abutaleb/05.mp4?signature=temporary',file2:'https://backup.example.test/fun-abutaleb/05.mp4?signature=temporary'})+'</script>';
 else {var modern=this.url.endsWith('/play-live-now/');if(mode==='none'||(mode==='modern'&&!modern))this.status=404;this.responseText=mode==='none'||(mode==='empty'&&modern)?'<h1>Player</h1>':'<iframe class="metaframe rptss" src="/jwplayer/?source=public-source&amp;id=17450&amp;type=mp4"></iframe><ul id="playeroptionsul"><li id="player-option-1"><span class="title">720</span></li></ul>';}
 setTimeout(()=>this.onload(),0);};};
 var post=await FP.detail({url:'https://farsiplex.com/episode/fun-abutaleb-ep05-db5188df/',title:'Fun Abutaleb EP05'}),modern=await FP.sources(post.watch),media=await FP.resolve(modern[0].url),modernCalls=calls.slice();
 mode='legacy';calls=[];await FP.sources({id:'123'});var legacy=calls.slice();
 mode='modern';calls=[];await FP.sources({id:'17450'});var fallback=calls.slice();
 mode='empty';calls=[];await FP.sources({id:'17450',action:'https://farsiplex.com/play/'});var empty=calls.slice();
 mode='legacy';calls=[];await FP.sources({id:'17450',action:'https://unexpected.example/play/'});var foreign=calls.slice();
 mode='none';calls=[];var failed=false;try{await FP.sources({id:'17450'});}catch(e){failed=true;}var attempts=calls.length;
 calls=[];var invalid=false;try{await FP.sources({id:'not-a-post-id'});}catch(e){invalid=true;}
 return {modern,media,modernCalls,legacy,fallback,empty,foreign,failed,attempts,invalid,invalidRequests:calls.length};
});
assert(result.modernCalls.some(c=>c.url==='https://farsiplex.com/play-live-now/'&&c.method==='POST'&&c.body==='id=17450'));
assert(!result.modernCalls.some(c=>c.url.includes('/play-adaptive-stream/')),'modern page avoids obsolete endpoint');assert.equal(result.modern[0].label,'720p');assert.equal(result.media.length,2);assert.equal(result.legacy.length,1);assert(result.legacy[0].url.endsWith('/play-adaptive-stream/'));assert.deepEqual(result.fallback.map(c=>new URL(c.url).pathname),['/play-adaptive-stream/','/play-live-now/']);assert.deepEqual(result.empty.map(c=>new URL(c.url).pathname),['/play-live-now/','/play-adaptive-stream/']);assert(result.foreign.every(c=>new URL(c.url).origin==='https://farsiplex.com'));assert(result.failed);assert.equal(result.attempts,2);assert(result.invalid);assert.equal(result.invalidRequests,0);
console.log(JSON.stringify({passed:['Fun Abutaleb public form follows current canonical player route','episode ID retained in POST','relative public iframe resolved safely','numeric quality normalized for remembered quality','both published media alternatives parsed','legacy route still supported','404 and empty-page fallback bounded to two public endpoints','foreign form action cannot redirect a POST','invalid ID rejected before network']},null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
