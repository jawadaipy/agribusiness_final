import { useState, useRef } from "react";
import { Upload, X, FileText, Music, Film, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaUploaderProps {
  onUpload?: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

export function MediaUploader({ onUpload, maxFiles = 5, accept = "image/*,video/*,audio/*" }: MediaUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
      onUpload?.([...files, ...newFiles].slice(0, maxFiles));
    }
  };

  const removeFile = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    onUpload?.(newFiles);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
        setFiles(prev => [...prev, audioFile].slice(0, maxFiles));
        onUpload?.([...files, audioFile].slice(0, maxFiles));
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="w-full space-y-4">
      <div 
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 transition-all text-center",
          "border-slate-200 dark:border-slate-700 hover:border-primary/50",
          "bg-slate-50 dark:bg-slate-800/50"
        )}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h4 className="text-lg font-bold mb-1 dark:text-white">Upload Media</h4>
        <p className="text-sm text-muted-foreground mb-6">Drag & drop images, audio, or video</p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="outline" className="relative cursor-pointer" asChild>
            <span>
              Choose Files
              <input 
                type="file" 
                multiple 
                accept={accept} 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </span>
          </Button>
          
          <Button 
            variant={isRecording ? "destructive" : "outline"}
            onClick={isRecording ? stopRecording : startRecording}
            className="gap-2"
          >
            {isRecording ? (
              <><Square className="w-4 h-4" /> Stop Recording</>
            ) : (
              <><Mic className="w-4 h-4" /> Record Voice</>
            )}
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {files.map((file, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-white dark:bg-slate-800">
              <div className="absolute top-2 right-2 z-10">
                <button 
                  onClick={() => removeFile(i)}
                  className="bg-black/50 text-white p-1 rounded-full hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                {file.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : file.type.startsWith('video/') ? (
                  <Film className="w-8 h-8 text-primary" />
                ) : file.type.startsWith('audio/') ? (
                  <Music className="w-8 h-8 text-accent" />
                ) : (
                  <FileText className="w-8 h-8 text-muted-foreground" />
                )}
                <span className="mt-2 text-[10px] text-muted-foreground truncate w-full text-center">
                  {file.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
