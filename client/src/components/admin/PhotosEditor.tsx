import { useRef, useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PhotoImage {
  url: string;
  caption: string;
}

interface Props {
  images: PhotoImage[];
  uploadMutation: UseMutationResult<void, Error, { file: File; caption: string }>;
  deleteMutation: UseMutationResult<void, Error, string>;
  captionMutation: UseMutationResult<void, Error, { filename: string; caption: string }>;
}

export function PhotosEditor({ images, uploadMutation, deleteMutation, captionMutation }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingCaptions, setPendingCaptions] = useState<Record<string, string>>({});

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be 10 MB or smaller');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    uploadMutation.mutate(
      { file, caption: '' },
      {
        onError: () => toast.error('Failed to upload image'),
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
  }

  function handleDelete(filename: string) {
    deleteMutation.mutate(filename, {
      onError: () => toast.error('Failed to delete image')
    });
  }

  function handleCaptionBlur(filename: string, currentCaption: string) {
    const caption = pendingCaptions[filename];
    if (caption == null || caption === currentCaption) return;
    captionMutation.mutate(
      { filename, caption },
      {
        onError: () => toast.error('Failed to update caption'),
        onSuccess: () =>
          setPendingCaptions((prev) => {
            const next = { ...prev };
            delete next[filename];
            return next;
          })
      }
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Photos</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span className="ml-2">Add Photo</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {images.length === 0 && <p className="text-sm text-muted-foreground">No photos yet.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img) => {
          const filename = img.url.split('/').pop() ?? '';
          const captionValue = pendingCaptions[filename] ?? img.caption;

          return (
            <div key={img.url} className="space-y-1">
              <div className="relative rounded-md overflow-hidden aspect-video bg-muted">
                <img
                  src={`${import.meta.env.VITE_FILE_SERVER_PREFIX}/${img.url}`}
                  alt={img.caption}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(filename)}
                  disabled={deleteMutation.isPending}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Input
                value={captionValue}
                placeholder="Caption"
                className="text-xs h-7"
                onChange={(e) =>
                  setPendingCaptions((prev) => ({ ...prev, [filename]: e.target.value }))
                }
                onBlur={() => handleCaptionBlur(filename, img.caption)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
