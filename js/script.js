import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  runTransaction, 
  onValue 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// ==========================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyATHoFquRmes-g-VkEvdqjtQldlf9GkMdM",
  authDomain: "football-manager-draft-27.firebaseapp.com",
  databaseURL: "https://football-manager-draft-27-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "football-manager-draft-27",
  storageBucket: "football-manager-draft-27.appspot.com",
  messagingSenderId: "780390171652",
  appId: "1:780390171652:web:59856be97f76d6a3ed6151"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Global User State
let currentUser = null;
let userData = { username: "", vouchers: 5, pityFeatured: 0, pityPrime: 0 };

// Auth DOM Elements
const authModal = document.getElementById("auth-modal");
const loginStep = document.getElementById("login-step");
const usernameStep = document.getElementById("username-step");
const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");

// ==========================================
// 2. AUTHENTICATION & DATABASE SYSTEM
// ==========================================

// ฟังก์ชันควบคุมการแสดงผลของ Auth Modal
function switchAuthStep(step) {
  if (!authModal) return;

  if (step === "login") {
    authModal.style.display = "flex";
    if (loginStep) loginStep.style.display = "block";
    if (usernameStep) usernameStep.style.display = "none";
  } else if (step === "username") {
    authModal.style.display = "flex";
    if (loginStep) loginStep.style.display = "none";
    if (usernameStep) usernameStep.style.display = "block";
  } else if (step === "close") {
    authModal.style.display = "none";
  }
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      alert(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userRef = ref(db, `users/${user.uid}`);
    
    try {
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.username && data.username.trim() !== "") {
          // มีชื่อผู้จัดการแล้ว -> ปิดหน้าต่างแล้วเข้าสู่เกม
          switchAuthStep("close");
        } else {
          // ยังไม่มีชื่อผู้จัดการ -> ไปหน้าตั้งชื่อ
          switchAuthStep("username");
        }
      } else {
        // บัญชีใหม่ -> บันทึกข้อมูลเริ่มต้นลง Realtime Database
        await set(userRef, {
          email: user.email || "",
          username: "",
          vouchers: 5,
          pityFeatured: 0,
          pityPrime: 0,
          createdAt: Date.now()
        });
        // จากนั้นส่งไปหน้าตั้งชื่อทันที
        switchAuthStep("username");
      }

      // ซิงค์ข้อมูล Realtime สำหรับ Voucher / Pity
      onValue(userRef, (snap) => {
        if (snap.exists()) {
          userData = snap.val();
          
          if (typeof GachaManager !== "undefined") {
            GachaManager.userVouchers = userData.vouchers || 0;
            GachaManager.pityFeatured = userData.pityFeatured || 0;
            GachaManager.pityPrime = userData.pityPrime || 0;
          }

          updateUIHeader();
        }
      });

    } catch (err) {
      console.error("Database fetch error:", err);
    }

  } else {
    currentUser = null;
    switchAuthStep("login");
  }
});

if (saveUsernameBtn) {
  saveUsernameBtn.addEventListener("click", async () => {
    const name = usernameInput ? usernameInput.value.trim() : "";
    if (!name) return alert("กรุณากรอกชื่อผู้จัดการทีม!");
    if (!currentUser) return alert("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");

    try {
      await set(ref(db, `users/${currentUser.uid}/username`), name);
      userData.username = name;
      updateUIHeader();
      switchAuthStep("close");
    } catch (err) {
      console.error("Save Username Error:", err);
      alert("บันทึกชื่อไม่สำเร็จ โปรดลองอีกครั้ง");
    }
  });
}

function updateUIHeader() {
  const voucherCountEl = document.getElementById("voucher-count");
  if (voucherCountEl) voucherCountEl.textContent = userData.vouchers || 0;

  const profileNameEl = document.getElementById("profile-name");
  if (profileNameEl && userData.username) profileNameEl.textContent = userData.username;

  const featuredPityEl = document.getElementById("featured-pity");
  if (featuredPityEl) featuredPityEl.textContent = 10 - ((userData.pityFeatured || 0) % 10);

  const primePityEl = document.getElementById("prime-pity");
  if (primePityEl) primePityEl.textContent = 60 - ((userData.pityPrime || 0) % 60);
}

// ฟังก์ชันตัดตั๋วผ่าน Firebase Transaction
async function deductVouchersTransaction(amount) {
  if (!currentUser) {
    alert("กรุณาเข้าสู่ระบบก่อนดราฟต์!");
    return false;
  }
  if ((userData.vouchers || 0) < amount) {
    alert("ตั๋วดราฟต์ของคุณไม่พอ!");
    return false;
  }

  const userRef = ref(db, `users/${currentUser.uid}`);

  try {
    const result = await runTransaction(userRef, (currentData) => {
      if (currentData) {
        if (currentData.vouchers >= amount) {
          currentData.vouchers -= amount;
          currentData.pityFeatured = (currentData.pityFeatured || 0) + amount;
          currentData.pityPrime = (currentData.pityPrime || 0) + amount;
        } else {
          return;
        }
      }
      return currentData;
    });

    return result.committed;
  } catch (error) {
    console.error("Transaction Error:", error);
    alert("เกิดข้อผิดพลาดในการตัดตั๋ว");
    return false;
  }
}

// ==========================================
// 3. GAME LOGIC & SYSTEM
// ==========================================
let globalPlayerDatabase = [];
let packData = null;
let lastDrawnResults = [];

