import React from "react";

interface ChartTabProps {
  selected: "optionOne" | "optionTwo" | "optionThree";
  setSelected: (option: "optionOne" | "optionTwo" | "optionThree") => void;
}

const ChartTab: React.FC<ChartTabProps> = ({ selected, setSelected }) => {
  const getButtonClass = (option: "optionOne" | "optionTwo" | "optionThree") =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => setSelected("optionOne")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionOne")}`}
      >
        Monthly
      </button>
      <button
        onClick={() => setSelected("optionTwo")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionTwo")}`}
      >
        Weekly
      </button>
      <button
        onClick={() => setSelected("optionThree")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionThree")}`}
      >
        Daily
      </button>
    </div>
  );
};

export default ChartTab;