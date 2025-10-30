import { useState } from 'react';
import { Plus, X, Type, ChevronDown, AlertTriangle, HelpCircle, AlertCircle, BookOpen, Info, AlertOctagon, Circle, Video, ListChecks, FileText, CheckCircle2 } from 'lucide-react';

interface AddLessonBlockProps {
  onAddBlock: (blockType: string, calloutType?: string) => void;
}

export default function AddLessonBlock({ onAddBlock }: AddLessonBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalloutOptions, setShowCalloutOptions] = useState(false);

  const blockOptions = [
    { label: 'Text', icon: Type, color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Expandable', icon: ChevronDown, color: 'bg-purple-500 hover:bg-purple-600' },
    { label: 'Callout Block', icon: Info, color: 'bg-orange-500 hover:bg-orange-600', hasSubmenu: true },
    { label: 'Video', icon: Video, color: 'bg-red-500 hover:bg-red-600' },
    { label: 'Multiple Choice Quiz', icon: ListChecks, color: 'bg-green-500 hover:bg-green-600' },
    { label: 'Open Ended Quiz', icon: FileText, color: 'bg-cyan-500 hover:bg-cyan-600' },
    { label: 'True/False Quiz', icon: CheckCircle2, color: 'bg-indigo-500 hover:bg-indigo-600' },
  ];

  const calloutTypes = [
    { label: 'Warning', icon: AlertTriangle, color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'Question', icon: HelpCircle, color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Important', icon: AlertCircle, color: 'bg-red-500 hover:bg-red-600' },
    { label: 'Definition', icon: BookOpen, color: 'bg-purple-500 hover:bg-purple-600' },
    { label: 'Information', icon: Info, color: 'bg-cyan-500 hover:bg-cyan-600' },
    { label: 'Caution', icon: AlertOctagon, color: 'bg-red-600 hover:bg-red-700' },
    { label: 'Default', icon: Circle, color: 'bg-gray-500 hover:bg-gray-600' },
  ];

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <div className="group relative">
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) setShowCalloutOptions(false);
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl"
          >
            <div className="relative h-6 w-6">
              <Plus className={`absolute inset-0 transition-all duration-300 ${isOpen ? 'rotate-45 opacity-0 scale-0' : 'rotate-0 opacity-100 scale-100'}`} size={24} />
              <X className={`absolute inset-0 transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100 scale-100' : 'rotate-45 opacity-0 scale-0'}`} size={24} />
            </div>
          </button>
          <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded bg-gray-900 px-3 py-1 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
            {isOpen ? 'Close' : 'Add a block'}
          </div>
        </div>

        {blockOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <div key={option.label} className={`absolute right-0 transition-all duration-300 ${isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`} style={{ bottom: `${(blockOptions.length - index) * 64}px`, transitionDelay: isOpen ? `${index * 50}ms` : '0ms' }}>
              <div className="group/option relative">
                <button onClick={() => option.hasSubmenu ? setShowCalloutOptions(!showCalloutOptions) : onAddBlock(option.label)} className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ${option.color}`}>
                  <Icon size={20} />
                </button>
                <div className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-3 py-1 text-sm text-white opacity-0 transition-opacity group-hover/option:opacity-100">
                  {option.label}
                </div>
              </div>
            </div>
          );
        })}

        {calloutTypes.map((callout, index) => {
          const Icon = callout.icon;
          return (
            <div key={callout.label} className={`absolute transition-all duration-300 ${isOpen && showCalloutOptions ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'}`} style={{ bottom: `${(blockOptions.length - 2) * 64 + (calloutTypes.length - index) * 52}px`, right: '68px', transitionDelay: (isOpen && showCalloutOptions) ? `${index * 40}ms` : '0ms' }}>
              <div className="group/callout relative">
                <button onClick={() => onAddBlock('Callout Block', callout.label)} className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ${callout.color}`}>
                  <Icon size={18} />
                </button>
                <div className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-3 py-1 text-sm text-white opacity-0 transition-opacity group-hover/callout:opacity-100">
                  {callout.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto max-w-3xl p-10">
        <h1 className="mb-6 text-4xl font-bold text-gray-900">Lesson Editor Demo</h1>
        <p className="mb-6 text-gray-600">Click the floating button in the bottom-right corner to add blocks!</p>
        <div className="mb-6 rounded-lg bg-gray-100 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">How to use:</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start"><span className="mr-2">•</span><span>Click the <strong>+ button</strong> to open the menu</span></li>
            <li className="flex items-start"><span className="mr-2">•</span><span>Hover over any option to see its label</span></li>
            <li className="flex items-start"><span className="mr-2">•</span><span>Click <strong>Callout Block</strong> to expand callout type options</span></li>
            <li className="flex items-start"><span className="mr-2">•</span><span>Click any block type to "create" it (currently just logs to console)</span></li>
          </ul>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">Sample lesson block would appear here</div>
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">Another sample lesson block</div>
        </div>
        <div className="mt-16 h-96"></div>
        <p className="text-center text-sm text-gray-400">Scroll to see the floating button in action...</p>
        <div className="h-96"></div>
      </div>
    </>
  );
}