const draw1Btn = document.getElementById("draw-1-btn");
const draw10Btn = document.getElementById("draw-10-btn");
const cheatBtn = document.getElementById("cheat-btn");
const summaryScreen = document.getElementById("summary-screen");
const btnNext = document.getElementById("btn-next");
const playerDetailsScreen = document.getElementById("player-details-screen");

// --- Sound Manager ---
const soundManager = {
  bgm: document.getElementById("bgm-player"),
  walkoutAudio: document.getElementById("walkout-audio"),
  init() {
    if (this.bgm) {
      this.bgm.src = "assets/audio/bgm.mp3";
      this.bgm.loop = true;
      this.bgm.volume = 0.4;
    }
  },
  playBGM() {
    if (this.bgm && this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
  },
  playWalkoutSound(audioSrc) {
    if (this.bgm) this.bgm.pause();
    if (this.walkoutAudio) {
      this.walkoutAudio.src = audioSrc || "assets/audio/pantheon.mp3";
      this.walkoutAudio.currentTime = 0;
      this.walkoutAudio.play().catch(() => {});
    }
  },
  stopWalkoutSound() {
    if (this.walkoutAudio) {
      this.walkoutAudio.pause();
      this.walkoutAudio.currentTime = 0;
    }
    this.playBGM();
  }
};

// --- Gacha Manager ---
const GachaManager = {
  userVouchers: 5,
  pityFeatured: 0,
  pityPrime: 0,

  async draw(count) {
    if (!globalPlayerDatabase.length) return [];

    const success = await deductVouchersTransaction(count);
    if (!success) return [];

    const drawnResults = [];
    for (let i = 0; i < count; i++) {
      const player = this.rollSinglePlayer();
      drawnResults.push(player);
    }

    lastDrawnResults = drawnResults;
    return drawnResults;
  },

  rollSinglePlayer() {
    const isPrimeGuaranteed = this.pityPrime >= 60;
    const isFeaturedGuaranteed = this.pityFeatured >= 10;

    let pool = (packData && packData.players) ? packData.players : globalPlayerDatabase;
    let selectedPlayer = null;

    if (isPrimeGuaranteed) {
      const primePool = pool.filter(p => p.rarity === "PRIME" || p.ovr >= 120);
      selectedPlayer = primePool.length ? primePool[Math.floor(Math.random() * primePool.length)] : null;
    } else if (isFeaturedGuaranteed) {
      const featuredPool = pool.filter(p => p.isFeatured || p.ovr >= 115);
      selectedPlayer = featuredPool.length ? featuredPool[Math.floor(Math.random() * featuredPool.length)] : null;
    }

    if (!selectedPlayer) {
      selectedPlayer = pool[Math.floor(Math.random() * pool.length)];
    }

    return selectedPlayer || pool[0];
  }
};

// --- UI Controller ---
const UIController = {
  renderFeaturedPlayers(players) {
    const container = document.getElementById("featured-players-container");
    if (!container) return;
    container.innerHTML = "";

    const featuredList = players.filter(p => p.isFeatured || p.ovr >= 118).slice(0, 4);

    featuredList.forEach(player => {
      const cardEl = document.createElement("div");
      cardEl.className = "featured-card";
      cardEl.onclick = () => playerDetailsController.open(player);

      cardEl.innerHTML = `
        <div class="card-inner">
          <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="card-frame">
          <img src="${player.cardImg || ''}" class="card-player-img" loading="lazy">
          <div class="card-ovr">${player.ovr || 0}</div>
          <div class="card-pos">${player.position || ''}</div>
          <div class="card-name">${player.lastName || player.name || ''}</div>
        </div>
      `;
      container.appendChild(cardEl);
    });
  },

  renderSummaryCards(players) {
    const container = document.getElementById("summary-card-container");
    if (!container) return;
    container.innerHTML = "";

    players.forEach(player => {
      const cardEl = document.createElement("div");
      cardEl.className = "summary-card-item";
      cardEl.onclick = () => playerDetailsController.open(player);

      cardEl.innerHTML = `
        <div class="card-wrapper">
          <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="summary-frame">
          <img src="${player.cardImg || ''}" class="summary-player-img">
          <div class="summary-ovr">${player.ovr || 0}</div>
          <div class="summary-pos">${player.position || ''}</div>
          <div class="summary-name">${player.lastName || player.name || ''}</div>
        </div>
      `;
      container.appendChild(cardEl);
    });
  }
};

// --- Walkout Controller ---
const walkoutController = {
  screen: document.getElementById("walkout-screen"),
  currentPlayer: null,

  start(player) {
    if (!this.screen || !player) {
      this.finish();
      return;
    }

    this.currentPlayer = player;
    
    const woNation = document.getElementById("wo-nation");
    const woPos = document.getElementById("wo-pos");
    const woTeam = document.getElementById("wo-team");
    
    if (woNation) woNation.src = player.nationImg || "";
    if (woPos) woPos.textContent = player.position || "";
    if (woTeam) woTeam.src = player.teamImg || "";
    
    const woCardReveal = document.getElementById("wo-card-reveal");
    if (woCardReveal) {
      woCardReveal.innerHTML = `
        <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="wo-card-frame">
        <img src="${player.cardImg || ''}" class="wo-card-img">
      `;
    }

    this.screen.style.display = "flex";
    soundManager.playWalkoutSound(player.walkoutAudio);

    this.screen.onclick = () => this.finish();
  },

  finish() {
    if (this.screen) this.screen.style.display = "none";
    soundManager.stopWalkoutSound();
    
    if (summaryScreen) {
      UIController.renderSummaryCards(lastDrawnResults);
      summaryScreen.style.display = "flex";
    }
  }
};

// --- Player Details Controller ---
const playerDetailsController = {
  open(player) {
    if (!player || !playerDetailsScreen) return;

    const setElText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setElText("pd-first-name", player.firstName || "");
    setElText("pd-last-name", player.lastName || player.name || "");
    setElText("pd-pos-label", player.position || "CB");
    setElText("pd-ovr-val", player.ovr || 0);
    setElText("pd-height", player.height || 180);
    setElText("pd-weight", player.weight || 75);

    const pdTeamImg = document.getElementById("pd-team-img");
    if (pdTeamImg) pdTeamImg.src = player.teamImg || "";
    setElText("pd-team-text", player.teamText || "Club");

    const pdNationImg = document.getElementById("pd-nation-img");
    if (pdNationImg) pdNationImg.src = player.nationImg || "";
    setElText("pd-nation-text", player.nationText || "Nation");

    if (player.leagueImg) {
      const lImg = document.getElementById("pd-league-img");
      const lDiv = document.getElementById("pd-league-divider");
      const lTxt = document.getElementById("pd-league-text");
      if (lImg) { lImg.src = player.leagueImg; lImg.style.display = "inline-block"; }
      if (lDiv) lDiv.style.display = "inline";
      if (lTxt) lTxt.textContent = player.leagueText || "";
    }

    const staminaEl = document.getElementById("pd-stamina");
    if (staminaEl) staminaEl.textContent = "★".repeat(player.stamina || 5);

    const skillEl = document.getElementById("pd-skill-moves");
    if (skillEl) {
      const count = player.skillMoves || 3;
      skillEl.innerHTML = "★".repeat(count) + `<span class="pd-stars-dim">${"★".repeat(Math.max(0, 5 - count))}</span>`;
    }

    const stats = player.stats || { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
    setElText("pd-stat-pac", stats.pac);
    setElText("pd-stat-sho", stats.sho);
    setElText("pd-stat-pas", stats.pas);
    setElText("pd-stat-dri", stats.dri);
    setElText("pd-stat-def", stats.def);
    setElText("pd-stat-phy", stats.phy);

    playerDetailsScreen.style.display = "block";
  },

  close() {
    if (playerDetailsScreen) playerDetailsScreen.style.display = "none";
  }
};

window.closePlayerDetails = () => playerDetailsController.close();

// ==========================================
// 4. EVENT LISTENERS & INITIALIZATION
// ==========================================
async function handleDraw(count) {
  soundManager.playBGM();
  const results = await GachaManager.draw(count);
  if (results && results.length > 0) {
    const topPlayer = results.reduce((max, p) => (p.ovr > max.ovr ? p : max), results[0]);
    walkoutController.start(topPlayer);
  }
}

if (draw1Btn) draw1Btn.addEventListener("click", () => handleDraw(1));
if (draw10Btn) draw10Btn.addEventListener("click", () => handleDraw(10));

if (btnNext) {
  btnNext.addEventListener("click", () => {
    if (summaryScreen) summaryScreen.style.display = "none";
  });
}

if (cheatBtn) {
  cheatBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อน!");
    const userRef = ref(db, `users/${currentUser.uid}`);
    await runTransaction(userRef, (currentData) => {
      if (currentData) {
        currentData.vouchers = (currentData.vouchers || 0) + 10;
      }
      return currentData;
    });
  });
}

