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
  const [isOpen, setIsOpen] = useState(true); // Start as open
  const [showCalloutModal, setShowCalloutModal] = useState(false);
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
      color: "bg-red-300",
      textColor: "text-gray-900",
    },
    {
      label: "Question",
      icon: HelpCircle,
      color: "bg-blue-300",
      textColor: "text-gray-900",
    },
    {
      label: "Important",
      icon: AlertCircle,
      color: "bg-orange-300",
      textColor: "text-gray-900",
    },
    {
      label: "Definition",
      icon: BookOpen,
      color: "bg-green-300",
      textColor: "text-gray-900",
    },
    {
      label: "Information",
      icon: Info,
      color: "bg-purple-300",
      textColor: "text-gray-900",
    },
    {
      label: "Caution",
      icon: AlertOctagon,
      color: "bg-amber-300",
      textColor: "text-gray-900",
    },
    {
      label: "Default",
      icon: Circle,
      color: "bg-sky-50",
      textColor: "text-gray-700",
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the modal
      const modalElement = document.querySelector("[data-callout-modal]");
      if (modalElement && modalElement.contains(event.target as Node)) {
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowCalloutModal(false);
      }
    };

    if (isOpen || showCalloutModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, showCalloutModal]);

  const handleMainButtonClick = () => {
    setIsOpen(!isOpen);
    setShowCalloutModal(false);
  };

  const handleCalloutBlockClick = () => {
    setShowCalloutModal(true);
  };

  const handleCalloutSelect = (calloutLabel: string) => {
    // First call the callback to add the block
    onAddBlock("Callout Block", calloutLabel);
    // Then close everything
    setShowCalloutModal(false);
    setIsOpen(false);
  };

  const handleBackFromCallout = () => {
    setShowCalloutModal(false);
    // Keep isOpen true so tools stay visible
  };

  return (
    <>
      <div
        className="fixed top-1/2 right-8 z-40 -translate-y-1/2"
        ref={containerRef}
      >
        <div
          className={`flex flex-col items-center justify-center gap-2 transition-all duration-300`}
        >
          {/* Main Button - at the top, distinct styling */}
          <div className="group relative z-10">
            <button
              onClick={handleMainButtonClick}
              className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
                isOpen
                  ? "bg-gray-600 ring-2 ring-gray-400 hover:bg-gray-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
              aria-label={isOpen ? "Close" : "Add a block"}
            >
              <div className="relative h-6 w-6">
                <Plus
                  className={`absolute inset-0 transition-all duration-300 ${
                    !isOpen
                      ? "scale-100 rotate-0 opacity-100"
                      : "scale-0 rotate-45 opacity-0"
                  }`}
                  size={24}
                />
                <X
                  className={`absolute inset-0 transition-all duration-300 ${
                    isOpen
                      ? "scale-100 rotate-0 opacity-100"
                      : "scale-0 rotate-45 opacity-0"
                  }`}
                  size={24}
                />
              </div>
            </button>
            <div className="pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 rounded bg-gray-900 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
              {isOpen ? "Close" : "Add Block"}
            </div>
          </div>

          {/* Tool buttons - appear below the main button */}
          {isOpen &&
            blockOptions.map((option, index) => {
              const Icon = option.icon;

              return (
                <div
                  key={option.label}
                  className={`transition-all duration-300 ${
                    isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                  style={{
                    transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                  }}
                >
                  <div className="group relative">
                    <button
                      onClick={() => {
                        if (option.hasSubmenu) {
                          handleCalloutBlockClick();
                        } else {
                          onAddBlock(option.label);
                          setIsOpen(false);
                        }
                      }}
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ${option.color}`}
                      aria-label={option.label}
                    >
                      <Icon size={20} />
                    </button>
                    <div className="pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 rounded bg-gray-900 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {option.label}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Callout Modal */}
      {showCalloutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            data-callout-modal
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Select Callout Type
            </h2>
            <div className="space-y-2">
              {calloutTypes.map((callout) => {
                const Icon = callout.icon;
                return (
                  <button
                    key={callout.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCalloutSelect(callout.label);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${callout.color} ${callout.textColor}`}
                    aria-label={callout.label}
                  >
                    <Icon size={24} className="flex-shrink-0" />
                    <span className="text-lg font-medium">{callout.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleBackFromCallout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-900 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>
      )}
    </>
  );
}
