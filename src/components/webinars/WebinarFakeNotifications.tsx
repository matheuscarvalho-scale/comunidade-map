import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const FIRST_NAMES = [
  "João", "Maria", "Pedro", "Ana", "Lucas", "Juliana", "Carlos", "Fernanda",
  "Bruno", "Camila", "Rafael", "Larissa", "Gustavo", "Amanda", "Diego",
  "Beatriz", "Thiago", "Mariana", "André", "Patrícia", "Felipe", "Isabela",
  "Rodrigo", "Letícia", "Vinícius", "Gabriela", "Matheus", "Natália",
];

const CITIES = [
  "SP", "RJ", "MG", "RS", "PR", "BA", "SC", "CE", "PE", "GO",
  "DF", "PA", "MA", "ES", "AM", "PB", "RN", "AL", "PI", "MT",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function WebinarFakeNotifications() {
  const [notification, setNotification] = useState<{ name: string; city: string; id: number } | null>(null);

  const showNotification = useCallback(() => {
    const name = randomItem(FIRST_NAMES);
    const city = randomItem(CITIES);
    setNotification({ name, city, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    // First one after 10-20s
    const firstTimeout = setTimeout(() => {
      showNotification();
    }, Math.random() * 10000 + 10000);

    // Recurring every 45-90s
    const interval = setInterval(() => {
      showNotification();
    }, Math.random() * 45000 + 45000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [showNotification]);

  return (
    <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 40, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border shadow-lg pointer-events-auto max-w-[280px]"
          >
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">{notification.name}</span> de{" "}
              <span className="font-semibold">{notification.city}</span> acabou de se inscrever
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
