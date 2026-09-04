import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyATHoFquRmes-g-VkEvdqjtQldlf9GkMdM",
  authDomain: "football-manager-draft-27.firebaseapp.com",
  databaseURL: "https://football-manager-draft-27-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "football-manager-draft-27",
  storageBucket: "football-manager-draft-27.firebasestorage.app",
  messagingSenderId: "780390171652",
  appId: "1:780390171652:web:59fd109546c98995ed6151",
  measurementId: "G-Y7K1RE94LQ"
};

// เริ่มต้นทำงาน Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app); 

// ตารางแปลงชื่อประเทศภาษาไทย/อังกฤษ เป็น ISO Code ของ Flagcdn
const countryToFlagCode = {
  // ทีมชาติฟุตบอลหลัก / สมาคมฟุตบอลเฉพาะ
  "อังกฤษ": "gb-eng", "england": "gb-eng",
  "สกอตแลนด์": "gb-sct", "scotland": "gb-sct",
  "เวลส์": "gb-wls", "wales": "gb-wls",
  "ไอร์แลนด์เหนือ": "gb-nir", "northern ireland": "gb-nir",
  
  // ทวีปยุโรป
  "บราซิล": "br", "brazil": "br",
  "อาร์เจนตินา": "ar", "argentina": "ar",
  "ฝรั่งเศส": "fr", "france": "fr",
  "สเปน": "es", "spain": "es",
  "เยอรมนี": "de", "germany": "de", "เยอรมัน": "de",
  "อิตาลี": "it", "italy": "it",
  "โปรตุเกส": "pt", "portugal": "pt",
  "เนเธอร์แลนด์": "nl", "netherlands": "nl", "ฮอลแลนด์": "nl",
  "เบลเยียม": "be", "belgium": "be",
  "โครเอเชีย": "hr", "croatia": "hr",
  "เดนมาร์ก": "dk", "denmark": "dk",
  "สวิตเซอร์แลนด์": "ch", "switzerland": "ch",
  "ออสเตรีย": "at", "austria": "at",
  "โปแลนด์": "pl", "poland": "pl",
  "สวีเดน": "se", "sweden": "se",
  "นอร์เวย์": "no", "norway": "no",
  "เซอเบียร์": "rs", "serbia": "rs", "เซอร์เบีย": "rs",
  "ยูเครน": "ua", "ukraine": "ua",
  "ตุรกี": "tr", "turkey": "tr",
  "เช็ก": "cz", "czech republic": "cz", "สาธารณรัฐเช็ก": "cz",
  "ฮังการี": "hu", "hungary": "hu",
  "โรมาเนีย": "ro", "romania": "ro",
  "สโลวาเกีย": "sk", "slovakia": "sk",
  "สโลวีเนีย": "si", "slovenia": "si", "สโลเวเนีย": "si",
  "กรีซ": "gr", "greece": "gr",
  "ฟินแลนด์": "fi", "finland": "fi",
  "ไอร์แลนด์": "ie", "ireland": "ie",
  "ไอซ์แลนด์": "is", "iceland": "is",
  "บอสเนีย": "ba", "bosnia": "ba", "บอสเนียและเฮอร์เซโกวีนา": "ba",
  "แอลเบเนีย": "al", "albania": "al",
  "มาซิโดเนียเหนือ": "mk", "north macedonia": "mk",
  "จอร์เจีย": "ge", "georgia": "ge",
  "บัลแกเรีย": "bg", "bulgaria": "bg",
  "อาร์เมเนีย": "am", "armenia": "am",
  "โคโซโว": "xk", "kosovo": "xk",

  // ทวีปอเมริกาใต้ & เหนือ
  "อุรุกวัย": "uy", "uruguay": "uy",
  "โคลอมเบีย": "co", "colombia": "co",
  "ชิลี": "cl", "chile": "cl",
  "เปรู": "pe", "peru": "pe",
  "เอกวาดอร์": "ec", "ecuador": "ec",
  "ปารากวัย": "py", "paraguay": "py",
  "เวเนซุเอลา": "ve", "venezuela": "ve",
  "โบลิเวีย": "bo", "bolivia": "bo",
  "สหรัฐอเมริกา": "us", "usa": "us", "อเมริกา": "us",
  "เม็กซิโก": "mx", "mexico": "mx",
  "แคนาดา": "ca", "canada": "ca",
  "จาเมกา": "jm", "jamaica": "jm",
  "คอสตาริกา": "cr", "costa rica": "cr",

  // ทวีปเอเชีย & โอเชียเนีย
  "ไทย": "th", "thailand": "th",
  "ญี่ปุ่น": "jp", "japan": "jp",
  "เกาหลีใต้": "kr", "south korea": "kr",
  "ออสเตรเลีย": "au", "australia": "au",
  "ซาอุดีอาระเบีย": "sa", "saudi arabia": "sa", "ซาอุ": "sa",
  "กาตาร์": "qa", "qatar": "qa",
  "อิหร่าน": "ir", "iran": "ir",
  "อิรัก": "iq", "iraq": "iq",
  "สหรัฐอาหรับเอมิเรตส์": "ae", "uae": "ae",
  "อุซเบกิสถาน": "uz", "uzbekistan": "uz",
  "จีน": "cn", "china": "cn",
  "นิวซีแลนด์": "nz", "new zealand": "nz",

  // ทวีปแอฟริกา
  "ไนจีเรีย": "ng", "nigeria": "ng",
  "เซเนกัล": "sn", "senegal": "sn",
  "อียิปต์": "eg", "egypt": "eg",
  "โมร็อกโก": "ma", "morocco": "ma",
  "แคเมอรูน": "cm", "cameroon": "cm",
  "กานา": "gh", "ghana": "gh",
  "ไอวอรีโคสต์": "ci", "ivory coast": "ci", "โคตดิวัวร์": "ci",
  "แอลจีเรีย": "dz", "algeria": "dz",
  "ตูนีเซีย": "tn", "tunisia": "tn",
  "แอฟริกาใต้": "za", "south africa": "za",
  "มาลี": "ml", "mali": "ml",
  "กินี": "gn", "guinea": "gn",
  "กาบอง": "ga", "gabon": "ga",
  "สาธารณรัฐประชาธิปไตยคองโก": "cd", "dr congo": "cd", "คองโก": "cd"
};

