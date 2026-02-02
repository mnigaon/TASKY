// src/context/TimerContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, setDoc, getDoc, addDoc, deleteDoc, query, where, onSnapshot, limit } from "firebase/firestore";
import { useAuth } from "../firebase/AuthContext";
import { PLANT_TYPES } from "../components/timer/PlantData";

const TimerContext = createContext();

export const TimerProvider = ({ children }) => {
  const { currentUser } = useAuth();

  /* =========================
     🔄 상태 초기화 (LocalStorage: UI Settings only)
  ========================= */
  const [mode, setMode] = useState(() => localStorage.getItem("timer_mode") || "pomodoro");

  // ⚙️ Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("tasky_timer_settings");
    return saved ? JSON.parse(saved) : {
      bgColor: "#fdfdfd",
      timerColor: "#648cff",
      ambientSound: "none",
      alarmSound: "bell"
    };
  });

  useEffect(() => {
    localStorage.setItem("tasky_timer_settings", JSON.stringify(settings));
  }, [settings]);

  // Custom Settings
  const [customPomodoro, setCustomPomodoro] = useState(() => Number(localStorage.getItem("timer_customPomodoro")) || 25);
  const [customBreak, setCustomBreak] = useState(() => Number(localStorage.getItem("timer_customBreak")) || 5);
  const [totalRounds, setTotalRounds] = useState(() => Number(localStorage.getItem("timer_totalRounds")) || 4);
  const [currentRound, setCurrentRound] = useState(() => Number(localStorage.getItem("timer_currentRound")) || 1);

  const [secondsLeft, setSecondsLeft] = useState(() => {
    const saved = localStorage.getItem("timer_secondsLeft");
    if (saved) return Number(saved);
    const initialMode = localStorage.getItem("timer_mode") || "pomodoro";
    return initialMode === "pomodoro" ? customPomodoro * 60 : customBreak * 60;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [focusTask, setFocusTask] = useState(() => localStorage.getItem("timer_focusTask") || "");

  /* =========================
     🌿 Focus Garden State (Firestore)
  ========================= */
  const [water, setWater] = useState(0);
  const [plantStage, setPlantStage] = useState(0);
  const [plantType, setPlantType] = useState("tulip");
  const [inventory, setInventory] = useState([]);
  const [gardenGrid, setGardenGrid] = useState({});

  // 🔊 Audio Refs
  const ambientRef = useRef(new Audio());
  const alarmRef = useRef(new Audio());
  const tickRef = useRef(0); // For water earning logic

  /* =========================
     🔥 Garden Sync Logic (Firestore)
  ========================= */
  useEffect(() => {
    if (!currentUser) return;

    // Listen to user's garden data
    const gardenRef = doc(db, "users", currentUser.uid, "garden", "data");
    const unsub = onSnapshot(gardenRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setWater(data.water || 0);
        setPlantStage(data.plantStage || 0);
        setPlantType(data.plantType || "tulip");
        setInventory(data.inventory || []);
        setGardenGrid(data.gardenGrid || {});
      } else {
        // Initialize if not exists
        setDoc(gardenRef, {
          water: 0,
          plantStage: 0,
          plantType: "tulip",
          inventory: [],
          gardenGrid: {}
        }, { merge: true });
      }
    });

    return () => unsub();
  }, [currentUser]);

  // Save Garden Helper
  const saveGarden = async (updates) => {
    if (!currentUser) return;
    try {
      const gardenRef = doc(db, "users", currentUser.uid, "garden", "data");
      await setDoc(gardenRef, updates, { merge: true });
    } catch (e) {
      console.error("Garden save failed:", e);
    }
  };

  /* =========================
     💾 Timer 상태 저장
  ========================= */
  useEffect(() => {
    localStorage.setItem("timer_mode", mode);
    localStorage.setItem("timer_secondsLeft", secondsLeft);
    localStorage.setItem("timer_focusTask", focusTask);
    localStorage.setItem("timer_customPomodoro", customPomodoro);
    localStorage.setItem("timer_customBreak", customBreak);
    localStorage.setItem("timer_totalRounds", totalRounds);
    localStorage.setItem("timer_currentRound", currentRound);
  }, [mode, secondsLeft, focusTask, customPomodoro, customBreak, totalRounds, currentRound]);


  /* =========================
     🔊 Audio Logic
  ========================= */
  // 1. Ambient Sound
  useEffect(() => {
    if (isRunning && settings.ambientSound && settings.ambientSound !== 'none') {
      ambientRef.current.src = `/${settings.ambientSound}.mp3`;
      ambientRef.current.loop = true;
      ambientRef.current.play().catch(e => console.log("Audio play failed (interaction needed):", e));
    } else {
      ambientRef.current.pause();
      ambientRef.current.currentTime = 0;
    }
  }, [isRunning, settings.ambientSound]);

  // 2. Alarm Sound (Triggered manually in effect)
  const playAlarm = () => {
    if (settings.alarmSound && settings.alarmSound !== 'none') {
      alarmRef.current.src = `/${settings.alarmSound}.mp3`;
      alarmRef.current.loop = false;
      alarmRef.current.play().catch(e => console.log("Alarm play failed:", e));

      // Stop automatically after 5 seconds
      setTimeout(() => {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }, 5000);
    }
  };


  /* =========================
     ⏳ Timer Interval
  ========================= */
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        // 💧 Water Logic: Earn 1 Drop per minute (every 60 ticks)
        if (mode === "pomodoro" && prev % 60 === 0 && prev !== (customPomodoro * 60)) {
          // Firestore update for water
          if (currentUser) {
            const gardenRef = doc(db, "users", currentUser.uid, "garden", "data");
            // Use a transaction or get/set to increment safely? 
            // Simple set for now since we have local state sync generally, 
            // but better to rely on previous 'water' state + 1
            // However, we are inside a closure here.
            // Correct approach: trigger a separate effect or function?
            // For simplicity, we call setWater which triggers 'saveGarden' if we wire it? 
            // No, saveGarden writes to DB. 
            // Let's write directly using current state ref or just functional update.
          }
        }

        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });

      // 💧 Water Trigger Check (Independent of state closure issues)
      tickRef.current += 1;
      if (mode === "pomodoro" && tickRef.current >= 60) {
        tickRef.current = 0;
        // Earn water!
        if (currentUser) {
          // We need the latest water value. 
          // Since we are inside useEffect, we shouldn't depend on 'water' state directly to avoid re-subscription loop.
          // We will just read the document increment or use Firestore Increment.
          // BUT, to keep it simple and synced with our local listener:
          // We'll trust the listener and just do an atomic increment in Firestore.
          // Actually, importing 'increment' is best.
          // Let's just do a specific update function.
          incrementWater();
        }
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, mode, currentUser]); // Removed 'water' dependency to avoid reset

  const incrementWater = async () => {
    if (!currentUser) return;
    // We can read the current water from state? 
    // Actually state might be stale inside setInterval closure if dependencies aren't updated.
    // But we can just use Firestore update.
    const gardenRef = doc(db, "users", currentUser.uid, "garden", "data");
    // Use setDoc with merge to avoid overwriting everything if not loaded
    // Ideally use updateDoc + increment, but let's read-modify-write via listener or simple state.
    // Simplest: We have `water` state in context scope. 
    // If we include `water` in dependency, interval resets every second. Bad.
    // So we use functional update on Firestore? 
    // Let's use `getDoc` to be safe or just functional state?
    // Actually, we can just use `water` from outer scope if we were careful.
    // Pivot: Use functional setWater and a useEffect to sync to DB?
  };

  // Real implementation of Water Increment inside effect with correct dependency management or ref
  // Let's separate the Water Logic to a different Effect that depends on 'secondsLeft'
  useEffect(() => {
    if (!isRunning || mode !== 'pomodoro' || !currentUser) return;

    // If a minute passed (checking secondsLeft change)
    // Initial: 1500. Next: 1499. 
    // We want: 1440 (1 min passed).
    const elapsed = (customPomodoro * 60) - secondsLeft;
    if (elapsed > 0 && elapsed % 60 === 0) {
      // 1 minute passed!
      // Atomic increment or just save water + 1
      saveGarden({ water: water + 1 });
    }
  }, [secondsLeft]); // This runs every second, but only triggers save every 60s


  // =========================
  // Timer End Logic
  // =========================
  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      playAlarm(); // 🔊 Play Alarm

      if (mode === "pomodoro") {
        if (currentUser) {
          const today = new Date().toISOString().slice(0, 10);
          const newTime = (Number(localStorage.getItem(`focusTime_${today}`)) || 0) + (customPomodoro * 60);
          localStorage.setItem(`focusTime_${today}`, newTime);

          setTimeout(async () => {
            await setDoc(doc(db, "focusTimes", `${currentUser.uid}_${today}`), {
              userId: currentUser.uid,
              date: today,
              seconds: newTime
            }, { merge: true });
          }, 0);
        }
        setMode("break");
        setSecondsLeft(customBreak * 60);
      } else {
        if (currentRound < totalRounds) {
          setMode("pomodoro");
          setSecondsLeft(customPomodoro * 60);
          setCurrentRound(prev => prev + 1);
        } else {
          setIsRunning(false);
        }
      }
    }
  }, [secondsLeft, isRunning]);


  /* =========================
     🌿 Garden Actions (Firestore)
  ========================= */
  const waterPlant = () => {
    if (water >= 10 && plantStage < 3) {
      // Local Optimistic Update
      const nextWater = water - 10;
      const nextStage = plantStage + 1;
      setWater(nextWater);
      setPlantStage(nextStage);

      saveGarden({ water: nextWater, plantStage: nextStage });
      return true;
    }
    return false;
  };

  const harvestPlant = () => {
    if (plantStage === 3) {
      const newPlant = { type: plantType, date: new Date().toISOString() };
      const nextInventory = [newPlant, ...inventory];

      // Calculate Next Plant
      const rarities = ["sprout", "leaf", "flower", "ancient"];
      const weights = [50, 30, 15, 5];
      const randomValue = Math.random() * 100;
      let selectedRarity = "sprout";
      let cumulativeWeight = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (randomValue <= cumulativeWeight) {
          selectedRarity = rarities[i];
          break;
        }
      }
      const matchingPlants = Object.keys(PLANT_TYPES).filter(
        key => PLANT_TYPES[key].rarity.toLowerCase() === selectedRarity
      );
      const finalMatch = matchingPlants.length > 0 ? matchingPlants : Object.keys(PLANT_TYPES);
      const nextPlantType = finalMatch[Math.floor(Math.random() * finalMatch.length)];

      const nextPlantStage = 0;

      // Update State
      setInventory(nextInventory);
      setPlantStage(nextPlantStage);
      setPlantType(nextPlantType);

      saveGarden({
        inventory: nextInventory,
        plantStage: nextPlantStage,
        plantType: nextPlantType
      });
      return true;
    }
    return false;
  };

  const placeInGardenByIndex = (inventoryIndex, x, y) => {
    const key = `${x},${y}`;
    if (gardenGrid[key]) return false;

    const plantToPlace = inventory[inventoryIndex];
    if (!plantToPlace) return false;

    const nextGardenGrid = { ...gardenGrid, [key]: plantToPlace };
    const nextInventory = inventory.filter((_, idx) => idx !== inventoryIndex);

    setGardenGrid(nextGardenGrid);
    setInventory(nextInventory);

    saveGarden({ gardenGrid: nextGardenGrid, inventory: nextInventory });
    return true;
  };

  const removeFromGarden = (x, y) => {
    const key = `${x},${y}`;
    const plant = gardenGrid[key];
    if (!plant) return;

    const nextInventory = [plant, ...inventory];
    const nextGardenGrid = { ...gardenGrid };
    delete nextGardenGrid[key];

    setInventory(nextInventory);
    setGardenGrid(nextGardenGrid);

    saveGarden({ gardenGrid: nextGardenGrid, inventory: nextInventory });
  };


  // ... (Rest of Methods unchanged: changeMode, setTimerConfig, start, pause, reset, history) ...
  // Re-implementing simplified versions for clarity in replacement

  const changeMode = (newMode) => {
    setMode(newMode);
    setSecondsLeft(newMode === "pomodoro" ? customPomodoro * 60 : customBreak * 60);
    setIsRunning(false);
  };

  const setTimerConfig = (configs) => {
    if (configs.pomodoro !== undefined) setCustomPomodoro(configs.pomodoro);
    if (configs.break !== undefined) setCustomBreak(configs.break);
    if (configs.rounds !== undefined) setTotalRounds(configs.rounds);

    setMode("pomodoro");
    setSecondsLeft((configs.pomodoro || customPomodoro) * 60);
    setCurrentRound(1);
    setIsRunning(false);
  };

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setSecondsLeft(mode === "pomodoro" ? customPomodoro * 60 : customBreak * 60);
    setCurrentRound(1);
  };

  /* =========================
     📊 Stats & History (Firestore Sync)
  ========================= */
  const [userFocusStats, setUserFocusStats] = useState({
    totalSeconds: 0,
    daysAccessed: 0,
    streak: 0,
    dailyRecords: {} // { "YYYY-MM-DD": seconds }
  });

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "focusTimes"), where("userId", "==", currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const records = {};
      let total = 0;
      let days = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        records[data.date] = data.seconds;
        total += data.seconds;
        days += 1;
      });

      // Robust Streak Logic
      let streakCount = 0;
      const now = new Date();
      let checkDate = new Date(now);

      // If today has data, start counting. If not, check yesterday. 
      // If yesterday also no data, streak is 0.
      const tStr = checkDate.toISOString().slice(0, 10);
      if (!records[tStr]) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const str = checkDate.toISOString().slice(0, 10);
        if (records[str]) {
          streakCount++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setUserFocusStats({
        totalSeconds: total,
        daysAccessed: days,
        streak: streakCount,
        dailyRecords: records
      });
    });

    return () => unsub();
  }, [currentUser]);

  // Helpers using Synced Data
  const getTodayFocusTime = () => {
    const today = new Date().toISOString().slice(0, 10);
    return userFocusStats.dailyRecords[today] || 0;
  };

  const getSummaryStats = () => {
    return {
      totalHours: (userFocusStats.totalSeconds / 3600).toFixed(1),
      daysAccessed: userFocusStats.daysAccessed,
      streak: userFocusStats.streak,
    };
  };

  const getAllFocusData = () => {
    const data = [];
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const seconds = userFocusStats.dailyRecords[dateStr] || 0;
      data.push({ date: dateStr, seconds });
    }
    return data;
  };

  // Stats/History functions (Keep usage of db as is)
  const getRankingAllTime = async () => { /* ... existing ... */
    // (Omitted for brevity in edit, but assumed kept or pasted if using full replace)
    // Since I am doing a full file replace, I MUST paste the logic back.
    try {
      const snap = await getDocs(collection(db, "focusTimes"));
      const map = {};
      snap.forEach(d => { const { userId, seconds } = d.data(); map[userId] = (map[userId] || 0) + seconds; });
      return Promise.all(Object.entries(map).map(async ([uid, sec]) => {
        const u = await getDoc(doc(db, "users", uid));
        return { userId: uid, displayName: u.exists() ? u.data().displayName : uid, seconds: sec };
      })).then(res => res.sort((a, b) => b.seconds - a.seconds));
    } catch (e) { return []; }
  };

  const getRankingThisWeek = async () => { /* ... existing ... */
    // (Simplified logic re-paste)
    try {
      const today = new Date(); const start = new Date(); start.setDate(today.getDate() - 6);
      const snap = await getDocs(collection(db, "focusTimes"));
      const map = {};
      snap.forEach(d => {
        const { date, seconds, userId } = d.data();
        if (new Date(date) >= start) map[userId] = (map[userId] || 0) + seconds;
      });
      return Promise.all(Object.entries(map).map(async ([uid, sec]) => {
        const u = await getDoc(doc(db, "users", uid));
        return { userId: uid, displayName: u.exists() ? u.data().displayName : uid, seconds: sec };
      })).then(res => res.sort((a, b) => b.seconds - a.seconds).slice(0, 100));
    } catch (e) { return []; }
  };

  const saveTaskHistory = async (taskName) => {
    if (!currentUser) return;
    try { await addDoc(collection(db, "focusTasks"), { userId: currentUser.uid, task: taskName || "Untitled", mode, duration: mode === "pomodoro" ? customPomodoro * 60 : customBreak * 60, completedAt: new Date().toISOString() }); } catch (e) { }
  };
  const deleteTaskHistory = async (id) => { if (!currentUser) return; try { await deleteDoc(doc(db, "focusTasks", id)); } catch (e) { } };
  const getFocusHistory = async () => {
    if (!currentUser) return [];
    try {
      const q = query(collection(db, "focusTasks"), where("userId", "==", currentUser.uid), limit(50));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return docs.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    } catch (e) { return []; }
  };


  return (
    <TimerContext.Provider
      value={{
        mode, secondLeft: secondsLeft, secondsLeft, isRunning, focusTask, setFocusTask,
        start, pause, reset, changeMode,
        // Garden
        water, plantStage, plantType, inventory, gardenGrid,
        waterPlant, harvestPlant, placeInGardenByIndex, removeFromGarden,
        // Config
        customPomodoro, customBreak, totalRounds, currentRound, setTimerConfig,
        // Settings
        settings, setSettings,
        // Stats
        getTodayFocusTime, getSummaryStats, getAllFocusData, getRankingThisWeek, getRankingAllTime,
        saveTaskHistory, deleteTaskHistory, getFocusHistory
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
