'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
}

export function UploadZone({ onFileUpload }: UploadZoneProps) {
  const { toast } = useToast();
  
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
        fileRejections.forEach(({ errors }) => {
            errors.forEach((err: any) => {
                toast({
                    variant: 'destructive',
                    title: 'Upload Error',
                    description: err.message
                })
            });
        });
        return;
    }
    
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-bold tracking-tighter mb-2 text-primary">RUN THE GAUNTLET</h1>
        <p className="text-muted-foreground max-w-md mb-8">
            Upload a 3-5 second video hook. We'll simulate its performance against 10,000 hyper-distracted Gen-Z scrollers to see if it survives.
        </p>
        <div
          {...getRootProps()}
          className={`w-full max-w-lg cursor-pointer rounded-xl border-4 border-dashed p-12 transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-4">
            <UploadCloud className="h-16 w-16 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-semibold">Drop it like it's hot!</p>
            ) : (
              <div>
                <p className="text-lg font-semibold">LOAD HOOK</p>
                <p className="text-muted-foreground">Drag & drop or click to upload</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">MP4 or MOV, max 10MB, 3-5 seconds</p>
          </div>
        </div>
    </div>
  );
}