// ฟังก์ชันแปลงชื่อประเทศเป็น URL ธงชาติ Flagcdn
function getFlagUrl(nationInput) {
  if (!nationInput) return 'https://flagcdn.com/w80/un.png';
  if (nationInput.startsWith('http://') || nationInput.startsWith('https://') || nationInput.startsWith('assets/')) {
    return nationInput;
  }
  const cleanKey = nationInput.trim().toLowerCase();
  const code = countryToFlagCode[cleanKey];
  if (code) {
    return `https://flagcdn.com/w80/${code}.png`;
  }
  return 'https://flagcdn.com/w80/un.png';
}

let vouchers = localStorage.getItem('vouchers') ? parseInt(localStorage.getItem('vouchers')) : 50;
let primePity = localStorage.getItem('primePity') ? parseInt(localStorage.getItem('primePity')) : 60;
let featuredPity = localStorage.getItem('featuredPity') ? parseInt(localStorage.getItem('featuredPity')) : 10;
let playersData = null;
let rawAllPlayers = {}; // เก็บข้อมูลดิบทั้งหมดจาก node /players
let isRolling = false;

const playlist = ['assets/audio/soundtracks/worms.mp3'];
let currentTrackIndex = 0;
const bgmPlayer = document.getElementById('bgm-player');
let isBgmInitialized = false;

function initBGM() {
  if (isBgmInitialized) return;
  const savedTime = localStorage.getItem('bgm_time') || 0;
  const savedIndex = localStorage.getItem('bgm_index') || 0;

  currentTrackIndex = parseInt(savedIndex);
  if (currentTrackIndex >= playlist.length) currentTrackIndex = 0;

  bgmPlayer.src = playlist[currentTrackIndex];
  bgmPlayer.volume = 0.5; 

  bgmPlayer.addEventListener('loadedmetadata', () => {
    bgmPlayer.currentTime = parseFloat(savedTime);
  }, { once: true });

  bgmPlayer.play().then(() => {
    isBgmInitialized = true;
  }).catch(e => console.log("รอ User กดก่อนถึงจะเล่น BGM ได้"));

  bgmPlayer.addEventListener('ended', () => {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    bgmPlayer.src = playlist[currentTrackIndex];
    bgmPlayer.play();
  });

  setInterval(() => {
    if (!bgmPlayer.paused) {
      localStorage.setItem('bgm_time', bgmPlayer.currentTime);
      localStorage.setItem('bgm_index', currentTrackIndex);
    }
  }, 1000);
}
document.body.addEventListener('click', initBGM, { once: true });

