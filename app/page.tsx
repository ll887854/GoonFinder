'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface SearchHistory {
  id: string;
  date: string;
  preview: string;
  results: any;
}

interface Favorite {
  id: string;
  match: any;
  date: string;
}

interface Match {
  engine: string;
  similarity: number;
  thumbnail?: string;
  link: string;
  source: string;
  video?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(80);
  const [showRaw, setShowRaw] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('goonFinderHistory');
    const savedFavorites = localStorage.getItem('goonFinderFavorites');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
  }, []);

  const saveToHistory = (currentPreview: string, currentResults: any) => {
    const newEntry: SearchHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      preview: currentPreview,
      results: currentResults,
    };
    const updated = [newEntry, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('goonFinderHistory', JSON.stringify(updated));
  };

  const toggleFavorite = (match: any) => {
    const existing = favorites.find(f => f.match.link === match.link && f.match.engine === match.engine);
    if (existing) {
      const updated = favorites.filter(f => f.id !== existing.id);
      setFavorites(updated);
      localStorage.setItem('goonFinderFavorites', JSON.stringify(updated));
    } else {
      const newFav: Favorite = { id: Date.now().toString(), match, date: new Date().toLocaleString() };
      const updated = [newFav, ...favorites];
      setFavorites(updated);
      localStorage.setItem('goonFinderFavorites', JSON.stringify(updated));
    }
  };

  const isFavorite = (match: any) => {
    return favorites.some(f => f.match.link === match.link && f.match.engine === match.engine);
  };

  const shareMatch = (match: Match) => {
    const text = `Found with Goon Finder 🔥\n${match.source} (${match.similarity}% match)\n${match.link}\nTry it: https://goon-finder.vercel.app`;
    if (navigator.share) {
      navigator.share({ title: 'Goon Finder Match', text, url: match.link });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResults(null);
      setError(null);
      setShowRaw(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('images', file);

      const response = await axios.post('/api/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(response.data);
      saveToHistory(preview, response.data);
    } catch (err) {
      setError('Error processing search. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (entry: SearchHistory) => {
    setPreview(entry.preview);
    setResults(entry.results);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('goonFinderHistory');
  };

  const clearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem('goonFinderFavorites');
  };

  const getAllMatches = (): Match[] => {
    if (!results) return [];

    const matches: Match[] = [];

    if (results.traceMoe?.length > 0) {
      results.traceMoe.forEach((res: any) => {
        if (res.result) {
          res.result.forEach((match: any) => {
            matches.push({
              engine: 'trace.moe (Anime/Video)',
              similarity: parseFloat((match.similarity * 100).toFixed(2)),
              thumbnail: match.image,
              link: `https://anilist.co/anime/${match.anilist}`,
              source: match.filename || 'Anime scene',
              video: match.video,
            });
          });
        }
      });
    }

    if (results.saucenao?.length > 0) {
      results.saucenao.forEach((res: any) => {
        if (res.results) {
          res.results.forEach((match: any) => {
            const h = match.header;
            const d = match.data;
            matches.push({
              engine: 'SauceNAO (R34/Art)',
              similarity: parseFloat(h.similarity),
              thumbnail: h.thumbnail,
              link: d.ext_urls?.[0] || d.source || '#',
              source: d.source || d.creator?.join(', ') || 'Unknown',
            });
          });
        }
      });
    }

    if (results.fluffle?.length > 0) {
      results.fluffle.forEach((res: any) => {
        if (res.items) {
          res.items.forEach((match: any) => {
            matches.push({
              engine: 'Fluffle (Furry/NSFW Art)',
              similarity: parseFloat((match.score * 100).toFixed(2)),
              thumbnail: match.thumbnail?.url,
              link: match.location,
              source: match.platform || 'Unknown',
            });
          });
        }
      });
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  };

  const allMatches = getAllMatches();
  const filteredMatches = allMatches.filter(m => m.similarity >= threshold);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 relative">
      <h1 className="text-5xl font-bold mb-12">Goon Finder</h1>

      {/* Top Right Buttons */}
      <div className="fixed top-6 right-6 flex gap-4 z-50">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold text-lg shadow-lg transition"
        >
          History ({history.length})
        </button>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="bg-pink-600 hover:bg-pink-700 px-6 py-3 rounded-lg font-bold text-lg shadow-lg transition"
        >
          Favorites ({favorites.length})
        </button>
      </div>

      <div className="w-full max-w-5xl bg-gray-800 p-10 rounded-2xl shadow-2xl">
        <input
          type="file"
          accept="image/*,video/*,.gif"
          onChange={handleFileChange}
          className="w-full mb-8 p-4 bg-gray-700 rounded-lg border border-gray-600 text-lg"
        />

        {preview && (
          <div className="mb-10 text-center">
            <img src={preview} alt="Preview" className="mx-auto max-w-2xl rounded-xl shadow-2xl" />
            <p className="mt-4 text-gray-400 text-lg">Uploaded Media</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-5 rounded-xl text-2xl font-bold transition"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 mr-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Searching all engines...
            </span>
          ) : 'Start Search'}
        </button>

        {error && <p className="mt-8 text-red-400 text-center text-xl">{error}</p>}

        {results && (
          <div className="mt-16">
            <div className="mb-12 text-center">
              <label className="block text-3xl mb-4 text-gray-200">
                Similarity Threshold: {threshold}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-4 bg-gray-700 rounded-lg cursor-pointer accent-blue-500"
              />
            </div>

            {filteredMatches.length === 0 ? (
              <p className="text-center text-gray-400 text-2xl mt-10">
                No matches above {threshold}% — try lowering the slider!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredMatches.map((match, idx) => (
                  <div key={idx} className="bg-gray-700 p-8 rounded-2xl shadow-2xl hover:shadow-cyan-500/50 transition relative">
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 px-3 py-1 rounded text-xs font-bold">
                      Found with Goon Finder
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <p className="text-cyan-400 font-bold text-xl">{match.engine}</p>
                      <button onClick={() => toggleFavorite(match)} className="text-3xl">
                        {isFavorite(match) ? '❤️' : '🤍'}
                      </button>
                    </div>
                    {match.thumbnail && (
                      <img src={match.thumbnail} alt="Match" className="w-full h-auto rounded-xl mb-6 shadow-lg" />
                    )}
                    <p className="text-3xl font-bold text-green-400 mb-3">{match.similarity}% Match</p>
                    <p className="text-gray-300 mb-6">Source: {match.source}</p>
                    <div className="flex gap-3">
                      <a
                        href={match.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold text-center transition"
                      >
                        View Original
                      </a>
                      <button
                        onClick={() => shareMatch(match)}
                        className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold transition"
                      >
                        Share
                      </button>
                    </div>
                    {match.video && (
                      <a
                        href={match.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-4 text-green-400 hover:underline text-center"
                      >
                        Watch Scene Clip
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ExoClick Banner Ad */}
            <div className="mt-16 flex justify-center">
              <ins className="eas6a97888e2" data-zoneid="5806290"></ins>
              <script
                dangerouslySetInnerHTML={{
                  __html: `(AdProvider = window.AdProvider || []).push({"serve": {}});`,
                }}
              />
            </div>

            {/* ExoClick Popunder */}
            <script
              type="application/javascript"
              dangerouslySetInnerHTML={{
                __html: `
                (function() {
                  function randStr(e,t){for(var n="",r=t||"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",o=0;o<e;o++)n+=r.charAt(Math.floor(Math.random()*r.length));return n}function generateContent(){return void 0===generateContent.val&&(generateContent.val="document.dispatchEvent("+randStr(4*Math.random()+3)+");"),generateContent.val}try{Object.defineProperty(document.currentScript,"innerHTML",{get:generateContent}),Object.defineProperty(document.currentScript,"textContent",{get:generateContent})}catch(e){};
                  var adConfig = {
                    "ads_host": "a.pemsrv.com",
                    "syndication_host": "s.pemsrv.com",
                    "idzone": 5806370,
                    "popup_fallback": false,
                    "popup_force": false,
                    "chrome_enabled": true,
                    "new_tab": false,
                    "frequency_period": 720,
                    "frequency_count": 1,
                    "trigger_method": 3,
                    "trigger_class": "",
                    "trigger_delay": 0,
                    "capping_enabled": true,
                    "tcf_enabled": true,
                    "only_inline": false
                  };
                  window.document.querySelectorAll||(document.querySelectorAll=document.body.querySelectorAll=Object.querySelectorAll=function(e,o,t,i,n){var r=document,a=r.createStyleSheet();for(n=r.all,o=[],t=(e=e.replace(/\[for\b/gi,"[htmlFor").split(",")).length;t--;){for(a.addRule(e[t],"k:v"),i=n.length;i--;)n[i].currentStyle.k&&o.push(n[i]);a.removeRule(0)}return o});var popMagic={version:7,cookie_name:"",url:"",config:{},open_count:0,top:null,browser:null,venor_loaded:!1,venor:!1,tcfData:null,configTpl:{ads_host:"",syndication_host:"",idzone:"",frequency_period:720,frequency_count:1,trigger_method:1,trigger_class:"",popup_force:!1,popup_fallback:!1,chrome_enabled:!0,new_tab:!1,cat:"",tags:"",el:"",sub:"",sub2:"",sub3:"",only_inline:!1,trigger_delay:0,capping_enabled:!0,tcf_enabled:!1,cookieconsent:!0,should_fire:function(){return!0},on_redirect:null},init:function(e){if(void 0!==e.idzone&&e.idzone){void 0===e.customTargeting&&(e.customTargeting=[]),window.customTargeting=e.customTargeting||null;var o=Object.keys(e.customTargeting).filter(function(e){return e.search("ex_")>=0});for(var t in o.length&&o.forEach(function(e){return this.configTpl[e]=null}.bind(this)),this.configTpl)Object.prototype.hasOwnProperty.call(this.configTpl,t)&&(void 0!==e[t]?this.config[t]=e[t]:this.config[t]=this.configTpl[t]);if(void 0!==this.config.idzone&&""!==this.config.idzone){!0!==this.config.only_inline&&this.loadHosted();var i=this;this.checkTCFConsent(function(){"complete"===document.readyState?i.preparePopWait():i.addEventToElement(window,"load",i.preparePop)})}}},getCountFromCookie:function(){if(!this.config.cookieconsent)return 0;var e=popMagic.getCookie(popMagic.cookie_name),o=void 0===e?0:parseInt(e);return isNaN(o)&&(o=0),o},getLastOpenedTimeFromCookie:function(){var e=popMagic.getCookie(popMagic.cookie_name),o=null;if(void 0!==e){var t=e.split(";")[1];o=t>0?parseInt(t):0}return isNaN(o)&&(o=null),o},shouldShow:function(e){if(e=e||!1,!popMagic.config.capping_enabled){var o=!0,t=popMagic.config.should_fire;try{e||"function"!=typeof t||(o=Boolean(t()))}catch(e){console.error("Error executing should fire callback function:",e)}return o&&0===popMagic.open_count}if(popMagic.open_count>=popMagic.config.frequency_count)return!1;var i=popMagic.getCountFromCookie(),n=popMagic.getLastOpenedTimeFromCookie(),r=Math.floor(Date.now()/1e3),a=n+popMagic.config.trigger_delay;return!(n&&a>r)&&(popMagic.open_count=i,!(i>=popMagic.config.frequency_count))},venorShouldShow:function(){return popMagic.venor_loaded&&"0"===popMagic.venor},setAsOpened:function(e){var o=e?e.target||e.srcElement:null,t={id:"",tagName:"",classes:"",text:"",href:"",elm:""};void 0!==o&&null!=o&&(t={id:void 0!==o.id&&null!=o.id?o.id:"",tagName:void 0!==o.tagName&&null!=o.tagName?o.tagName:"",classes:void 0!==o.classList&&null!=o.classList?o.classList:"",text:void 0!==o.outerText&&null!=o.outerText?o.outerText:"",href:void 0!==o.href&&null!=o.href?o.href:"",elm:o});var i=new CustomEvent("creativeDisplayed-"+popMagic.config.idzone,{detail:t});if(document.dispatchEvent(i),popMagic.config.capping_enabled){var n=1;n=0!==popMagic.open_count?popMagic.open_count+1:popMagic.getCountFromCookie()+1;var r=Math.floor(Date.now()/1e3);popMagic.config.cookieconsent&&popMagic.setCookie(popMagic.cookie_name,n+";"+r,popMagic.config.frequency_period)}else++popMagic.open_count},loadHosted:function(){var e=document.createElement("script");for(var o in e.type="application/javascript",e.async=!0,e.src="//"+this.config.ads_host+"/popunder1000.js",e.id="popmagicldr",this.config)Object.prototype.hasOwnProperty.call(this.config,o)&&"ads_host"!==o&&"syndication_host"!==o&&e.setAttribute("data-exo-"+o,this.config[o]);var t=document.getElementsByTagName("body").item(0);t.firstChild?t.insertBefore(e,t.firstChild):t.appendChild(e)},preparePopWait:function(){setTimeout(popMagic.preparePop,400)},preparePop:function(){if("object"!=typeof exoJsPop101||!Object.prototype.hasOwnProperty.call(exoJsPop101,"add")){if(popMagic.top=self,popMagic.top!==self)try{top.document.location.toString()&&(popMagic.top=top)}catch(e){}if(popMagic.cookie_name="zone-cap-"+popMagic.config.idzone,popMagic.config.capping_enabled||(document.cookie=popMagic.cookie_name+"=;expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/"),popMagic.shouldShow(!0)){var e=new XMLHttpRequest;e.onreadystatechange=function(){e.readyState==XMLHttpRequest.DONE&&(popMagic.venor_loaded=!0,200==e.status?popMagic.venor=e.responseText:popMagic.venor="0")};var o="https:"!==document.location.protocol&&"http:"!==document.location.protocol?"https:":document.location.protocol;e.open("GET",o+"//"+popMagic.config.syndication_host+"/venor.php",!0);try{e.send()}catch(e){popMagic.venor_loaded=!0}}if(popMagic.buildUrl(),popMagic.browser=popMagic.browserDetector.getBrowserInfo(),popMagic.config.chrome_enabled||!popMagic.browser.isChrome){var t=popMagic.getPopMethod(popMagic.browser);popMagic.addEvent("click",t)}}},getPopMethod:function(e){return popMagic.config.popup_force||popMagic.config.popup_fallback&&e.isChrome&&e.version>=68&&!e.isMobile?popMagic.methods.popup:e.isMobile?popMagic.methods.default:e.isChrome?popMagic.methods.chromeTab:popMagic.methods.default},checkTCFConsent:function(e){if(this.config.tcf_enabled&&"function"==typeof window.__tcfapi){var o=this;window.__tcfapi("addEventListener",2,function(t,i){i&&(o.tcfData=t,"tcloaded"!==t.eventStatus&&"useractioncomplete"!==t.eventStatus||(window.__tcfapi("removeEventListener",2,function(){},t.listenerId),e()))})}else e()},buildUrl:function(){var e,o="https:"!==document.location.protocol&&"http:"!==document.location.protocol?"https:":document.location.protocol,t=top===self?document.URL:document.referrer,i={type:"inline",name:"popMagic",ver:this.version},n="";customTargeting&&Object.keys(customTargeting).length&&("object"==typeof customTargeting?Object.keys(customTargeting):customTargeting).forEach(function(o){"object"==typeof customTargeting?e=customTargeting[o]:Array.isArray(customTargeting)&&(e=scriptEl.getAttribute(o));var t=o.replace("data-exo-","");n+="&"+t+"="+e});var r=this.tcfData&&this.tcfData.gdprApplies&&!0===this.tcfData.gdprApplies?1:0;this.url=o+"//"+this.config.syndication_host+"/v1/link.php?cat="+this.config.cat+"&idzone="+this.config.idzone+"&type=8&p="+encodeURIComponent(t)+"&sub="+this.config.sub+(""!==this.config.sub2?"&sub2="+this.config.sub2:"")+(""!==this.config.sub3?"&sub3="+this.config.sub3:"")+"&block=1&el="+this.config.el+"&tags="+this.config.tags+"&scr_info="+function(e){var o=e.type+"|"+e.name+"|"+e.ver;return encodeURIComponent(btoa(o))}(i)+n+"&gdpr="+r+"&cb="+Math.floor(1e9*Math.random()),this.tcfData&&this.tcfData.tcString?this.url+="&gdpr_consent="+encodeURIComponent(this.tcfData.tcString):this.url+="&cookieconsent="+this.config.cookieconsent},addEventToElement:function(e,o,t){e.addEventListener?e.addEventListener(o,t,!1):e.attachEvent?(e["e"+o+t]=t,e[o+t]=function(){e["e"+o+t](window.event)},e.attachEvent("on"+o,e[o+t])):e["on"+o]=e["e"+o+t]},getTriggerClasses:function(){var e,o=[];-1===popMagic.config.trigger_class.indexOf(",")?e=popMagic.config.trigger_class.split(" "):e=popMagic.config.trigger_class.replace(/\s/g,"").split(",");for(var t=0;t<e.length;t++)""!==e[t]&&o.push("."+e[t]);return o},addEvent:function(e,o){var t;if("3"!=popMagic.config.trigger_method)if("2"!=popMagic.config.trigger_method||""==popMagic.config.trigger_class)if("4"!=popMagic.config.trigger_method||""==popMagic.config.trigger_class)if("5"!=popMagic.config.trigger_method||""==popMagic.config.trigger_class)popMagic.addEventToElement(document,e,o);else{var i="a"+popMagic.getTriggerClasses().map(function(e){return":not("+e+")"}).join("");t=document.querySelectorAll(i);for(var n=0;n<t.length;n++)popMagic.addEventToElement(t[n],e,o)}else{var r=popMagic.getTriggerClasses();popMagic.addEventToElement(document,e,function(e){r.some(function(o){return null!==e.target.closest(o)})||o.call(e.target,e)})}else{var a=popMagic.getTriggerClasses();for(t=document.querySelectorAll(a.join(", ")),n=0;n<t.length;n++)popMagic.addEventToElement(t[n],e,o)}else for(t=document.querySelectorAll("a"),n=0;n<t.length;n++)popMagic.addEventToElement(t[n],e,o)},setCookie:function(e,o,t){if(!this.config.cookieconsent)return!1;t=parseInt(t,10);var i=new Date;i.setMinutes(i.getMinutes()+parseInt(t));var n=encodeURIComponent(o)+"; expires="+i.toUTCString()+"; path=/";document.cookie=e+"="+n},getCookie:function(e){if(!this.config.cookieconsent)return!1;var o,t,i,n=document.cookie.split(";");for(o=0;o<n.length;o++)if(t=n[o].substr(0,n[o].indexOf("=")),i=n[o].substr(n[o].indexOf("=")+1),(t=t.replace(/^\s+|\s+$/g,""))===e)return decodeURIComponent(i)},randStr:function(e,o){for(var t="",i=o||"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=0;n<e;n++)t+=i.charAt(Math.floor(Math.random()*i.length));return t},isValidUserEvent:function(e){return!(!("isTrusted"in e)||!e.isTrusted||"ie"===popMagic.browser.name||"safari"===popMagic.browser.name)||0!=e.screenX&&0!=e.screenY},isValidHref:function(e){if(void 0===e||""==e)return!1;return!/\s?javascript\s?:/i.test(e)},findLinkToOpen:function(e){var o=e,t=!1;try{for(var i=0;i<20&&!o.getAttribute("href")&&o!==document&&"html"!==o.nodeName.toLowerCase();)o=o.parentNode,i++;var n=o.getAttribute("target");n&&-1!==n.indexOf("_blank")||(t=o.getAttribute("href"))}catch(e){}return popMagic.isValidHref(t)||(t=!1),t||window.location.href},getPuId:function(){return"ok_"+Math.floor(89999999*Math.random()+1e7)},executeOnRedirect:function(){try{popMagic.config.capping_enabled||"function"!=typeof popMagic.config.on_redirect||popMagic.config.on_redirect()}catch(e){console.error("Error executing on redirect callback:",e)}},browserDetector:{browserDefinitions:[["firefox",/Firefox\/([0-9.]+)(?:\s|$)/],["opera",/Opera\/([0-9.]+)(?:\s|$)/],["opera",/OPR\/([0-9.]+)(:?\s|$)$/],["edge",/Edg(?:e|)\/([0-9._]+)/],["ie",/Trident\/7\.0.*rv:([0-9.]+)\).*Gecko$/],["ie",/MSIE\s([0-9.]+);.*Trident\/[4-7].0/],["ie",/MSIE\s(7\.0)/],["safari",/Version\/([0-9._]+).*Safari/],["chrome",/(?!Chrom.*Edg(?:e|))Chrom(?:e|ium)\/([0-9.]+)(:?\s|$)/],["chrome",/(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9.]+)(:?\s|$)/],["bb10",/BB10;\sTouch.*Version\/([0-9.]+)/],["android",/Android\s([0-9.]+)/],["ios",/Version\/([0-9._]+).*Mobile.*Safari.*/],["yandexbrowser",/YaBrowser\/([0-9._]+)/],["crios",/CriOS\/([0-9.]+)(:?\s|$)/]],isChromeOrChromium:function(){var e=window.navigator,o=(e.userAgent||"").toLowerCase(),t=e.vendor||"";if(-1!==o.indexOf("crios"))return!0;if(e.userAgentData&&Array.isArray(e.userAgentData.brands)&&e.userAgentData.brands.length>0){var i=e.userAgentData.brands,n=i.some(function(e){return"Google Chrome"===e.brand}),r=i.some(function(e){return"Chromium"===e.brand})&&2===i.length;return n||r}var a=!!window.chrome,c=-1!==o.indexOf("edg"),p=!!window.opr||-1!==o.indexOf("opr"),s=!(!e.brave||!e.brave.isBrave),g=-1!==o.indexOf("vivaldi"),l=-1!==o.indexOf("yabrowser"),d=-1!==o.indexOf("samsungbrowser"),u=-1!==o.indexOf("ucbrowser");return a&&"Google Inc."===t&&!c&&!p&&!s&&!g&&!l&&!d&&!u},getBrowserInfo:function(){var e=window.navigator.userAgent,o={name:"other",version:"1.0",versionNumber:1,isChrome:this.isChromeOrChromium(),isMobile:!!e.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WebOS|Windows Phone/i)};for(var t in this.browserDefinitions){var i=this.browserDefinitions[t];if(i[1].test(e)){var n=i[1].exec(e),r=n&&n[1].split(/[._]/).slice(0,3),a=Array.prototype.slice.call(r,1).join("")||"0";r&&r.length<3&&Array.prototype.push.apply(r,1===r.length?[0,0]:[0]),o.name=i[0],o.version=r.join("."),o.versionNumber=parseFloat(r[0]+"."+a);break}}return o}},methods:{default:function(e){if(!popMagic.shouldShow()||!popMagic.venorShouldShow()||!popMagic.isValidUserEvent(e))return!0;var o=e.target||e.srcElement,t=popMagic.findLinkToOpen(o);return window.open(t,"_blank"),popMagic.setAsOpened(e),popMagic.executeOnRedirect(),popMagic.top.document.location=popMagic.url,void 0!==e.preventDefault&&(e.preventDefault(),e.stopPropagation()),!0},chromeTab:function(e){if(!popMagic.shouldShow()||!popMagic.venorShouldShow()||!popMagic.isValidUserEvent(e))return!0;if(void 0===e.preventDefault)return!0;e.preventDefault(),e.stopPropagation();var o=top.window.document.createElement("a"),t=e.target||e.srcElement;o.href=popMagic.findLinkToOpen(t),document.getElementsByTagName("body")[0].appendChild(o);var i=new MouseEvent("click",{bubbles:!0,cancelable:!0,view:window,screenX:0,screenY:0,clientX:0,clientY:0,ctrlKey:!0,altKey:!1,shiftKey:!1,metaKey:!0,button:0});i.preventDefault=void 0,o.dispatchEvent(i),o.parentNode.removeChild(o),popMagic.executeOnRedirect(),window.open(popMagic.url,"_self"),popMagic.setAsOpened(e)},popup:function(e){if(!popMagic.shouldShow()||!popMagic.venorShouldShow()||!popMagic.isValidUserEvent(e))return!0;var o="";if(popMagic.config.popup_fallback&&!popMagic.config.popup_force){var t=Math.max(Math.round(.8*window.innerHeight),300);o="menubar=1,resizable=1,width="+Math.max(Math.round(.7*window.innerWidth),300)+",height="+t+",top="+(window.screenY+100)+",left="+(window.screenX+100)}var i=document.location.href,n=window.open(i,popMagic.getPuId(),o);popMagic.setAsOpened(e),setTimeout(function(){n.location.href=popMagic.url,popMagic.executeOnRedirect()},200),void 0!==e.preventDefault&&(e.preventDefault(),e.stopPropagation())}}}; popMagic.init(adConfig);
                })();
                `,
              }}
            />

            <div className="mt-16 text-center">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="bg-purple-600 hover:bg-purple-700 px-10 py-5 rounded-xl font-bold text-2xl transition"
              >
                {showRaw ? 'Hide' : 'Show'} Raw JSON
              </button>
            </div>

            {showRaw && (
              <pre className="mt-8 bg-black p-8 rounded-xl overflow-auto text-sm border border-gray-700">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* History & Favorites Panels (same as before) */}
      {/* ... keep the panels from previous code ... */}

      {/* Small Description */}
      <div className="fixed bottom-4 left-4 max-w-sm bg-gray-800 bg-opacity-90 p-4 rounded-lg shadow-lg text-sm">
        <p className="text-gray-300 leading-relaxed">
          Goon Finder — Free NSFW reverse image search for R34, hentai, anime scenes, furry art & more. 
          Powered by SauceNAO, trace.moe, Fluffle. Built 2025.
        </p>
      </div>

      <footer className="mt-20 text-gray-500 text-center text-lg">
        Goon Finder — Free NSFW Reverse Search • 2025
      </footer>
    </div>
  );
}
