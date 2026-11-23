const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-card-motion');
fs.mkdirSync(out, {recursive:true});

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1920,height:1080}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {window.FP_DISABLE_EXTRA_SOURCE=true;});
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'tv.test') {
        const file = path.join(root, 'app', url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
        return fs.existsSync(file) ? route.fulfill({path:file}) : route.fulfill({status:404,body:''});
      }
      if (url.hostname === 'art.test') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#26374d"/><circle cx="200" cy="230" r="120" fill="#4aa8ff"/></svg>'});
      return route.fulfill({body:'',headers:{'access-control-allow-origin':'*'}});
    });
    await page.goto('https://tv.test/');
    await page.waitForFunction(() => window.FPTV?.screen?.kind === 'list');
    await page.evaluate(() => {
      window.movies = Array.from({length:24}, (_,i) => ({url:'https://farsiplex.com/movie/motion-'+i+'/',title:'Motion title '+i,image:'https://art.test/poster.svg',backdrop:'https://art.test/backdrop.svg',watch:{id:String(i)},episodes:[],seasons:[]}));
      window.shows = movies.map((p,i) => Object.assign({},p,{url:'https://farsiplex.com/tvshow/motion-'+i+'/',title:'Series '+i,watch:null}));
      FP.catalogue = url => Promise.resolve({posts:url==='/movie/'?movies:shows.concat(movies),next:null});
      FP.dateInfo = () => Promise.resolve({header:null,latest:null,episodeCount:null});
      movies.slice(0,6).forEach(p => WatchHistory.save(p,600,3600));
      FPTV.loadList('/explore/','Discover',false);
    });
    await page.waitForSelector('[data-home-group=continue] .scroll-track');
    await page.waitForTimeout(350);
    const geometry = await page.evaluate(() => {
      const section = document.querySelector('[data-home-group=tvshows]');
      const poster = section.querySelector('.poster').getBoundingClientRect();
      const heading = document.querySelector('#heading').getBoundingClientRect();
      const caption = section.querySelector('.caption').getBoundingClientRect();
      return {posterLeft:poster.left,headingLeft:heading.left,width:poster.width,height:poster.height,captionBottom:caption.bottom,viewBottom:document.querySelector('#view').getBoundingClientRect().bottom,font:getComputedStyle(document.body).fontFamily,headingWeight:getComputedStyle(document.querySelector('#heading')).fontWeight,captionWeight:getComputedStyle(section.querySelector('.caption')).fontWeight};
    });
    assert(Math.abs(geometry.posterLeft-geometry.headingLeft)<1,'Headings and artwork share the same content anchor');
    assert.equal(geometry.width,200);
    assert.equal(geometry.height,300);
    assert(geometry.font.includes('Vz'));
    assert.equal(geometry.headingWeight,'700');
    assert.equal(geometry.captionWeight,'500');
    assert(geometry.captionBottom<geometry.viewBottom,'Two complete shelves and their captions fit');
    await page.evaluate(() => FPTV.focus(document.querySelectorAll('.continue-tile')[1]));
    assert.equal(await page.locator('[data-home-group=continue] .home-row').evaluate(e=>e.scrollLeft),0,'Second visible card keeps the row still');
    const motion = await page.evaluate(async () => {
      const row = document.querySelector('[data-home-group=continue] .home-row');
      const track = row.querySelector('.scroll-track');
      const cards = row.querySelectorAll('button');
      FPTV.focus(cards[4]);
      const samples = [];
      for (let i=0;i<6;i++) {await new Promise(requestAnimationFrame);samples.push(row.scrollLeft);}
      const before = cards[0].getBoundingClientRect().left;
      FPTV.focus(cards[5]);
      const after = cards[0].getBoundingClientRect().left;
      return {samples,jump:Math.abs(after-before),animated:!!track._scrollAnimation};
    });
    assert.equal(new Set(motion.samples).size,1,'The logical scroll is committed once during compositor travel');
    assert(motion.samples[0]>0);
    assert(motion.animated);
    assert(motion.jump<3,'Interrupting travel preserves the current visual position');
    await page.waitForTimeout(300);
    await page.evaluate(() => FPTV.focus(document.querySelectorAll('.continue-tile')[2]));
    await page.waitForTimeout(300);
    const clearance = await page.evaluate(() => {
      const card = document.querySelector('.continue-tile.focus');
      const poster = card.querySelector('.poster').getBoundingClientRect();
      const caption = card.querySelector('.caption').getBoundingClientRect();
      const row = card.closest('.home-row').getBoundingClientRect();
      return {captionGap:caption.top-poster.bottom,top:poster.top-row.top,left:poster.left-row.left,right:row.right-poster.right};
    });
    assert(clearance.captionGap>=8,'Focus enlargement clears the caption');
    assert(clearance.top>=6&&clearance.left>=6&&clearance.right>=6,'The focused artwork and ring stay inside the viewport');
    const reused = await page.evaluate(async () => {
      FP.catalogue=()=>new Promise(resolve=>window.finishMotionRefresh=resolve);
      FPTV.loadList('/explore/','Discover',false);
      const card=document.querySelectorAll('.continue-tile')[2],track=card.parentElement;
      FPTV.focus(card);
      finishMotionRefresh({posts:shows.concat(movies),next:null});
      await new Promise(resolve=>setTimeout(resolve,100));
      FP.catalogue=url=>Promise.resolve({posts:url==='/movie/'?movies:shows.concat(movies),next:null});
      return FPTV.focused===card&&card.parentElement===track&&track.classList.contains('scroll-track');
    });
    assert(reused,'Refreshing a catalog preserves the track and focused card');
    await page.screenshot({path:path.join(out,'home.png')});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>FPTV.focus(document.querySelectorAll('.continue-tile')[5]));
    assert.equal(await page.locator('[data-home-group=continue] .scroll-track').evaluate(e=>e.getAnimations().length),0,'Reduced motion moves directly to the requested card');
    await page.evaluate(()=>FPTV.loadList('/movie/','Movies',false));
    await page.waitForSelector('.grid .tile');
    const grid = await page.locator('.grid .tile').evaluateAll(cards=>cards.slice(0,8).map(card=>({x:card.offsetLeft,y:card.offsetTop,width:card.offsetWidth,posterHeight:card.querySelector('.poster').offsetHeight})));
    assert.equal(new Set(grid.slice(0,7).map(card=>card.y)).size,1);
    assert(grid[7].y>grid[0].y);
    assert.equal(grid[0].width,200);
    assert.equal(grid[0].posterHeight,300);
    await page.evaluate(()=>FPTV.focus(document.querySelector('.grid .tile')));
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>FPTV.focused._index),7,'Remote navigation matches the seven-column grid');
    await page.screenshot({path:path.join(out,'movies.png')});
    assert.deepEqual(errors,[]);
    const report={browser:await browser.version(),geometry,motion,clearance,checks:['200×300 portrait cards','aligned page gutters','two complete shelves','compositor carousel travel','continuous interruption and reversal','focused card clearance','stable refresh','reduced motion','seven-column catalog navigation'],errors};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