function initDummyData() {
  globalPlayerDatabase = [
    {
      name: "Vincent Kompany",
      firstName: "VINCENT",
      lastName: "KOMPANY",
      ovr: 122,
      position: "CB",
      isFeatured: true,
      rarity: "PRIME",
      height: 190,
      weight: 85,
      stamina: 5,
      skillMoves: 3,
      cardFrame: "assets/images/frames/frame_pantheon_prime_featured.png",
      cardImg: "assets/images/players/kompany.png",
      stats: { pac: 110, sho: 75, pas: 90, dri: 92, def: 125, phy: 122 }
    }
  ];
  UIController.renderFeaturedPlayers(globalPlayerDatabase);
}

soundManager.init();
initDummyData();
let userData = { username: "", vouchers: 5, pityFeatured: 0, pityPrime: 0 };

// Auth DOM Elements
const authModal = document.getElementById("auth-modal");
const loginStep = document.getElementById("login-step");
const usernameStep = document.getElementById("username-step");
const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");

// ==========================================
// 2. AUTHENTICATION & DATABASE SYSTEM
// ==========================================
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      alert(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}\n(ตรวจสอบว่าใส่ API Key ถูกต้องหรือไม่)`);
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userRef = ref(db, `users/${user.uid}`);
    let snapshot = await get(userRef);

    // 1. ถ้ายังไม่มีข้อมูลผู้ใช้ใน Database ให้สร้างข้อมูลเริ่มต้นก่อน
    if (!snapshot.exists()) {
      await set(userRef, {
        email: user.email,
        username: "",
        vouchers: 5,
        pityFeatured: 0,
        pityPrime: 0,
        createdAt: Date.now()
      });
      // ดึงข้อมูลใหม่อีกครั้งหลังจากสร้างเสร็จ
      snapshot = await get(userRef);
    }

    // 2. ตรวจสอบชื่อ Username
    const data = snapshot.val();
    if (data && data.username && data.username.trim() !== "") {
      // มีชื่อแล้ว -> ปิด Pop-up เข้าหน้าเกม
      if (authModal) authModal.style.display = "none";
    } else {
      // ยังไม่มีชื่อ -> สลับไปหน้ากรอกชื่อผู้จัดการทีม
      showUsernameStep();
    }

    // 3. ซิงค์ข้อมูล Realtime
    onValue(userRef, (snap) => {
      if (snap.exists()) {
        userData = snap.val();
        
        if (typeof GachaManager !== "undefined") {
          GachaManager.userVouchers = userData.vouchers || 0;
          GachaManager.pityFeatured = userData.pityFeatured || 0;
          GachaManager.pityPrime = userData.pityPrime || 0;
        }

        updateUIHeader();
      }
    });

  } else {
    currentUser = null;
    if (authModal) {
      authModal.style.display = "flex";
      if (loginStep) loginStep.style.display = "block";
      if (usernameStep) usernameStep.style.display = "none";
    }
  }
});

function showUsernameStep() {
  if (authModal) authModal.style.display = "flex";
  if (loginStep) loginStep.style.display = "none";
  if (usernameStep) usernameStep.style.display = "block";
}

if (saveUsernameBtn) {
  saveUsernameBtn.addEventListener("click", async () => {
    const name = usernameInput.value.trim();
    if (!name) return alert("กรุณากรอกชื่อผู้จัดการทีม!");
    if (!currentUser) return;

    try {
      await set(ref(db, `users/${currentUser.uid}/username`), name);
      if (authModal) authModal.style.display = "none";
    } catch (err) {
      alert("บันทึกชื่อไม่สำเร็จ โปรดลองใหม่");
    }
  });
}

function updateUIHeader() {
  const voucherCountEl = document.getElementById("voucher-count");
  if (voucherCountEl) voucherCountEl.textContent = userData.vouchers || 0;

  const profileNameEl = document.getElementById("profile-name");
  if (profileNameEl && userData.username) profileNameEl.textContent = userData.username;

  const featuredPityEl = document.getElementById("featured-pity");
  if (featuredPityEl) featuredPityEl.textContent = 10 - ((userData.pityFeatured || 0) % 10);

  const primePityEl = document.getElementById("prime-pity");
  if (primePityEl) primePityEl.textContent = 60 - ((userData.pityPrime || 0) % 60);
}

// ฟังก์ชันตัดตั๋วผ่าน Firebase Transaction
async function deductVouchersTransaction(amount) {
  if (!currentUser) {
    alert("กรุณาเข้าสู่ระบบก่อนดราฟต์!");
    return false;
  }
  if ((userData.vouchers || 0) < amount) {
    alert("ตั๋วดราฟต์ของคุณไม่พอ!");
    return false;
  }

  const userRef = ref(db, `users/${currentUser.uid}`);

  try {
    const result = await runTransaction(userRef, (currentData) => {
      if (currentData) {
        if (currentData.vouchers >= amount) {
          currentData.vouchers -= amount;
          currentData.pityFeatured = (currentData.pityFeatured || 0) + amount;
          currentData.pityPrime = (currentData.pityPrime || 0) + amount;
        } else {
          return;
        }
      }
      return currentData;
    });

    return result.committed;
  } catch (error) {
    console.error("Transaction Error:", error);
    alert("เกิดข้อผิดพลาดในการตัดตั๋ว");
    return false;
  }
}

// ==========================================
// 3. GAME LOGIC & SYSTEM
// ==========================================
let globalPlayerDatabase = [];
let packData = null;
let lastDrawnResults = [];

const draw1Btn = document.getElementById("draw-1-btn");
const draw10Btn = document.getElementById("draw-10-btn");
const cheatBtn = document.getElementById("cheat-btn");
const summaryScreen = document.getElementById("summary-screen");
const btnNext = document.getElementById("btn-next");
const playerDetailsScreen = document.getElementById("player-details-screen");

// --- Sound Manager ---
const soundManager = {
  bgm: document.getElementById("bgm-player"),
  walkoutAudio: document.getElementById("walkout-audio"),
  init() {
    if (this.bgm) {
      this.bgm.src = "assets/audio/bgm.mp3";
      this.bgm.loop = true;
      this.bgm.volume = 0.4;
    }
  },
  playBGM() {
    if (this.bgm && this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
  },
  playWalkoutSound(audioSrc) {
    if (this.bgm) this.bgm.pause();
    if (this.walkoutAudio) {
      this.walkoutAudio.src = audioSrc || "assets/audio/pantheon.mp3";
      this.walkoutAudio.currentTime = 0;
      this.walkoutAudio.play().catch(() => {});
    }
  },
  stopWalkoutSound() {
    if (this.walkoutAudio) {
      this.walkoutAudio.pause();
      this.walkoutAudio.currentTime = 0;
    }
    this.playBGM();
  }
};

// --- Gacha Manager ---
const GachaManager = {
  userVouchers: 5,
  pityFeatured: 0,
  pityPrime: 0,

  async draw(count) {
    if (!globalPlayerDatabase.length) return [];

    const success = await deductVouchersTransaction(count);
    if (!success) return [];

    const drawnResults = [];
    for (let i = 0; i < count; i++) {
      const player = this.rollSinglePlayer();
      drawnResults.push(player);
    }

    lastDrawnResults = drawnResults;
    return drawnResults;
  },

  rollSinglePlayer() {
    const isPrimeGuaranteed = this.pityPrime >= 60;
    const isFeaturedGuaranteed = this.pityFeatured >= 10;

    let pool = (packData && packData.players) ? packData.players : globalPlayerDatabase;
    let selectedPlayer = null;

    if (isPrimeGuaranteed) {
      const primePool = pool.filter(p => p.rarity === "PRIME" || p.ovr >= 120);
      selectedPlayer = primePool.length ? primePool[Math.floor(Math.random() * primePool.length)] : null;
    } else if (isFeaturedGuaranteed) {
      const featuredPool = pool.filter(p => p.isFeatured || p.ovr >= 115);
      selectedPlayer = featuredPool.length ? featuredPool[Math.floor(Math.random() * featuredPool.length)] : null;
    }

    if (!selectedPlayer) {
      selectedPlayer = pool[Math.floor(Math.random() * pool.length)];
    }

    return selectedPlayer || pool[0];
  }
};

// --- UI Controller ---
const UIController = {
  renderFeaturedPlayers(players) {
    const container = document.getElementById("featured-players-container");
    if (!container) return;
    container.innerHTML = "";

    const featuredList = players.filter(p => p.isFeatured || p.ovr >= 118).slice(0, 4);

    featuredList.forEach(player => {
      const cardEl = document.createElement("div");
      cardEl.className = "featured-card";
      cardEl.onclick = () => playerDetailsController.open(player);

      cardEl.innerHTML = `
        <div class="card-inner">
          <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="card-frame">
          <img src="${player.cardImg || ''}" class="card-player-img" loading="lazy">
          <div class="card-ovr">${player.ovr || 0}</div>
          <div class="card-pos">${player.position || ''}</div>
          <div class="card-name">${player.lastName || player.name || ''}</div>
        </div>
      `;
      container.appendChild(cardEl);
    });
  },

  renderSummaryCards(players) {
    const container = document.getElementById("summary-card-container");
    if (!container) return;
    container.innerHTML = "";

    players.forEach(player => {
      const cardEl = document.createElement("div");
      cardEl.className = "summary-card-item";
      cardEl.onclick = () => playerDetailsController.open(player);

      cardEl.innerHTML = `
        <div class="card-wrapper">
          <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="summary-frame">
          <img src="${player.cardImg || ''}" class="summary-player-img">
          <div class="summary-ovr">${player.ovr || 0}</div>
          <div class="summary-pos">${player.position || ''}</div>
          <div class="summary-name">${player.lastName || player.name || ''}</div>
        </div>
      `;
      container.appendChild(cardEl);
    });
  }
};

// --- Walkout Controller ---
const walkoutController = {
  screen: document.getElementById("walkout-screen"),
  currentPlayer: null,

  start(player) {
    if (!this.screen || !player) {
      this.finish();
      return;
    }

    this.currentPlayer = player;
    
    const woNation = document.getElementById("wo-nation");
    const woPos = document.getElementById("wo-pos");
    const woTeam = document.getElementById("wo-team");
    
    if (woNation) woNation.src = player.nationImg || "";
    if (woPos) woPos.textContent = player.position || "";
    if (woTeam) woTeam.src = player.teamImg || "";
    
    const woCardReveal = document.getElementById("wo-card-reveal");
    if (woCardReveal) {
      woCardReveal.innerHTML = `
        <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="wo-card-frame">
        <img src="${player.cardImg || ''}" class="wo-card-img">
      `;
    }

    this.screen.style.display = "flex";
    soundManager.playWalkoutSound(player.walkoutAudio);

    this.screen.onclick = () => this.finish();
  },

  finish() {
    if (this.screen) this.screen.style.display = "none";
    soundManager.stopWalkoutSound();
    
    if (summaryScreen) {
      UIController.renderSummaryCards(lastDrawnResults);
      summaryScreen.style.display = "flex";
    }
  }
};

// --- Player Details Controller ---
const playerDetailsController = {
  open(player) {
    if (!player || !playerDetailsScreen) return;

    const setElText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setElText("pd-first-name", player.firstName || "");
    setElText("pd-last-name", player.lastName || player.name || "");
    setElText("pd-pos-label", player.position || "CB");
    setElText("pd-ovr-val", player.ovr || 0);
    setElText("pd-height", player.height || 180);
    setElText("pd-weight", player.weight || 75);

    const pdTeamImg = document.getElementById("pd-team-img");
    if (pdTeamImg) pdTeamImg.src = player.teamImg || "";
    setElText("pd-team-text", player.teamText || "Club");

    const pdNationImg = document.getElementById("pd-nation-img");
    if (pdNationImg) pdNationImg.src = player.nationImg || "";
    setElText("pd-nation-text", player.nationText || "Nation");

    if (player.leagueImg) {
      const lImg = document.getElementById("pd-league-img");
      const lDiv = document.getElementById("pd-league-divider");
      const lTxt = document.getElementById("pd-league-text");
      if (lImg) { lImg.src = player.leagueImg; lImg.style.display = "inline-block"; }
      if (lDiv) lDiv.style.display = "inline";
      if (lTxt) lTxt.textContent = player.leagueText || "";
    }

    const staminaEl = document.getElementById("pd-stamina");
    if (staminaEl) staminaEl.textContent = "★".repeat(player.stamina || 5);

    const skillEl = document.getElementById("pd-skill-moves");
    if (skillEl) {
      const count = player.skillMoves || 3;
      skillEl.innerHTML = "★".repeat(count) + `<span class="pd-stars-dim">${"★".repeat(Math.max(0, 5 - count))}</span>`;
    }

    const stats = player.stats || { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
    setElText("pd-stat-pac", stats.pac);
    setElText("pd-stat-sho", stats.sho);
    setElText("pd-stat-pas", stats.pas);
    setElText("pd-stat-dri", stats.dri);
    setElText("pd-stat-def", stats.def);
    setElText("pd-stat-phy", stats.phy);

    playerDetailsScreen.style.display = "block";
  },

  close() {
    if (playerDetailsScreen) playerDetailsScreen.style.display = "none";
  }
};

window.closePlayerDetails = () => playerDetailsController.close();

// ==========================================
// 4. EVENT LISTENERS & INITIALIZATION
// ==========================================
async function handleDraw(count) {
  soundManager.playBGM();
  const results = await GachaManager.draw(count);
  if (results && results.length > 0) {
    const topPlayer = results.reduce((max, p) => (p.ovr > max.ovr ? p : max), results[0]);
    walkoutController.start(topPlayer);
  }
}

if (draw1Btn) draw1Btn.addEventListener("click", () => handleDraw(1));
if (draw10Btn) draw10Btn.addEventListener("click", () => handleDraw(10));

if (btnNext) {
  btnNext.addEventListener("click", () => {
    if (summaryScreen) summaryScreen.style.display = "none";
  });
}

if (cheatBtn) {
  cheatBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อน!");
    const userRef = ref(db, `users/${currentUser.uid}`);
    await runTransaction(userRef, (currentData) => {
      if (currentData) {
        currentData.vouchers = (currentData.vouchers || 0) + 10;
      }
      return currentData;
    });
  });
}

function initDummyData() {
  globalPlayerDatabase = [
    {
      name: "Vincent Kompany",
      firstName: "VINCENT",
      lastName: "KOMPANY",
      ovr: 122,
      position: "CB",
      isFeatured: true,
      rarity: "PRIME",
      height: 190,
      weight: 85,
      stamina: 5,
      skillMoves: 3,
      cardFrame: "assets/images/frames/frame_pantheon_prime_featured.png",
      cardImg: "assets/images/players/kompany.png",
      stats: { pac: 110, sho: 75, pas: 90, dri: 92, def: 125, phy: 122 }
    }
  ];
  UIController.renderFeaturedPlayers(globalPlayerDatabase);
}

soundManager.init();
initDummyData();
let userData = { username: "", vouchers: 5, pityFeatured: 0, pityPrime: 0 };

// Auth DOM Elements
const authModal = document.getElementById("auth-modal");
const loginStep = document.getElementById("login-step");
const usernameStep = document.getElementById("username-step");
const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");

// ==========================================
// 2. AUTHENTICATION & DATABASE SYSTEM
// ==========================================
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    try {
      // เปลี่ยนมาใช้ Popup แทน Redirect เพื่อรองรับแอปพลิเคชันบนมือถือ
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      alert(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}\n(ตรวจสอบว่าใส่ API Key ถูกต้องหรือไม่)`);
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.username && data.username.trim() !== "") {
        if (authModal) authModal.style.display = "none";
      } else {
        showUsernameStep();
      }
    } else {
      await set(userRef, {
        email: user.email,
        username: "",
        vouchers: 5,
        pityFeatured: 0,
        pityPrime: 0,
        createdAt: Date.now()
      });
      showUsernameStep();
    }

    // ซิงค์ข้อมูล Realtime
    onValue(userRef, (snap) => {
      if (snap.exists()) {
        userData = snap.val();
        
        if (typeof GachaManager !== "undefined") {
          GachaManager.userVouchers = userData.vouchers || 0;
          GachaManager.pityFeatured = userData.pityFeatured || 0;
          GachaManager.pityPrime = userData.pityPrime || 0;
        }

        updateUIHeader();
      }
    });

  } else {
    currentUser = null;
    if (authModal) {
      authModal.style.display = "flex";
      loginStep.style.display = "block";
      usernameStep.style.display = "none";
    }
  }
});

