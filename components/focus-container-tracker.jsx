"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, CheckCircle2, Clock, X, Play, Pause, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import confetti from "canvas-confetti";

export default function FocusContainerTracker() {
  const [containers, setContainers] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [dbAvailable, setDbAvailable] = useState(false);
  const [firestore, setFirestore] = useState(null);

  const colors = ["border-indigo-400", "border-pink-400", "border-teal-400", "border-yellow-400", "border-purple-400"];

  const playSound = (fileUrl) => {
    const audio = new Audio(fileUrl);
    audio.volume = 0.25;
    audio.play();
  };

  const soundLinks = {
    click: "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg",
    success: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
  };

  const celebrate = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0 },
      colors: ['#6366F1', '#A78BFA', '#34D399'],
      disableForReducedMotion: true,
    });
  };

  const getDayKey = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toDateString();
  };

  useEffect(() => {
    const initFirestore = async () => {
      try {
        const { initializeApp } = await import("firebase/app");
        const { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } = await import("firebase/firestore");
        const firebaseConfig = {
          apiKey: "AIzaSyB86Z1d-VhpHmDKFFV0qzviISZYRNqiEUY",
          authDomain: "markup-2eecf.firebaseapp.com",
          projectId: "markup-2eecf",
          storageBucket: "markup-2eecf.firebasestorage.app",
          messagingSenderId: "281368243545",
          appId: "1:281368243545:web:3328e69b93924c5b44b048",
        };
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        setFirestore({ db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot });
        setDbAvailable(true);

        const unsub = onSnapshot(collection(db, "containers"), (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setContainers(data);
        });
        return () => unsub();
      } catch (e) {
        console.warn("⚠️ Firestore not available, using local storage fallback.", e);
        setDbAvailable(false);
        const localData = JSON.parse(localStorage.getItem("containers") || "[]");
        setContainers(localData);
      }
    };
    initFirestore();
  }, []);

  const saveLocal = (data) => {
    localStorage.setItem("containers", JSON.stringify(data));
    setContainers(data);
  };

  const addContainer = async () => {
    if (!newTitle.trim() || !newTime.trim()) return;
    playSound(soundLinks.click);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const day = getDayKey(0);
    const newContainer = { id: Date.now().toString(), title: newTitle, time: newTime, tasks: [], progress: 0, color, day };

    if (dbAvailable && firestore) {
      await firestore.addDoc(firestore.collection(firestore.db, "containers"), newContainer);
    } else {
      saveLocal([...containers, newContainer]);
    }
    setNewTitle("");
    setNewTime("");
  };

  const addTask = async (id, taskText) => {
    if (!taskText.trim()) return;
    playSound(soundLinks.click);
    const container = containers.find((c) => c.id === id);
    if (!container) return;
    
    const updatedTasks = [...(container.tasks || []), { text: taskText, done: false }];
    const progress = Math.round((updatedTasks.filter((t) => t.done).length / updatedTasks.length) * 100);
    const updatedContainer = { ...container, tasks: updatedTasks, progress };
    
    if (dbAvailable && firestore) {
      const containerRef = firestore.doc(firestore.db, "containers", id);
      await firestore.updateDoc(containerRef, { tasks: updatedTasks, progress });
    } else {
      const updatedContainers = containers.map((c) => c.id === id ? updatedContainer : c);
      saveLocal(updatedContainers);
    }
  };

  const toggleTask = async (containerId, index) => {
    const container = containers.find((c) => c.id === containerId);
    if (!container) return;
    
    const updatedTasks = container.tasks.map((t, i) => (i === index ? { ...t, done: !t.done } : t));
    const progress = Math.round((updatedTasks.filter((t) => t.done).length / updatedTasks.length) * 100);
    
    if (!container.tasks[index].done) {
      playSound(soundLinks.success);
      celebrate();
    }
    
    if (dbAvailable && firestore) {
      const containerRef = firestore.doc(firestore.db, "containers", containerId);
      await firestore.updateDoc(containerRef, { tasks: updatedTasks, progress });
    } else {
      const updatedContainers = containers.map((c) => 
        c.id === containerId ? { ...c, tasks: updatedTasks, progress } : c
      );
      saveLocal(updatedContainers);
    }
  };

  const deleteContainer = async (id) => {
    playSound(soundLinks.click);
    if (dbAvailable && firestore) {
      await firestore.deleteDoc(firestore.doc(firestore.db, "containers", id));
    } else {
      saveLocal(containers.filter((c) => c.id !== id));
    }
  };

  const deleteTask = async (containerId, taskIndex) => {
    playSound(soundLinks.click);
    const container = containers.find((c) => c.id === containerId);
    if (!container) return;
    
    const updatedTasks = container.tasks.filter((_, i) => i !== taskIndex);
    const progress = updatedTasks.length > 0 ? Math.round((updatedTasks.filter((t) => t.done).length / updatedTasks.length) * 100) : 0;
    
    if (dbAvailable && firestore) {
      const containerRef = firestore.doc(firestore.db, "containers", containerId);
      await firestore.updateDoc(containerRef, { tasks: updatedTasks, progress });
    } else {
      const updatedContainers = containers.map((c) => 
        c.id === containerId ? { ...c, tasks: updatedTasks, progress } : c
      );
      saveLocal(updatedContainers);
    }
  };

  useEffect(() => {
    let interval;
    if (timerRunning && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    } else if (secondsLeft === 0) {
      setTimerRunning(false);
      playSound(soundLinks.success);
      celebrate();
    }
    return () => clearInterval(interval);
  }, [timerRunning, secondsLeft]);

  const toggleTimer = () => {
    playSound(soundLinks.click);
    setTimerRunning(!timerRunning);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const columns = [
    { title: "Today", day: getDayKey(0) },
    { title: "Tomorrow", day: getDayKey(1) },
    { title: "Saturday", day: getDayKey(2) },
  ];

  const totalTasks = containers.reduce((acc, c) => acc + (c.tasks?.length || 0), 0);
  const totalDone = containers.reduce((acc, c) => acc + (c.tasks?.filter((t) => t.done).length || 0), 0);
  const dayProgress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8 relative">
      <h1 className="text-3xl font-semibold mb-4 tracking-tight text-gray-800">Focus Planner</h1>
      {!dbAvailable && <p className="text-xs text-gray-500 mb-2">⚠️ Offline mode (local storage)</p>}

      <div className="absolute top-6 right-10 flex items-center gap-2">
        <Timer className="h-5 w-5 text-gray-700" />
        <div className="text-gray-700 text-sm font-medium">
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </div>
        <Button size="sm" variant="outline" onClick={toggleTimer} className="border-gray-300 hover:bg-gray-100">
          {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>

      <div className="w-full max-w-6xl mb-10">
        <div className="w-full bg-gray-200 h-2 rounded-full">
          <motion.div
            className="bg-indigo-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${dayProgress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-1 text-right">{dayProgress}% of today&apos;s tasks</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <input
          className="border border-gray-300 rounded-xl px-4 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Container title..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <input
          type="time"
          className="border border-gray-300 rounded-xl px-4 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
        />
        <Button onClick={addContainer} className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl border-t border-gray-300 pt-6">
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-6">
            <h2 className="text-xl font-medium text-gray-700 mb-3 text-center border-b border-gray-300 pb-2">{col.title}</h2>
            {containers.filter((c) => c.day === col.day).map((container) => (
              <motion.div key={container.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group">
                <Card className={`rounded-2xl shadow-sm hover:shadow-md transition border-2 ${container.color} bg-white relative`}>
                  <button
                    onClick={() => deleteContainer(container.id)}
                    className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100 transition hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <CardContent className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">{container.title}</h2>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="h-4 w-4 mr-1" /> {container.time}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{container.progress}%</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <motion.div
                        className="bg-indigo-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${container.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    <div className="flex mb-3 gap-2">
                      <input
                        id={`task-input-${container.id}`}
                        placeholder="Add task..."
                        className="flex-1 border border-gray-300 rounded-xl px-3 py-1 focus:ring-2 focus:ring-indigo-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addTask(container.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>

                    <ul className="space-y-2">
                      {container.tasks?.map((t, i) => (
                        <li
                          key={i}
                          className={`flex items-center justify-between cursor-pointer transition ${t.done ? "line-through text-gray-400" : "text-gray-700"}`}
                        >
                          <div onClick={() => toggleTask(container.id, i)} className="flex items-center gap-2 flex-1">
                            <CheckCircle2 className={`h-4 w-4 ${t.done ? "text-indigo-500" : "text-gray-400"}`} />
                            {t.text}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(container.id, i);
                            }}
                            className="text-gray-400 hover:text-red-500 transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
