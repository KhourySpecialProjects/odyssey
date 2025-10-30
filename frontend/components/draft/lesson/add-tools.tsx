import { useState, useRef, useEffect } from "react";
import {
  Plus,
  X,
  Type,
  ChevronDown,
  AlertTriangle,
  HelpCircle,
  AlertCircle,
  BookOpen,
  Info,
  AlertOctagon,
  Circle,
  Video,
  ListChecks,
  FileText,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

interface AddLessonBlockProps {
  onAddBlock: (blockType: string, calloutType?: string) => void;
}

export default function AddLessonBlock({ onAddBlock }: AddLessonBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalloutOptions, setShowCalloutOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const blockOptions = [
    { label: "Text", icon: Type, color: "bg-blue-500 hover:bg-blue-600" },
    {
      label: "Expandable",
      icon: ChevronDown,
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      label: "Callout Block",
      icon: Info,
      color: "bg-orange-500 hover:bg-orange-600",
      hasSubmenu: true,
    },
    { label: "Video", icon: Video, color: "bg-red-500 hover:bg-red-600" },
    {
      label: "Multiple Choice Quiz",
      icon: ListChecks,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      label: "Open Ended Quiz",
      icon: FileText,
      color: "bg-cyan-500 hover:bg-cyan-600",
    },
    {
      label: "True/False Quiz",
      icon: CheckCircle2,
      color: "bg-indigo-500 hover:bg-indigo-600",
    },
  ];

  const calloutTypes = [
    {
      label: "Warning",
      icon: AlertTriangle,
      color: "bg-red-300 hover:bg-red-400",
    },
    {
      label: "Question",
      icon: HelpCircle,
      color: "bg-blue-300 hover:bg-blue-400",
    },
    {
      label: "Important",
      icon: AlertCircle,
      color: "bg-orange-300 hover:bg-orange-400",
    },
    {
      label: "Definition",
      icon: BookOpen,
      color: "bg-green-300 hover:bg-green-400",
    },
    {
      label: "Information",
      icon: Info,
      color: "bg-purple-300 hover:bg-purple-400",
    },
    {
      label: "Caution",
      icon: AlertOctagon,
      color: "bg-amber-300 hover:bg-amber-400",
    },
    { label: "Default", icon: Circle, color: "bg-sky-50 hover:bg-sky-100" },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowCalloutOptions(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMainButtonClick = () => {
    if (isOpen && showCalloutOptions) {
      setShowCalloutOptions(false);
    } else {
      setIsOpen(!isOpen);
      setShowCalloutOptions(false);
    }
  };

  return (
    <>
      <div className="fixed right-8 bottom-8 z-50" ref={containerRef}>
        <div className="group relative">
          <button
            onClick={handleMainButtonClick}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl"
            aria-label={
              isOpen ? (showCalloutOptions ? "Back" : "Close") : "Add a block"
            }
          >
            <div className="relative h-6 w-6">
              {/* Plus icon - show when closed */}
              <Plus
                className={`absolute inset-0 transition-all duration-300 ${
                  !isOpen
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-0 rotate-45 opacity-0"
                }`}
                size={24}
              />
              {/* Back arrow - show when in callout submenu */}
              <ArrowLeft
                className={`absolute inset-0 transition-all duration-300 ${
                  isOpen && showCalloutOptions
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-0 rotate-45 opacity-0"
                }`}
                size={24}
              />
              {/* X icon - show when in main menu */}
              <X
                className={`absolute inset-0 transition-all duration-300 ${
                  isOpen && !showCalloutOptions
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-0 rotate-45 opacity-0"
                }`}
                size={24}
              />
            </div>
          </button>
          <div className="pointer-events-none absolute right-0 bottom-full mb-2 rounded bg-gray-900 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
            {isOpen ? (showCalloutOptions ? "Back" : "Close") : "Add a block"}
          </div>
        </div>

        {/* Main Block Options */}
        {!showCalloutOptions &&
          blockOptions.map((option, index) => {
            const Icon = option.icon;
            const bottomOffset = (blockOptions.length - index) * 64;

            return (
              <div
                key={option.label}
                className={`absolute right-0 transition-all duration-300 ${
                  isOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-4 opacity-0"
                }`}
                style={{
                  bottom: `${bottomOffset}px`,
                  transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                }}
              >
                <div className="group/option relative">
                  <button
                    onClick={() => {
                      if (option.hasSubmenu) {
                        setShowCalloutOptions(true);
                      } else {
                        onAddBlock(option.label);
                        setIsOpen(false);
                      }
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ${option.color}`}
                  >
                    <Icon size={20} />
                  </button>
                  <div className="pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 rounded bg-gray-900 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity group-hover/option:opacity-100">
                    {option.label}
                  </div>
                </div>
              </div>
            );
          })}

        {/* Callout Type Options - Replace main menu */}
        {showCalloutOptions &&
          calloutTypes.map((callout, index) => {
            const Icon = callout.icon;
            const bottomOffset = (calloutTypes.length - index) * 64;

            return (
              <div
                key={callout.label}
                className={`absolute right-0 transition-all duration-300 ${
                  isOpen && showCalloutOptions
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-4 opacity-0"
                }`}
                style={{
                  bottom: `${bottomOffset}px`,
                  transitionDelay:
                    isOpen && showCalloutOptions ? `${index * 50}ms` : "0ms",
                }}
              >
                <div className="group/callout relative">
                  <button
                    onClick={() => {
                      onAddBlock("Callout Block", callout.label);
                      setIsOpen(false);
                      setShowCalloutOptions(false);
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${callout.color} ${callout.label === "Default" ? "text-gray-700" : "text-gray-800"}`}
                  >
                    <Icon size={20} />
                  </button>
                  <div className="pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 rounded bg-gray-900 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity group-hover/callout:opacity-100">
                    {callout.label}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
