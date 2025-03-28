"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createBatchAuthorizedUsers } from "@/lib/actions";
import { useFormStatus } from "react-dom";

export function BatchAddUser() {
  const [emails, setEmails] = useState("");
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const removeFile = (index: number) => {
    setCsvFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let emailList: string[] = [];

    if (emails) {
      emailList = emails
        .split(/[\n,]+/)
        .map((email) => email.trim())
        .filter(Boolean);
    }

    for (const file of csvFiles) {
      const text = await file.text();
      const fileEmails = text
        .split(/[\n,]+/)
        .map((email) => email.trim())
        .filter(Boolean);
      emailList = [...emailList, ...fileEmails];
    }

    if (emailList.length > 0) {
      const result = await createBatchAuthorizedUsers(emailList);

      if (result.ok && result.data) {
        setEmails("");
        setCsvFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";

        const { successful, failed } = result.data;
        const failedDetails = failed
          .map((f) => `${f.email} (${f.reason})`)
          .join("\n");

        alert(
          `${result.message}\n\n` +
            (failed.length > 0 ? `Failed emails:\n${failedDetails}` : ""),
        );
      } else {
        alert(`Error: ${result.error}`);
      }
    }
  };

  return (
    <section className="mt-8">
      <h2 className="font-bold dark:text-slate-300">Batch Add Users</h2>
      <p className="dark:text-slate-300">
        Enter multiple email addresses or upload a CSV file.
      </p>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="Enter email addresses separated by commas or new lines..."
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={5}
              className="mb-2"
            />
          </div>
          <div
            className="relative border-2 border-dashed border-gray-300 dark:border-slate-500 rounded-lg p-6 hover:border-gray-400 transition-colors duration-200 ease-in-out"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files).filter(
                (file) => file.type === "text/csv",
              );
              setCsvFiles((prevFiles) => [...prevFiles, ...files]);
            }}
          >
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setCsvFiles((prevFiles) => [...prevFiles, ...files]);
              }}
              ref={fileInputRef}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className="inline-flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-300 border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 cursor-pointer"
            >
              Choose Files
            </label>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">
              {csvFiles.length > 0
                ? `${csvFiles.length} file(s) selected`
                : "Drag and drop CSV files here"}
            </p>
            {csvFiles.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600">
                {csvFiles.map((file, index) => (
                  <li key={index} className="flex items-center space-x-2 mb-1">
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <span className="w-2 h-0.5 bg-white"></span>
                    </button>
                    <span>{file.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex-grow"></div>
            <SubmitButton />
          </div>
        </div>
      </form>
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="dark:bg-slate-300" disabled={pending}>
      {pending ? "Sending..." : "Send Invites"}
    </Button>
  );
}