function showUsernameStep() {
  if (loginStep) loginStep.style.display = "none";
  if (usernameStep) usernameStep.style.display = "block";
}

if (saveUsernameBtn) {
  saveUsernameBtn.addEventListener("click", async () => {
    const name = usernameInput.value.trim();
    if (!name) return alert("กรุณากรอกชื่อผู้จัดการทีม!");
    if (!currentUser) return;

    try {
      await set(ref(db, `users/${currentUser.uid}/username`), name);
      if (authModal) authModal.style.display = "none";
    } catch (err) {
      alert("บันทึกชื่อไม่สำเร็จ โปรดลองใหม่");
    }
  });
}

function updateUIHeader() {
  const voucherCountEl = document.getElementById("voucher-count");
  if (voucherCountEl) voucherCountEl.textContent = userData.vouchers || 0;

  const profileNameEl = document.getElementById("profile-name");
  if (profileNameEl && userData.username) profileNameEl.textContent = userData.username;

  const featuredPityEl = document.getElementById("featured-pity");
  if (featuredPityEl) featuredPityEl.textContent = 10 - ((userData.pityFeatured || 0) % 10);

  const primePityEl = document.getElementById("prime-pity");
  if (primePityEl) primePityEl.textContent = 60 - ((userData.pityPrime || 0) % 60);
}