function updateUI() {
  document.getElementById('voucher-count').innerText = vouchers;
  document.getElementById('prime-pity').innerText = primePity;
  document.getElementById('featured-pity').innerText = featuredPity;
}

function saveData() {
  localStorage.setItem('vouchers', vouchers);
  localStorage.setItem('primePity', primePity);
  localStorage.setItem('featuredPity', featuredPity);
}

function generatePlaystylesHTML(playstyles) {
  if (!playstyles || playstyles.length === 0) return '';
  const isSingle = playstyles.length === 1 ? 'single' : '';
  const icons = playstyles.map(ps => `<img src="${ps.icon}" class="ps-icon" alt="playstyle">`).join('');
  return `<div class="card-playstyles ${isSingle}">${icons}</div>`;
}

function generateCardHTML(player, options = {}) {
  const { addAnimation = false, delay = 0, disableClick = false, scaleDown = false } = options;
  const playstylesHtml = generatePlaystylesHTML(player.playstyles || player.playstyle);
  const animStyle = addAnimation ? `animation: dropIn 0.3s ease-out ${delay}s both;` : '';
  const clickAttr = disableClick ? '' : `onclick="openPlayerDetails('${player.id}')"`;
  const scaleStyle = scaleDown ? 'transform: scale(0.35) translateZ(0); transform-origin: top left; position: absolute; top:0; left:0;' : 'width: 100%; height: 100%;';
  const cursorStyle = disableClick ? '' : 'cursor: pointer;';
  
  const nationFlagUrl = getFlagUrl(player.nationName || player.nation);
  const teamImg = player.teamLogo || player.team;
  const leagueImg = player.leagueLogo || player.league;

  return `
    <div class="card-display" ${clickAttr} style="${cursorStyle}">
        <div style="${animStyle} ${scaleStyle}">
            <div class="assembled-card">
                <img src="${player.frame}" class="layer-frame" alt="Frame" loading="lazy">
                <img src="${player.image}" class="layer-player" alt="${player.name}" loading="lazy">
                <div class="card-left-info">
                    <div class="card-ovr">${player.ovr}</div>
                    <div class="card-pos">${player.position}</div>
                    <img src="${nationFlagUrl}" class="logo-nation" alt="Nation">
                    ${leagueImg ? `<img src="${leagueImg}" class="logo-league" alt="League">` : ''}
                </div>
                ${teamImg ? `
                <div class="card-right-info">
                    <img src="${teamImg}" class="logo-team" alt="Team">
                </div>
                ` : ''}
                ${playstylesHtml}
                <div class="card-bottom-info">
                    <div class="card-name">${player.name}</div>
                </div>
            </div>
        </div>
    </div>
  `;
}

