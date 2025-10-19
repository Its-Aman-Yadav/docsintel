import React from "react";

interface Source {
  text: string;
  fileName?: string;
}

interface SourcesProps {
  sources: Source[];
}

export const Sources: React.FC<SourcesProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  console.log("🧩 Rendered Sources:", sources); // 🔍 Debug

  return (
    <div className="w-full p-4 overflow-y-auto border-t border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
        Sources
      </h3>

      <div className="space-y-4">
        {sources.map((source, index) => (
          <div
            key={index}
            className="p-4 border border-blue-300 bg-blue-50 dark:bg-blue-900 dark:border-blue-700 rounded-lg shadow-sm"
          >
            {/* ✅ File name or fallback */}
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
              📄 {source.fileName ?? `Unnamed Source #${index + 1}`}
            </p>

            {/* ✅ Text chunk */}
            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
              {source.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
