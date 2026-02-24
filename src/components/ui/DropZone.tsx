'use client';

import { useCallback, DragEvent, ChangeEvent, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { UploadedScreen } from '@/types';

interface DropZoneProps {
  screens: UploadedScreen[];
  onChange: (screens: UploadedScreen[]) => void;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function readFileAsBase64(file: File): Promise<UploadedScreen> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        base64: reader.result as string,
        mimeType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DropZone({ screens, onChange }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
      if (fileArr.length === 0) return;
      const results = await Promise.all(fileArr.map(readFileAsBase64));
      onChange([...screens, ...results]);
    },
    [screens, onChange]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const onFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
    },
    [addFiles]
  );

  const remove = useCallback(
    (idx: number) => {
      onChange(screens.filter((_, i) => i !== idx));
    },
    [screens, onChange]
  );

  return (
    <div className="space-y-3">
      {screens.length >= 5 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Warning: {screens.length} images uploaded. Large numbers of images will consume more tokens.
        </p>
      )}
      <div
        className={cn(
          'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors',
        )}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-sm text-gray-500">
          Drag &amp; drop screenshots here, or <span className="text-blue-600 font-medium">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPEG, GIF, WEBP</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {screens.length > 0 && (
        <ul className="space-y-1">
          {screens.map((s, i) => (
            <li key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
              <span className="truncate text-gray-700">{s.name}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-2 text-red-500 hover:text-red-700 shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