function renderFeaturedPlayers() {
  const container = document.getElementById('featured-players-container');
  if (!container || !playersData) return;

  const allPlayers = [];
  if (playersData.prime) allPlayers.push(...playersData.prime);
  if (playersData.featured) allPlayers.push(...playersData.featured);
  if (allPlayers.length === 0) return; 

  const targetOvrs = [92, 91, 91, 90];
  let selectedPlayers = [];

  targetOvrs.forEach(ovr => {
    const player = allPlayers.find(p => p.ovr === ovr);
    if (player) selectedPlayers.push(player);
  });

  if (selectedPlayers.length < 4) selectedPlayers = allPlayers.slice(0, 4);

  let html = '';
  selectedPlayers.forEach(player => {
    html += `
      <div class="showcase-item">
          <div style="width: 112px; height: 112px; position: relative;">
              ${generateCardHTML(player, { scaleDown: true })}
          </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// โหลดข้อมูลนักเตะจาก Firebase
async function loadPlayersData() {
  try {
    // 1. ดึงข้อมูลนักเตะทั้งหมดจาก node players
    const allPlayersSnap = await get(ref(db, 'players'));
    if (allPlayersSnap.exists()) {
      rawAllPlayers = allPlayersSnap.val();
    }

    // 2. ดึงรายการ ID จาก draft_pools
    const dbRef = ref(db, 'draft_pools/pantheon_event');
    const snapshot = await get(dbRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      
      const parsePool = (poolObj) => {
        if (!poolObj) return [];
        const keys = Object.keys(poolObj);
        return keys.map(key => {
          const item = poolObj[key];
          const id = item.id || key;
          // แมปข้อมูลสมบูรณ์จาก rawAllPlayers
          if (rawAllPlayers[id]) {
            return { id, ...rawAllPlayers[id] };
          }
          return { id, ...item };
        });
      };

      playersData = {
        prime: parsePool(data.prime),
        featured: parsePool(data.featured),
        standard: parsePool(data.standard)
      };

      renderFeaturedPlayers();
    } else {
      console.error("ไม่พบข้อมูลนักเตะใน Database (ตำแหน่ง draft_pools/pantheon_event)");
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลนักเตะจาก Firebase:", error.code, error.message);
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startDraw(times) {
  if (isRolling) return;
  if (!playersData) { alert("กำลังโหลดข้อมูลนักเตะ กรุณารอสักครู่..."); return; }
  if (vouchers < times) { alert("ตั๋วดราฟต์ของคุณไม่พอ!"); return; }

  isRolling = true;
  vouchers -= times;

  let drawResults = [];

  for (let i = 0; i < times; i++) {
    let selectedPool = "";
    let targetOvr = 0;
    const poolRand = Math.random() * 100;

    if (primePity === 1 && featuredPity === 1) { selectedPool = "prime"; } 
    else if (primePity === 1) { selectedPool = "prime"; } 
    else if (featuredPity === 1) { selectedPool = "featured"; } 
    else {
      if (poolRand <= 1.50) { selectedPool = "prime"; } 
      else if (poolRand <= 19.50) { selectedPool = "featured"; } 
      else { selectedPool = "standard"; } 
    }

    if (selectedPool === "prime") { primePity = 60; featuredPity = 10; } 
    else if (selectedPool === "featured") { featuredPity = 10; primePity--; } 
    else { primePity--; featuredPity--; }

    const ovrRand = Math.random() * 100;
    if (selectedPool === "prime") {
      if (ovrRand <= (0.05 / 1.50) * 100) targetOvr = 92;
      else if (ovrRand <= ((0.05 + 0.55) / 1.50) * 100) targetOvr = 91;
      else targetOvr = 90;
    } else if (selectedPool === "featured") {
      if (ovrRand <= (4 / 18) * 100) targetOvr = 89;
      else if (ovrRand <= ((4 + 6) / 18) * 100) targetOvr = 88;
      else targetOvr = 87;
    } else {
      if (ovrRand <= 20) targetOvr = 86;
      else if (ovrRand <= 40) targetOvr = 85;
      else if (ovrRand <= 60) targetOvr = 84;
      else if (ovrRand <= 80) targetOvr = 83;
      else targetOvr = 82;
    }

    let poolArray = (playersData[selectedPool] || []).filter(p => p.ovr === targetOvr);
    if (poolArray.length === 0) poolArray = playersData[selectedPool] || [];
    
    if (poolArray.length === 0) {
      console.warn(`ไม่พบนักเตะใน Pool: ${selectedPool}`);
      continue;
    }

    const player = poolArray[Math.floor(Math.random() * poolArray.length)];
    drawResults.push({ player, pool: selectedPool });
  }

  saveData();
  updateUI();

  drawResults.sort((a, b) => b.player.ovr - a.player.ovr);

  let bestWalkoutPlayer = null;
  let bestWalkoutPool = "standard";
  let bestCardHTML = "";

  for (let res of drawResults) {
    if (res.pool === 'prime') {
      if (bestWalkoutPool !== 'prime' || res.player.ovr > (bestWalkoutPlayer ? bestWalkoutPlayer.ovr : 0)) {
        bestWalkoutPool = 'prime';
        bestWalkoutPlayer = res.player;
      }
    } else if (res.pool === 'featured' && bestWalkoutPool !== 'prime') {
      if (bestWalkoutPool !== 'featured' || res.player.ovr > (bestWalkoutPlayer ? bestWalkoutPlayer.ovr : 0)) {
        bestWalkoutPool = 'featured';
        bestWalkoutPlayer = res.player;
      }
    }
  }

  let allCardsHTML = '';
  drawResults.forEach((res, index) => {
    let delay = times > 1 ? (index * 0.04).toFixed(2) : 0; 
    
    let cardHtml = generateCardHTML(res.player, { addAnimation: true, delay: delay });
    allCardsHTML += cardHtml;

    if (res.player === bestWalkoutPlayer) {
      bestCardHTML = generateCardHTML(res.player, { disableClick: true });
    }
  });

  if (bestWalkoutPool === 'prime' || bestWalkoutPool === 'featured') {
    await playWalkoutAnimation(bestWalkoutPlayer, bestWalkoutPool, bestCardHTML);
  } else {
    const lightEffect = document.getElementById('light-effect');
    if (lightEffect) {
      lightEffect.className = 'light-white';
      lightEffect.style.zIndex = '950';
      lightEffect.style.display = 'block';
      await sleep(300); 
      lightEffect.style.display = 'none';
    }
  }

  showSummaryScreen(allCardsHTML, bestWalkoutPool, bestWalkoutPlayer, times, bestCardHTML);
}

async function playWalkoutAnimation(player, poolName, cardHTML) {
  return new Promise(async (resolve) => {
    const walkoutScreen = document.getElementById('walkout-screen');
    const walkoutAudio = document.getElementById('walkout-audio');
    const woBg = document.getElementById('wo-bg');
    const woNation = document.getElementById('wo-nation');
    const woPos = document.getElementById('wo-pos');
    const woTeam = document.getElementById('wo-team');
    const woCardReveal = document.getElementById('wo-card-reveal');
    const woActionText = document.getElementById('wo-action-text');

    function cleanUpWalkout() {
      walkoutScreen.onclick = null;
      if (walkoutAudio) {
        walkoutAudio.pause();
        walkoutAudio.currentTime = 0;
      }
      
      walkoutScreen.style.display = 'none';
      const lightEffect = document.getElementById('light-effect');
      if (lightEffect) lightEffect.style.display = 'none'; 
      
      woNation.classList.remove('show');
      woPos.classList.remove('show');
      woTeam.classList.remove('show');
      woCardReveal.classList.remove('show');
      woCardReveal.innerHTML = '';
      if (bgmPlayer) bgmPlayer.play().catch(e => {});
    }

    function finishWalkoutQuick() { 
      cleanUpWalkout(); 
      resolve(); 
    }

    woCardReveal.innerHTML = '';
    woCardReveal.classList.remove('show');
    woActionText.innerText = 'แตะเพื่อข้าม';
    if (bgmPlayer) bgmPlayer.pause();

    woNation.src = getFlagUrl(player.nationName || player.nation);
    woPos.innerText = player.position;
    woTeam.src = (player.teamLogo || player.team) ? (player.teamLogo || player.team) : (player.leagueLogo || player.league);

    woNation.className = 'wo-item';
    woPos.className = 'wo-item';
    woTeam.className = 'wo-item';
    woBg.style.transform = 'scale(1)';

    walkoutScreen.style.display = 'flex';

    const lightEffect = document.getElementById('light-effect');
    if (lightEffect) {
      lightEffect.className = poolName === 'prime' ? 'light-gold' : 'light-white';
      lightEffect.style.zIndex = '950'; 
      lightEffect.style.display = 'block';
      setTimeout(() => { lightEffect.style.display = 'none'; }, 800);
    }

    try { 
      if (walkoutAudio) {
        walkoutAudio.currentTime = 0; 
        walkoutAudio.play(); 
      }
    } catch (e) {}

    let isSkipped = false;
    walkoutScreen.onclick = () => { isSkipped = true; };

    const waitWithSkip = async (timeMs) => {
      const interval = 50;
      for (let i = 0; i < timeMs; i += interval) {
        if (isSkipped) return true; 
        await sleep(interval);
      }
      return false;
    };

    if (await waitWithSkip(300)) { finishWalkoutQuick(); return; }
    woBg.style.transform = 'scale(1.2)'; woNation.classList.add('show'); 
    
    if (await waitWithSkip(1000)) { finishWalkoutQuick(); return; }
    woNation.classList.remove('show'); woBg.style.transform = 'scale(1.4)'; 
    if (await waitWithSkip(250)) { finishWalkoutQuick(); return; }
    woPos.classList.add('show'); 
    
    if (await waitWithSkip(1000)) { finishWalkoutQuick(); return; }
    woPos.classList.remove('show'); woBg.style.transform = 'scale(1.7)'; 
    if (await waitWithSkip(250)) { finishWalkoutQuick(); return; }
    woTeam.classList.add('show'); 
    
    if (await waitWithSkip(1000)) { finishWalkoutQuick(); return; }
    
    walkoutScreen.onclick = null; 
    woTeam.classList.remove('show');

    await sleep(150);
    woCardReveal.innerHTML = cardHTML;
    
    const cardInWalkout = woCardReveal.querySelector('.assembled-card');
    if (cardInWalkout) { cardInWalkout.style.transform = 'scale(1)'; }

    woCardReveal.classList.add('show');
    woActionText.innerText = 'แตะเพื่อไปต่อ';

    await new Promise(res => { walkoutScreen.onclick = () => { res(); }; });

    cleanUpWalkout();
    resolve();
  });
}

function showSummaryScreen(allCardsHTML, bestPool, bestPlayer, times, bestCardHTML) {
  const summaryScreen = document.getElementById('summary-screen');
  const cardContainer = document.getElementById('summary-card-container');
  const btnReplay = document.getElementById('btn-replay-walkout');
  const btnNext = document.getElementById('btn-next');

  if (times > 1) {
    cardContainer.className = 'summary-grid-10';
  } else {
    cardContainer.className = '';
    if (bestPool !== 'prime' && bestPool !== 'featured') {
      const lightEffect = document.getElementById('light-effect');
      if (lightEffect) {
        lightEffect.className = 'light-white';
        lightEffect.style.zIndex = '100'; 
        lightEffect.style.display = 'block';
        setTimeout(() => { lightEffect.style.display = 'none'; }, 500);
      }
    }
  }

  cardContainer.innerHTML = allCardsHTML;

  if (bestPool === 'prime' || bestPool === 'featured') {
    btnReplay.style.display = 'block';
    btnReplay.onclick = async () => {
      summaryScreen.style.display = 'none'; 
      await playWalkoutAnimation(bestPlayer, bestPool, bestCardHTML); 
      showSummaryScreen(allCardsHTML, bestPool, bestPlayer, times, bestCardHTML); 
    };
  } else {
    btnReplay.style.display = 'none';
  }

  btnNext.onclick = () => {
    summaryScreen.style.display = 'none';
    cardContainer.innerHTML = '';
    cardContainer.className = '';
    isRolling = false; 
  };

  summaryScreen.style.display = 'flex';
}

function openPlayerDetails(playerId) {
  let player = rawAllPlayers[playerId];

  if (!player && playersData) {
    let allPlayers = [];
    if (playersData.prime) allPlayers.push(...playersData.prime);
    if (playersData.featured) allPlayers.push(...playersData.featured);
    if (playersData.standard) allPlayers.push(...playersData.standard);
    player = allPlayers.find(p => String(p.id) === String(playerId));
  }

  if (!player) return;

  const pdContainer = document.getElementById('pd-card-container');
  pdContainer.innerHTML = generateCardHTML(player, { disableClick: true });

  document.getElementById('pd-pos-label').innerText = player.position || 'ST';
  
  // Stamina Star Rating
  const staminaVal = Math.min(5, Math.max(1, Math.round(player.stamina || 5)));
  document.getElementById('pd-stamina').innerHTML = '★'.repeat(staminaVal) + '<span class="pd-stars-dim">' + '★'.repeat(5 - staminaVal) + '</span>';

  // Skill Moves Star Rating
  const smVal = Math.min(5, Math.max(1, Math.round(player.skillMoves || player.skillMove || 5)));
  document.getElementById('pd-skill-moves').innerHTML = '★'.repeat(smVal) + '<span class="pd-stars-dim">' + '★'.repeat(5 - smVal) + '</span>';

  document.getElementById('pd-first-name').innerText = player.firstName || '';
  document.getElementById('pd-last-name').innerText = player.lastName || player.name || '';

  document.getElementById('pd-ovr-val').innerText = player.ovr || 80;

  const nationName = player.nationName || player.nation || 'Nation';
  document.getElementById('pd-nation-img').src = getFlagUrl(nationName);
  document.getElementById('pd-nation-text').innerText = nationName;

  const leagueImg = document.getElementById('pd-league-img');
  const leagueText = document.getElementById('pd-league-text');
  const leagueDivider = document.getElementById('pd-league-divider');

  const leagueLogo = player.leagueLogo || player.league;
  if (leagueLogo) {
    leagueImg.src = leagueLogo;
    leagueImg.style.display = 'inline-block';
    leagueText.innerText = player.leagueName || 'League';
    leagueDivider.style.display = 'inline';
  } else {
    leagueImg.style.display = 'none';
    leagueText.innerText = '';
    leagueDivider.style.display = 'none';
  }

  const psContainer = document.getElementById('pd-ui-playstyles');
  const playstylesArr = player.playstyles || player.playstyle;
  if (playstylesArr && playstylesArr.length > 0) {
    psContainer.innerHTML = playstylesArr.map(ps => `<img src="${ps.icon}" class="pd-ui-ps-icon" alt="playstyle">`).join('');
  } else {
    psContainer.innerHTML = '<span style="color:#64748b; font-size:0.8rem;">ไม่มี</span>';
  }

  const defaultBaseStat = player.ovr || 75;
  const stats = player.stats || {
    pac: defaultBaseStat + 5, sho: defaultBaseStat + 3, pas: defaultBaseStat + 4,
    dri: defaultBaseStat + 6, def: defaultBaseStat - 10, phy: defaultBaseStat + 2
  };

  const statElements = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
  statElements.forEach(stat => {
    const el = document.getElementById(`pd-stat-${stat}`);
    if (el) {
      const val = stats[stat] !== undefined ? stats[stat] : 75;
      el.innerText = val;
      
      el.classList.remove('green-stat', 'yellow-stat', 'red-stat');
      if (val < 50) {
        el.classList.add('red-stat');
      } else if (val < 70) {
        el.classList.add('yellow-stat');
      } else {
        el.classList.add('green-stat');
      }
    }
  });

  document.getElementById('pd-height').innerText = player.height || '180';
  document.getElementById('pd-weight').innerText = player.weight || '75';

  const isLeft = player.preferredFoot === 'ซ้าย';
  const strongVal = 5;
  const weakVal = player.weakFoot || 4;

  const leftVal = isLeft ? strongVal : weakVal;
  const rightVal = isLeft ? weakVal : strongVal;

  const leftClass = isLeft ? 'foot-active' : 'foot-inactive';
  const rightClass = !isLeft ? 'foot-active' : 'foot-inactive';

  const footContainer = document.getElementById('pd-foot-badge-container');
  if (footContainer) {
    footContainer.innerHTML = `
      <div class="foot-single ${leftClass}">
          <svg class="foot-svg" viewBox="0 0 30 50">
              <path d="M16,2 C23,2 27,7 27,16 C27,23 22,28 22,36 C22,44 17,48 11,48 C5,48 3,43 3,36 C3,26 8,22 8,15 C8,8 10,2 16,2 Z" />
          </svg>
          <span class="foot-val">${leftVal}</span>
      </div>
      <div class="foot-single ${rightClass}">
          <svg class="foot-svg" viewBox="0 0 30 50">
              <path d="M14,2 C7,2 3,7 3,16 C3,23 8,28 8,36 C8,44 13,48 19,48 C25,48 27,43 27,36 C27,26 22,22 22,15 C22,8 20,2 14,2 Z" />
          </svg>
          <span class="foot-val">${rightVal}</span>
      </div>
    `;
  }

  document.getElementById('pd-team-text').innerText = player.teamName || 'Team';
  const teamImgEl = document.getElementById('pd-team-img');
  const teamLogo = player.teamLogo || player.team;
  if (teamLogo) {
    teamImgEl.src = teamLogo;
    teamImgEl.style.display = 'inline-block';
  } else {
    teamImgEl.style.display = 'none';
  }

  document.getElementById('player-details-screen').style.display = 'flex';
}

function closePlayerDetails() {
  document.getElementById('player-details-screen').style.display = 'none';
}

// ผูกฟังก์ชันเข้ากับ window object
window.openPlayerDetails = openPlayerDetails;
window.closePlayerDetails = closePlayerDetails;

window.onload = () => {
  updateUI();
  loadPlayersData();

  const draw1Btn = document.getElementById('draw-1-btn');
  if (draw1Btn) draw1Btn.addEventListener('click', () => startDraw(1));

  const draw10Btn = document.getElementById('draw-10-btn');
  if (draw10Btn) draw10Btn.addEventListener('click', () => startDraw(10));

  const cheatBtn = document.getElementById('cheat-btn');
  if (cheatBtn) cheatBtn.addEventListener('click', () => {
    vouchers += 10; 
    saveData();
    updateUI();
  });
};
