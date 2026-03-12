import React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";
import { TravelItineraryItem } from "../api/chat/itinerary-store"; // Adjust path as needed

interface ItineraryDisplayProps {
  groupedItems: Record<string, TravelItineraryItem[]>;
}

// Container variants for staggering days
const dayContainerVariants = {
  hidden: { opacity: 0 },
  visible: (i = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.1 * i, delayChildren: 0.1 }, // Stagger days
  }),
  exit: (i = 1) => ({
    opacity: 0,
    transition: { staggerChildren: 0.05 * i, staggerDirection: -1 },
  }),
};

// Variants for individual day cards
const dayCardVariants = {
  hidden: { x: 50, opacity: 0 }, // Fly in from right
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "tween", duration: 0.3 },
  },
};

// Variants for individual itinerary items within a day
const itemVariants = {
  hidden: { x: 30, opacity: 0 }, // Fly in from right
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "tween", duration: 0.2 }, // Faster transition for items
  },
};

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({
  groupedItems,
}) => {
  // Sort dates (with "Unscheduled" at the end)
  const sortedDates = Object.keys(groupedItems).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Create a new array with day numbers for each date (excluding "Unscheduled")
  const datesWithDayNumbers = sortedDates.map((date, index) => {
    return {
      date,
      dayNumber: date !== "Unscheduled" ? index + 1 : null,
    };
  });

  return (
    <motion.div
      variants={dayContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit" // Add exit animation
      className="scrollbar-thin pointer-events-auto col-span-1 h-full w-[32rem] space-y-4 overflow-y-auto pb-4 md:w-[32rem]"
    >
      {datesWithDayNumbers.map(({ date, dayNumber }) => (
        <motion.div
          key={date}
          variants={dayCardVariants}
          initial="hidden"
          animate="visible"
          // Stagger children (items) within this day card
          transition={{ staggerChildren: 0.05 }}
        >
          <div className="mb-2 min-w-full rounded-2xl bg-white/60 p-4 shadow-md backdrop-blur-md">
            <div className="mb-3 flex items-center">
              <Calendar size={16} className="mr-2 text-gray-700" />
              <span className="text-base font-semibold text-gray-800">
                {dayNumber ? `Day ${dayNumber}` : ""}
                <span className="ml-2 font-normal text-gray-700">{date}</span>
              </span>
            </div>
            <motion.div className="space-y-3">
              {groupedItems[date]?.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  className="rounded-md border border-gray-200/50 bg-white/80 p-3 shadow-sm"
                >
                  <h4 className="text-sm font-semibold text-gray-800">
                    {item.name}
                  </h4>
                  {item.startTime && (
                    <div className="mt-1 flex items-center text-xs text-gray-600">
                      <Clock size={12} className="mr-1 text-gray-500" />
                      <span>
                        {item.endTime
                          ? `${item.startTime} - ${item.endTime}`
                          : item.startTime}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ItineraryDisplay;
