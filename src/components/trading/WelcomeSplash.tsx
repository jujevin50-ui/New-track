import { useLayoutEffect, useRef } from 'react';

interface WelcomeSplashProps { name: string; onDone: () => void; }

/** Letters gather into a ribbon, travel to the top left, then unveil the page in straight horizontal bands. */
export function WelcomeSplash({ name, onDone }: WelcomeSplashProps) {
  const text = `Welcome back, ${name || 'Trader'}`;
  const canvas = useRef<HTMLCanvasElement>(null);
  const ribbon = useRef<HTMLCanvasElement>(null);
  const underlay = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  const skip = useRef(() => {});
  useLayoutEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useLayoutEffect(() => {
    const surface = canvas.current, backdrop = underlay.current, line = word.current;
    if (!surface || !backdrop || !line) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timers: number[] = [];
    let frame = 0, finished = false, released = false, fading = false;
    const context = surface.getContext('2d');
    const paint = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      surface.width = Math.ceil(window.innerWidth * ratio);
      surface.height = Math.ceil(window.innerHeight * ratio);
      if (context) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = getComputedStyle(document.body).backgroundColor;
        context.fillRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    paint();
    const complete = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      timers.forEach(timer => window.clearTimeout(timer));
      onDoneRef.current();
    };
    skip.current = complete;
    const fade = () => {
      if (finished || fading) return;
      fading = true;
      cancelAnimationFrame(frame);
      timers.forEach(timer => window.clearTimeout(timer));
      for (const element of [surface, backdrop, line, ribbon.current!]) {
        element.style.transition = 'opacity 300ms ease';
        element.style.opacity = '0';
      }
      timers.push(window.setTimeout(complete, 320));
    };
    const onPreference = () => { if (reduced.matches) fade(); };
    const onResize = () => { if (released) fade(); else paint(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); complete(); } };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    reduced.addEventListener('change', onPreference);

    const beginFlight = () => {
      if (finished || fading) return;
      released = true;
      backdrop.style.opacity = '0';
      if (!context) { backdrop.style.opacity = '1'; fade(); return; }
      const width = window.innerWidth, height = window.innerHeight;
      const ink = ribbon.current;
      const inkContext = ink?.getContext('2d');
      if (!ink || !inkContext) { fade(); return; }
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      ink.width = Math.ceil(width * ratio); ink.height = Math.ceil(height * ratio);
      inkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      const color = getComputedStyle(line).color;
      const smooth = (p: number) => p * p * (3 - 2 * p);
      const bezier = (p: number, a: number, b: number, c: number, d: number) =>
        (1-p)**3*a + 3*(1-p)**2*p*b + 3*(1-p)*p*p*c + p**3*d;
      const rows = Math.max(3, Math.ceil(height / 210));
      const rowHeight = height / rows;
      const path = (time: number) => {
        if (time < 950) {
          const p = smooth(Math.max(0, time / 950));
          return { x: width/2 + (width/2-2)*p, y: height/2, alpha: 1 };
        }
        if (time < 2050) {
          const p = (time-950)/1100;
          return { x: bezier(p,width-2,width,width*.3,0),
            y: bezier(p,height/2,height*.1,0,rowHeight/2), alpha: 1 };
        }
        const sweep = Math.min(rows, (time-2050)/3500*rows);
        const row = Math.min(rows-1, Math.floor(sweep));
        const p = Math.min(1,sweep-row);
        // Hide the return between rows: every visible pass is perfectly horizontal.
        return { x: width*smooth(p), y: (row+.5)*rowHeight,
          alpha: Math.min(1,p*18,(1-p)*18) };
      };
      // Impacts follow the actual edge contacts, independently of frame rate.
      const impacts=[{time:950,x:width-2,y:height/2,direction:Math.PI}];
      for(let row=0;row<rows;row++) {
        impacts.push({time:2050+row*3500/rows,x:2,y:(row+.5)*rowHeight,direction:0});
        impacts.push({time:2050+(row+1)*3500/rows,x:width-2,y:(row+.5)*rowHeight,direction:Math.PI});
      }
      type Spark={x:number;y:number;vx:number;vy:number;born:number;life:number;length:number};
      let impactIndex=0,sparks:Spark[]=[];
      const sparkColor=document.documentElement.classList.contains('dark')?'#f8cf6b':'#b47612';
      const drawSparks=(elapsed:number)=>{
        while(impactIndex<impacts.length&&elapsed>=impacts[impactIndex].time) {
          const impact=impacts[impactIndex++];
          for(let index=0;index<12;index++) {
            const angle=impact.direction+(Math.random()-.5)*2.5;
            const speed=100+Math.random()*140;
            sparks.push({x:impact.x,y:impact.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
              born:impact.time,life:380+Math.random()*220,length:3+Math.random()*5});
          }
        }
        sparks=sparks.filter(spark=>elapsed-spark.born<spark.life).slice(-72);
        inkContext.strokeStyle=sparkColor;
        inkContext.lineWidth=1.5;
        for(const spark of sparks) {
          const age=(elapsed-spark.born)/1000,p=(elapsed-spark.born)/spark.life;
          const travel=age*(1-.4*p);
          const x=spark.x+spark.vx*travel,y=spark.y+spark.vy*travel+90*age*age;
          const speed=Math.hypot(spark.vx,spark.vy),length=spark.length*(1-p);
          inkContext.globalAlpha=(1-p)**1.5;
          inkContext.beginPath();inkContext.moveTo(x,y);
          inkContext.lineTo(x-spark.vx/speed*length,y-spark.vy/speed*length);
          inkContext.stroke();
        }
        inkContext.globalAlpha=1;
      };
      const letters = Array.from(line.querySelectorAll<HTMLElement>('[data-welcome-letter]')).map(element => {
        const rect = element.getBoundingClientRect();
        element.style.animation = 'none';
        element.style.transition = 'color 240ms ease, background-color 240ms ease, border-radius 240ms ease, filter 240ms ease';
        element.style.color = 'transparent';
        element.style.backgroundColor = color;
        element.style.borderRadius = '999px';
        element.style.filter = 'blur(5px)';
        return { element, x: rect.left+rect.width/2, y: rect.top+rect.height/2 };
      });
      const start = performance.now(), duration = 6100;
      const animate = (now: number) => {
        if (finished || fading) return;
        const elapsed = now-start;
        const gathering = smooth(Math.min(1,elapsed/650));
        const head = path(elapsed);
        for (const letter of letters) {
          letter.element.style.transform = `translate3d(${(head.x-letter.x)*gathering}px,${(head.y-letter.y)*gathering}px,0) scale(1,${1-gathering*.92})`;
          letter.element.style.opacity = String(1-smooth(Math.min(1,elapsed/700)));
        }
        inkContext.clearRect(0,0,width,height);
        inkContext.strokeStyle = color;
        inkContext.lineCap = 'round';
        const revealStarted = elapsed >= 2050;
        const currentRow = Math.min(rows-1,Math.floor(Math.max(0,elapsed-2050)/3500*rows));
        // A single connected ribbon with a soft, tapered tail; no glyphs or particles.
        const tail = path(Math.max(revealStarted ? 2050 : 0, elapsed-196));
        const ribbonGradient = inkContext.createLinearGradient(tail.x,tail.y,head.x+.01,head.y);
        ribbonGradient.addColorStop(0,'transparent');
        ribbonGradient.addColorStop(1,color);
        inkContext.strokeStyle=ribbonGradient;
        inkContext.globalAlpha=head.alpha*Math.min(1,elapsed/500);
        inkContext.lineWidth=5;
        inkContext.beginPath();
        let connected=false;
        for (let segment=28;segment>=0;segment--) {
          const t=elapsed-segment*7;
          if (t<0 || (revealStarted && (t<2050 || Math.floor((t-2050)/3500*rows)!==currentRow))) continue;
          const point=path(t);
          if (!connected) { inkContext.moveTo(point.x,point.y); connected=true; }
          else inkContext.lineTo(point.x,point.y);
        }
        inkContext.stroke();
        drawSparks(elapsed);
        if (revealStarted) {
          const sweep = Math.min(rows,(elapsed-2050)/3500*rows);
          const row = Math.min(rows-1,Math.floor(sweep));
          const progress = smooth(Math.min(1,sweep-row));
          context.globalCompositeOperation = 'destination-out';
          context.globalAlpha = 1;
          context.fillStyle = '#000';
          context.fillRect(0,0,width,row*rowHeight);
          // Soft vertical leading edge, constant height: no diagonal reveal.
          const edge = width*progress;
          context.fillRect(0,row*rowHeight,Math.max(0,edge-32),rowHeight);
          const gradient=context.createLinearGradient(edge-32,0,edge+24,0);
          gradient.addColorStop(0,'rgba(0,0,0,1)'); gradient.addColorStop(1,'rgba(0,0,0,0)');
          context.fillStyle=gradient;
          context.fillRect(Math.max(0,edge-32),row*rowHeight,56,rowHeight);
        }
        const ending=smooth(Math.max(0,Math.min(1,(elapsed-5550)/550)));
        surface.style.opacity=String(1-ending);
        ink.style.opacity=String(1-ending);
        if (elapsed>=duration) complete();
        else frame=requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    };
    timers.push(window.setTimeout(reduced.matches ? fade : beginFlight, reduced.matches ? 450 : 1400));
    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      reduced.removeEventListener('change', onPreference);
      document.body.style.overflow = oldOverflow;
    };
  }, [text]);

  return <div className="welcome-flow" role="status" aria-label={text}>
    <div ref={underlay} className="welcome-flow-underlay" aria-hidden="true"/>
    <canvas ref={canvas} className="welcome-flow-canvas" aria-hidden="true"/>
    <canvas ref={ribbon} className="welcome-flow-canvas" aria-hidden="true"/>
    <div ref={word} className="welcome-flow-text" aria-hidden="true">{Array.from(text).map((letter,index) => <span key={index} data-welcome-letter className="welcome-flow-letter animate-letter-in" style={{animationDelay:`${Math.min(index * 20, 500)}ms`}}>{letter === ' ' ? '\u00A0' : letter}</span>)}</div>
    <button type="button" className="welcome-flow-skip" onClick={() => skip.current()}>Passer l’animation</button>
  </div>;
}
