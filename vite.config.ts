import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig({
 base:'./',
 plugins:[{
  name:'pulse-build-version',
  transformIndexHtml(html){
   const sha=process.env.GITHUB_SHA||'';
   const revision=/^[a-f0-9]{40}$/i.test(sha)?sha.slice(0,7):'local';
   return html.replaceAll('__PULSE_VERSION__',pkg.version).replaceAll('__PULSE_REVISION__',revision);
  }
 }],
 build:{rollupOptions:{input:{main:'index.html',legacy:'legacy.html'}}}
});