// ฟังก์ชันตัดตั๋วผ่าน Firebase Transaction
async function deductVouchersTransaction(amount) {
  if (!currentUser) {
    alert("กรุณาเข้าสู่ระบบก่อนดราฟต์!");
    return false;
  }
  if ((userData.vouchers || 0) < amount) {
    alert("ตั๋วดราฟต์ของคุณไม่พอ!");
    return false;
  }

  const userRef = ref(db, `users/${currentUser.uid}`);

  try {
    const result = await runTransaction(userRef, (currentData) => {
      if (currentData) {
        if (currentData.vouchers >= amount) {
          currentData.vouchers -= amount;
          currentData.pityFeatured = (currentData.pityFeatured || 0) + amount;
          currentData.pityPrime = (currentData.pityPrime || 0) + amount;
        } else {
          return;
        }
      }
      return currentData;
    });

    return result.committed;
  } catch (error) {
    console.error("Transaction Error:", error);
    alert("เกิดข้อผิดพลาดในการตัดตั๋ว");
    return false;
  }
}

// ==========================================
// 3. GAME LOGIC & SYSTEM
// ==========================================
let globalPlayerDatabase = [];
let packData = null;
let lastDrawnResults = [];

const draw1Btn = document.getElementById("draw-1-btn");
const draw10Btn = document.getElementById("draw-10-btn");
const cheatBtn = document.getElementById("cheat-btn");
const summaryScreen = document.getElementById("summary-screen");
const btnNext = document.getElementById("btn-next");
const playerDetailsScreen = document.getElementById("player-details-screen");

