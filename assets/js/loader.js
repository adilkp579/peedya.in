/* loading screen: letters appear one by one, then the screen fades out */
(function(){var d=document,h=d.documentElement,t0=Date.now(),L=d.getElementById('ldr'),done=0;h.classList.add('ldr-on');
function out(){if(done)return;done=1;L.classList.add('out');h.classList.remove('ldr-on');setTimeout(function(){L.parentNode&&L.parentNode.removeChild(L)},800)}
function go(){var w=Math.max(0,2500-(Date.now()-t0));setTimeout(out,w)}
if(d.readyState=='complete')go();else addEventListener('load',go);setTimeout(out,7000)})();
