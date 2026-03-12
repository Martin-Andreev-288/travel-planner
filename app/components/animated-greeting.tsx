"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function AnimatedGreeting() {
  const [animatedGreeting, setAnimatedGreeting] = useState("");

  // Effect for the initial greeting animation
  useEffect(() => {
    const text1 = "Hello!";
    const text2 = "Where would you like to travel?";
    let currentText = "";
    let index = 0;
    let phase: "typing1" | "erasing1" | "typing2" = "typing1";
    let timeoutId: NodeJS.Timeout;

    const animate = () => {
      if (phase === "typing1") {
        if (index < text1.length) {
          currentText += text1[index];
          setAnimatedGreeting(currentText);
          index++;
          timeoutId = setTimeout(animate, 100); // Typing speed
        } else {
          // Pause after typing "Hello!"
          timeoutId = setTimeout(() => {
            phase = "erasing1";
            index = text1.length; // Reset index for erasing
            animate();
          }, 500); // Pause duration
        }
      } else if (phase === "erasing1") {
        if (index > 0) {
          currentText = currentText.slice(0, -1);
          setAnimatedGreeting(currentText);
          index--;
          timeoutId = setTimeout(animate, 60); // Erasing speed
        } else {
          // Pause after erasing
          timeoutId = setTimeout(() => {
            phase = "typing2";
            index = 0; // Reset index for typing text2
            animate();
          }, 500); // Pause duration
        }
      } else if (phase === "typing2") {
        if (index < text2.length) {
          currentText += text2[index];
          setAnimatedGreeting(currentText);
          index++;
          timeoutId = setTimeout(animate, 50); // Typing speed
        }
      }
    };

    animate(); // Start the animation

    // Cleanup function to clear timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="mb-4 min-h-[2em] text-xl font-semibold text-gray-800">
      {/* Display the animated greeting state */}
      <span>{animatedGreeting}</span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.5,
          ease: "linear",
        }}
        className="inline-block h-[1.2em] w-[2px] translate-y-1 bg-gray-800"
        aria-hidden="true"
      />
    </div>
  );
}