// --- Sound Manager ---
const soundManager = {
  bgm: document.getElementById("bgm-player"),
  walkoutAudio: document.getElementById("walkout-audio"),
  init() {
    if (this.bgm) {
      this.bgm.src = "assets/audio/bgm.mp3";
      this.bgm.loop = true;
      this.bgm.volume = 0.4;
    }
  },
  playBGM() {
    if (this.bgm && this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
  },
  playWalkoutSound(audioSrc) {
    if (this.bgm) this.bgm.pause();
    if (this.walkoutAudio) {
      this.walkoutAudio.src = audioSrc || "assets/audio/pantheon.mp3";
      this.walkoutAudio.currentTime = 0;
      this.walkoutAudio.play().catch(() => {});
    }
  },
  stopWalkoutSound() {
    if (this.walkoutAudio) {
      this.walkoutAudio.pause();
      this.walkoutAudio.currentTime = 0;
    }
    this.playBGM();
  }
};

// --- Gacha Manager ---
const GachaManager = {
  userVouchers: 5,
  pityFeatured: 0,
  pityPrime: 0,

  async draw(count) {
    if (!globalPlayerDatabase.length) return [];

    const success = await deductVouchersTransaction(count);
    if (!success) return [];

    const drawnResults = [];
    for (let i = 0; i < count; i++) {
      const player = this.rollSinglePlayer();
      drawnResults.push(player);
    }

    lastDrawnResults = drawnResults;
    return drawnResults;
  },

  rollSinglePlayer() {
    const isPrimeGuaranteed = this.pityPrime >= 60;
    const isFeaturedGuaranteed = this.pityFeatured >= 10;

    let pool = (packData && packData.players) ? packData.players : globalPlayerDatabase;
    let selectedPlayer = null;

    if (isPrimeGuaranteed) {
      const primePool = pool.filter(p => p.rarity === "PRIME" || p.ovr >= 120);
      selectedPlayer = primePool.length ? primePool[Math.floor(Math.random() * primePool.length)] : null;
    } else if (isFeaturedGuaranteed) {
      const featuredPool = pool.filter(p => p.isFeatured || p.ovr >= 115);
      selectedPlayer = featuredPool.length ? featuredPool[Math.floor(Math.random() * featuredPool.length)] : null;
    }

    if (!selectedPlayer) {
      selectedPlayer = pool[Math.floor(Math.random() * pool.length)];
    }

    return selectedPlayer || pool[0];
  }
};

// --- UI Controller ---
const UIController = {
  renderFeaturedPlayers(players) {
    const container = document.getElementById("featured-players-container");
    if (!container) return;
    container.innerHTML = "";

    const featuredList = players.filter(p => p.isFeatured || p.ovr >= 118).slice(0, 4);

    featuredList.forEach(player => {
      const cardEl = document.createElement("div");
      cardEl.className = "featured-card";
      cardEl.onclick = () => playerDetailsController.open(player);

      cardEl.innerHTML = `
        <div class="card-inner">
          <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="card-frame">
          <img src="${player.cardImg || ''}" class="card-player-img" loading="lazy">
          <div class="card-ovr">${player.ovr || 0}</div>
          <div class="card-pos">${player.position || ''}</div>
          <div class="card-name">${player.lastName || player.name || ''}</div>
        </div>
      `;
      container.appendChild(cardEl);
    });
  },

  renderSummaryCards(players) {
    const container = document.getElementById("summary-card-container");
    if (!container) return;
    container.innerHTML = "";

    players.forEach(player => {
      const cardEl = document.createElement("div");
      cardEl.className = "summary-card-item";
      cardEl.onclick = () => playerDetailsController.open(player);

      cardEl.innerHTML = `
        <div class="card-wrapper">
          <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="summary-frame">
          <img src="${player.cardImg || ''}" class="summary-player-img">
          <div class="summary-ovr">${player.ovr || 0}</div>
          <div class="summary-pos">${player.position || ''}</div>
          <div class="summary-name">${player.lastName || player.name || ''}</div>
        </div>
      `;
      container.appendChild(cardEl);
    });
  }
};

// --- Walkout Controller ---
const walkoutController = {
  screen: document.getElementById("walkout-screen"),
  currentPlayer: null,

  start(player) {
    if (!this.screen || !player) {
      this.finish();
      return;
    }

    this.currentPlayer = player;
    
    const woNation = document.getElementById("wo-nation");
    const woPos = document.getElementById("wo-pos");
    const woTeam = document.getElementById("wo-team");
    
    if (woNation) woNation.src = player.nationImg || "";
    if (woPos) woPos.textContent = player.position || "";
    if (woTeam) woTeam.src = player.teamImg || "";
    
    const woCardReveal = document.getElementById("wo-card-reveal");
    if (woCardReveal) {
      woCardReveal.innerHTML = `
        <img src="${player.cardFrame || 'assets/images/frames/frame_pantheon_prime_featured.png'}" class="wo-card-frame">
        <img src="${player.cardImg || ''}" class="wo-card-img">
      `;
    }

    this.screen.style.display = "flex";
    soundManager.playWalkoutSound(player.walkoutAudio);

    this.screen.onclick = () => this.finish();
  },

  finish() {
    if (this.screen) this.screen.style.display = "none";
    soundManager.stopWalkoutSound();
    
    if (summaryScreen) {
      UIController.renderSummaryCards(lastDrawnResults);
      summaryScreen.style.display = "flex";
    }
  }
};

// --- Player Details Controller ---
const playerDetailsController = {
  open(player) {
    if (!player || !playerDetailsScreen) return;

    const setElText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setElText("pd-first-name", player.firstName || "");
    setElText("pd-last-name", player.lastName || player.name || "");
    setElText("pd-pos-label", player.position || "CB");
    setElText("pd-ovr-val", player.ovr || 0);
    setElText("pd-height", player.height || 180);
    setElText("pd-weight", player.weight || 75);

    const pdTeamImg = document.getElementById("pd-team-img");
    if (pdTeamImg) pdTeamImg.src = player.teamImg || "";
    setElText("pd-team-text", player.teamText || "Club");

    const pdNationImg = document.getElementById("pd-nation-img");
    if (pdNationImg) pdNationImg.src = player.nationImg || "";
    setElText("pd-nation-text", player.nationText || "Nation");

    if (player.leagueImg) {
      const lImg = document.getElementById("pd-league-img");
      const lDiv = document.getElementById("pd-league-divider");
      const lTxt = document.getElementById("pd-league-text");
      if (lImg) { lImg.src = player.leagueImg; lImg.style.display = "inline-block"; }
      if (lDiv) lDiv.style.display = "inline";
      if (lTxt) lTxt.textContent = player.leagueText || "";
    }

    const staminaEl = document.getElementById("pd-stamina");
    if (staminaEl) staminaEl.textContent = "★".repeat(player.stamina || 5);

    const skillEl = document.getElementById("pd-skill-moves");
    if (skillEl) {
      const count = player.skillMoves || 3;
      skillEl.innerHTML = "★".repeat(count) + `<span class="pd-stars-dim">${"★".repeat(Math.max(0, 5 - count))}</span>`;
    }

    const stats = player.stats || { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 };
    setElText("pd-stat-pac", stats.pac);
    setElText("pd-stat-sho", stats.sho);
    setElText("pd-stat-pas", stats.pas);
    setElText("pd-stat-dri", stats.dri);
    setElText("pd-stat-def", stats.def);
    setElText("pd-stat-phy", stats.phy);

    playerDetailsScreen.style.display = "block";
  },

  close() {
    if (playerDetailsScreen) playerDetailsScreen.style.display = "none";
  }
};

window.closePlayerDetails = () => playerDetailsController.close();

// ==========================================
// 4. EVENT LISTENERS & INITIALIZATION
// ==========================================
async function handleDraw(count) {
  soundManager.playBGM();
  const results = await GachaManager.draw(count);
  if (results && results.length > 0) {
    const topPlayer = results.reduce((max, p) => (p.ovr > max.ovr ? p : max), results[0]);
    walkoutController.start(topPlayer);
  }
}

if (draw1Btn) draw1Btn.addEventListener("click", () => handleDraw(1));
if (draw10Btn) draw10Btn.addEventListener("click", () => handleDraw(10));

if (btnNext) {
  btnNext.addEventListener("click", () => {
    if (summaryScreen) summaryScreen.style.display = "none";
  });
}

if (cheatBtn) {
  cheatBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อน!");
    const userRef = ref(db, `users/${currentUser.uid}`);
    await runTransaction(userRef, (currentData) => {
      if (currentData) {
        currentData.vouchers = (currentData.vouchers || 0) + 10;
      }
      return currentData;
    });
  });
}

function initDummyData() {
  globalPlayerDatabase = [
    {
      name: "Vincent Kompany",
      firstName: "VINCENT",
      lastName: "KOMPANY",
      ovr: 122,
      position: "CB",
      isFeatured: true,
      rarity: "PRIME",
      height: 190,
      weight: 85,
      stamina: 5,
      skillMoves: 3,
      cardFrame: "assets/images/frames/frame_pantheon_prime_featured.png",
      cardImg: "assets/images/players/kompany.png",
      stats: { pac: 110, sho: 75, pas: 90, dri: 92, def: 125, phy: 122 }
    }
  ];
  UIController.renderFeaturedPlayers(globalPlayerDatabase);
}

soundManager.init();
initDummyData();
