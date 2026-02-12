import { useState, useRef } from 'react';
import { fileToDataUrl } from '@/llm/image-utils';

interface ChatInputProps {
  onSend: (text: string, photos: string[]) => void;
  loading: boolean;
  disabled: boolean;
}

export function ChatInput({ onSend, loading, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !loading && !disabled && (text.trim().length > 0 || photos.length > 0);

  function handleSend() {
    if (!canSend) return;
    onSend(text.trim(), photos);
    setText('');
    setPhotos([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const remaining = 3 - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      try {
        const dataUrl = await fileToDataUrl(file);
        setPhotos((prev) => {
          if (prev.length >= 3) return prev;
          return [...prev, dataUrl];
        });
      } catch {
        // Skip files that fail to load/compress
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="border-t border-stone-200 bg-white p-3">
      {photos.length > 0 && (
        <div className="flex gap-2 mb-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative">
              <img
                src={photo}
                alt={`Preview ${i + 1}`}
                className="w-14 h-14 rounded object-cover"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                aria-label={`Remove photo ${i + 1}`}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <label className="shrink-0 cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
            disabled={loading || disabled || photos.length >= 3}
          />
          <span
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${
              photos.length >= 3
                ? 'bg-stone-100 text-stone-300'
                : 'bg-stone-100 text-stone-600 active:bg-stone-200'
            }`}
            aria-label="Attach photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you found..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
          disabled={loading || disabled}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          className="shrink-0 w-10 h-10 rounded-lg bg-green-700 text-white flex items-center justify-center disabled:opacity-50 active:bg-green-800"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
