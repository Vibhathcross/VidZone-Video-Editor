import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  Upload, 
  Music, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Trash2, 
  Video,
  FileText,
  Layers,
  Plus,
  Crop,
  Download,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Sparkles
} from 'lucide-react';

interface FloatingLayer {
  id: string;
  name: string;
  src: string;
  file: File;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
}

interface DesignerLayer {
  id: string;
  type: 'text' | 'image';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  // Image specific
  src?: string;
  file?: File;
  borderRadius?: number;
  cropLeft?: number;
  cropRight?: number;
  cropTop?: number;
  cropBottom?: number;
  // Text specific
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export default function App() {
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [exportFileName, setExportFileName] = useState('');

  // Playback preview states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Processing states
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Ready to Export');
  const [isFfmpegLoaded, setIsFfmpegLoaded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Mode selection & PDF converter states
  const [currentMode, setCurrentMode] = useState<'editor' | 'pdf' | 'designer'>('editor');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfProgress, setPdfProgress] = useState('');

  // Intro screen states
  const [introVisible, setIntroVisible] = useState(true);
  const [introRendered, setIntroRendered] = useState(true);


  const [bgDimensions, setBgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [floatingLayers, setFloatingLayers] = useState<FloatingLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Designer / Image Creator States
  const [designerWidth, setDesignerWidth] = useState(1280);
  const [designerHeight, setDesignerHeight] = useState(720);
  const [selectedPreset, setSelectedPreset] = useState('youtube'); // youtube, instagram_sq, instagram_story, full_hd, twitter, custom
  const [designerBgColor, setDesignerBgColor] = useState('#09090b');
  const [designerLayers, setDesignerLayers] = useState<DesignerLayer[]>([]);
  const [selectedDesignerLayerId, setSelectedDesignerLayerId] = useState<string | null>(null);
  const [designerScale, setDesignerScale] = useState(1);
  const [isDesignerDragOver, setIsDesignerDragOver] = useState(false);

  const [designerDragState, setDesignerDragState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const [designerResizeState, setDesignerResizeState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const designerCanvasRef = useRef<HTMLDivElement | null>(null);
  const [typingMode, setTypingMode] = useState<'english' | 'phonetic' | 'inscript'>('english');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const translitTimeoutRef = useRef<any>(null);

  // Refs
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

  // Mousemove glow effect for dynamic sci-fi hover responsiveness
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      container.style.setProperty('--mouse-x', `${x}px`);
      container.style.setProperty('--mouse-y', `${y}px`);
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClose = () => setDropdownOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [dropdownOpen]);

  // Startup intro animation timers
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIntroVisible(false);
    }, 2200);
    const removeTimer = setTimeout(() => {
      setIntroRendered(false);
    }, 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      floatingLayers.forEach((l) => URL.revokeObjectURL(l.src));
      designerLayers.forEach((l) => {
        if (l.src) URL.revokeObjectURL(l.src);
      });
    };
  }, []);

  // Monitor scale of the designer canvas to accurately scale preview text sizes and visual attributes
  useEffect(() => {
    const wrapper = designerCanvasRef.current;
    if (!wrapper) return;

    const updateScale = () => {
      setDesignerScale(wrapper.getBoundingClientRect().width / designerWidth);
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(wrapper);

    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [currentMode, designerWidth, designerLayers]);

  // Global drag/resize mouse listeners for Designer Layers
  useEffect(() => {
    if (!designerDragState && !designerResizeState) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const wrapper = designerCanvasRef.current;
      if (!wrapper) return;
      
      const rect = wrapper.getBoundingClientRect();
      const currentScale = rect.width / designerWidth;

      if (designerDragState) {
        const deltaX = (e.clientX - designerDragState.startX) / currentScale;
        const deltaY = (e.clientY - designerDragState.startY) / currentScale;
        
        setDesignerLayers((prev) =>
          prev.map((l) =>
            l.id === designerDragState.layerId
              ? { ...l, x: Math.round(designerDragState.initialX + deltaX), y: Math.round(designerDragState.initialY + deltaY) }
              : l
          )
        );
      } else if (designerResizeState) {
        const deltaWidth = (e.clientX - designerResizeState.startX) / currentScale;
        const deltaHeight = (e.clientY - designerResizeState.startY) / currentScale;
        
        setDesignerLayers((prev) =>
          prev.map((l) =>
            l.id === designerResizeState.layerId
              ? {
                  ...l,
                  width: Math.max(10, Math.round(designerResizeState.startWidth + deltaWidth)),
                  height: Math.max(10, Math.round(designerResizeState.startHeight + deltaHeight))
                }
              : l
          )
        );
      }
    };

    const handleGlobalMouseUp = () => {
      setDesignerDragState(null);
      setDesignerResizeState(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [designerDragState, designerResizeState, designerWidth]);

  // Mouse drag-and-resize listeners for floating layers
  useEffect(() => {
    if (!dragState && !resizeState) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper || !bgDimensions) return;
      
      const rect = wrapper.getBoundingClientRect();
      const currentBgWidth = rect.width;
      const scale = currentBgWidth / bgDimensions.width;

      if (dragState) {
        const deltaX = (e.clientX - dragState.startX) / scale;
        const deltaY = (e.clientY - dragState.startY) / scale;
        
        setFloatingLayers((prev) =>
          prev.map((l) =>
            l.id === dragState.layerId
              ? { ...l, x: dragState.initialX + deltaX, y: dragState.initialY + deltaY }
              : l
          )
        );
      } else if (resizeState) {
        const deltaWidth = (e.clientX - resizeState.startX) / scale;
        const deltaHeight = (e.clientY - resizeState.startY) / scale;
        
        setFloatingLayers((prev) =>
          prev.map((l) =>
            l.id === resizeState.layerId
              ? {
                  ...l,
                  width: Math.max(20, resizeState.startWidth + deltaWidth),
                  height: Math.max(20, resizeState.startHeight + deltaHeight)
                }
              : l
          )
        );
      }
    };

    const handleGlobalMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState, resizeState, bgDimensions]);

  // Audio Playback synchronization
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioPreview]);

  // Render static waveform when audio file is loaded
  useEffect(() => {
    if (!audio || !canvasRef.current) return;
    drawWaveform(audio);
  }, [audio]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-30), message]); // Keep last 30 logs
  };

  const drawWaveform = async (file: File) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw loading state
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#52525b';
    ctx.font = '12px system-ui';
    ctx.fillText('Generating waveform...', 10, 35);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Setup OfflineAudioContext to decode audio on worker thread
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const rawData = decodedBuffer.getChannelData(0); // single channel
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Average blocks of samples to fit canvas width
      const blockSize = Math.floor(rawData.length / width);
      const filteredData: number[] = [];
      for (let i = 0; i < width; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum = sum + Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }

      // Draw bars with a beautiful gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#6366f1'); // Indigo
      gradient.addColorStop(0.5, '#a855f7'); // Purple
      gradient.addColorStop(1, '#d946ef'); // Magenta

      ctx.fillStyle = gradient;
      const multiplier = Math.pow(Math.max(...filteredData), -1);
      
      for (let i = 0; i < width; i++) {
        const heightPercent = filteredData[i] * multiplier;
        const barHeight = Math.max(3, heightPercent * height * 0.9);
        const y = (height - barHeight) / 2;
        
        // Draw thin rounded bars
        ctx.fillRect(i * 3, y, 1.8, barHeight);
      }
      audioCtx.close();
    } catch (err) {
      console.error('Failed to parse audio waveform:', err);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Could not render waveform', 10, 35);
    }
  };

  // Setup Image Dropzone (used for background canvas or adding floating overlays)
  const { 
    getRootProps: getImageProps, 
    getInputProps: getImgInput, 
    isDragActive: isImgDragActive,
    open: openImgFileDialog
  } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    noClick: true, // Disable automatic click-to-open globally for this dropzone
    onDrop: (acceptedFiles) => {
      if (!image) {
        const file = acceptedFiles[0];
        if (file) handleBgDrop(file);
      } else {
        acceptedFiles.forEach((file) => {
          addFloatingLayer(file);
        });
      }
    }
  });

  // Dedicated overlay dropzone for sidebar
  const { 
    getRootProps: getOverlayProps, 
    getInputProps: getOverlayInput, 
    isDragActive: isOverlayDragActive 
  } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    onDrop: (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        addFloatingLayer(file);
      });
    }
  });

  const handleBgDrop = (file: File) => {
    setImage(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    
    // Load image to fetch natural dimensions
    const img = new Image();
    img.onload = () => {
      setBgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = previewUrl;
    setSelectedLayerId(null);
  };

  const addFloatingLayer = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    
    // Default size: fit inside background canvas relative dimensions
    const defaultSize = Math.min(bgDimensions?.width || 300, bgDimensions?.height || 300) * 0.35;
    
    const newLayer: FloatingLayer = {
      id: `layer-${Date.now()}`,
      name: file.name,
      src: previewUrl,
      file: file,
      x: (bgDimensions?.width || 300) * 0.1, // Offset slightly
      y: (bgDimensions?.height || 300) * 0.1,
      width: defaultSize,
      height: defaultSize,
      borderRadius: 0,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0
    };
    setFloatingLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const updateLayerProperty = (layerId: string, property: keyof FloatingLayer, value: any) => {
    setFloatingLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, [property]: value } : l))
    );
  };

  const deleteLayer = (layerId: string) => {
    setFloatingLayers((prev) => {
      const layer = prev.find(l => l.id === layerId);
      if (layer) URL.revokeObjectURL(layer.src);
      return prev.filter((l) => l.id !== layerId);
    });
    if (selectedLayerId === layerId) setSelectedLayerId(null);
  };

  const handleLayerMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    
    const layer = floatingLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    setDragState({
      layerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: layer.x,
      initialY: layer.y
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    const layer = floatingLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    setResizeState({
      layerId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: layer.width,
      startHeight: layer.height
    });
  };

  // Setup Audio Dropzone
  const { 
    getRootProps: getAudioProps, 
    getInputProps: getAudInput, 
    isDragActive: isAudDragActive 
  } = useDropzone({
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'] },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setAudio(file);
        if (audioPreview) URL.revokeObjectURL(audioPreview);
        setAudioPreview(URL.createObjectURL(file));
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  });

  // Setup PDF Dropzone
  const { 
    getRootProps: getPdfProps, 
    getInputProps: getPdfInput, 
    isDragActive: isPdfDragActive 
  } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    onDrop: (acceptedFiles) => {
      handlePdfDrop(acceptedFiles);
    }
  });

  const handlePdfDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setPdfFile(file);
    setPdfPages([]);
    setPdfProgress('Loading PDF engine...');

    try {
      const pdfjsUrl = `${window.location.origin}/pdf.min.mjs`;
      const pdfjs = await import(/* @vite-ignore */ pdfjsUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

      setPdfProgress('Reading PDF file...');
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const renderedPages: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setPdfProgress(`Rendering page ${pageNum} of ${totalPages}...`);
        const page = await pdf.getPage(pageNum);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
          renderedPages.push(jpegUrl);
        }
      }

      setPdfPages(renderedPages);
      setPdfProgress('');
    } catch (err: any) {
      console.error('Failed to convert PDF:', err);
      setPdfProgress(`Error: ${err.message || err}`);
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const usePageAsCover = (pageDataUrl: string, index: number) => {
    const filename = `pdf_page_${index + 1}.jpg`;
    const file = dataURLtoFile(pageDataUrl, filename);
    handleBgDrop(file);
    setCurrentMode('editor');
  };

  const downloadPageImage = (pageDataUrl: string, index: number) => {
    const downloadLink = document.createElement('a');
    downloadLink.href = pageDataUrl;
    downloadLink.download = `pdf_page_${index + 1}.jpg`;
    downloadLink.click();
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setBgDimensions(null);

    
    // Clean up overlays
    floatingLayers.forEach((l) => URL.revokeObjectURL(l.src));
    setFloatingLayers([]);
    setSelectedLayerId(null);
  };

  const removeAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAudio(null);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(null);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Image Creator Actions & Helpers
  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'youtube') {
      setDesignerWidth(1280);
      setDesignerHeight(720);
    } else if (preset === 'instagram_sq') {
      setDesignerWidth(1080);
      setDesignerHeight(1080);
    } else if (preset === 'instagram_story') {
      setDesignerWidth(1080);
      setDesignerHeight(1920);
    } else if (preset === 'full_hd') {
      setDesignerWidth(1920);
      setDesignerHeight(1080);
    } else if (preset === 'twitter') {
      setDesignerWidth(1200);
      setDesignerHeight(675);
    }
  };

  const addDesignerTextLayer = () => {
    const newLayer: DesignerLayer = {
      id: `layer-text-${Date.now()}`,
      type: 'text',
      name: `Text ${designerLayers.filter(l => l.type === 'text').length + 1}`,
      x: Math.round(designerWidth * 0.1),
      y: Math.round(designerHeight * 0.4),
      width: Math.round(designerWidth * 0.8),
      height: Math.round(designerHeight * 0.2),
      zIndex: designerLayers.length + 1,
      text: 'ഇവിടെ ടൈപ്പ് ചെയ്യുക / Type Here',
      color: '#ffffff',
      fontSize: Math.round(designerHeight * 0.08),
      fontFamily: 'Manjari',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center'
    };
    setDesignerLayers((prev) => [...prev, newLayer]);
    setSelectedDesignerLayerId(newLayer.id);
  };

  const addDesignerImageLayer = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const defaultSize = Math.round(Math.min(designerWidth, designerHeight) * 0.35);
    const newLayer: DesignerLayer = {
      id: `layer-img-${Date.now()}`,
      type: 'image',
      name: file.name,
      x: Math.round((designerWidth - defaultSize) / 2),
      y: Math.round((designerHeight - defaultSize) / 2),
      width: defaultSize,
      height: defaultSize,
      zIndex: designerLayers.length + 1,
      src: previewUrl,
      file: file,
      borderRadius: 0,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0
    };
    setDesignerLayers((prev) => [...prev, newLayer]);
    setSelectedDesignerLayerId(newLayer.id);
  };

  const updateDesignerLayerProperty = (layerId: string, property: keyof DesignerLayer, value: any) => {
    setDesignerLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, [property]: value } : l))
    );
  };

  const deleteDesignerLayer = (layerId: string) => {
    setDesignerLayers((prev) => {
      const layer = prev.find((l) => l.id === layerId);
      if (layer && layer.src) URL.revokeObjectURL(layer.src);
      return prev.filter((l) => l.id !== layerId);
    });
    if (selectedDesignerLayerId === layerId) setSelectedDesignerLayerId(null);
  };

  const moveDesignerLayer = (direction: 'up' | 'down' | 'front' | 'back') => {
    if (!selectedDesignerLayerId) return;
    const index = designerLayers.findIndex(l => l.id === selectedDesignerLayerId);
    if (index === -1) return;

    const newLayers = [...designerLayers];
    const target = newLayers[index];

    if (direction === 'up' && index < newLayers.length - 1) {
      newLayers[index] = newLayers[index + 1];
      newLayers[index + 1] = target;
    } else if (direction === 'down' && index > 0) {
      newLayers[index] = newLayers[index - 1];
      newLayers[index - 1] = target;
    } else if (direction === 'front') {
      newLayers.splice(index, 1);
      newLayers.push(target);
    } else if (direction === 'back') {
      newLayers.splice(index, 1);
      newLayers.unshift(target);
    }

    const reindexed = newLayers.map((l, idx) => ({ ...l, zIndex: idx + 1 }));
    setDesignerLayers(reindexed);
  };

  // Malayalam Phonetic Transliteration
  const fallbackTransliterateWord = (word: string): string => {
    const cMap: Record<string, string> = {
      'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
      'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'nj': 'ഞ',
      't': 'ട', 'th': 'ത', 'd': 'ഡ', 'dh': 'ദ', 'n': 'ന',
      'p': 'പ', 'ph': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
      'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ',
      'sh': 'ശ', 'sz': 'ഷ', 's': 'സ', 'h': 'ഹ',
      'zh': 'ഴ', 'L': 'ള', 'R': 'റ'
    };

    const vSignMap: Record<string, string> = {
      'a': '', 'aa': 'ാ', 'i': 'ി', 'ii': 'ീ', 'u': 'ു', 'uu': 'ൂ',
      'e': 'െ', 'ee': 'േ', 'ai': 'ൈ', 'o': 'ൊ', 'oo': 'ോ', 'au': 'ൗ'
    };

    const vInitMap: Record<string, string> = {
      'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'u': 'ഉ', 'uu': 'ഊ',
      'e': 'എ', 'ee': 'ഏ', 'ai': 'ഐ', 'o': 'ഒ', 'oo': 'ഓ', 'au': 'ഔ'
    };

    let w = word.toLowerCase();
    let idx = 0;
    let result = '';

    while (idx < w.length) {
      let c = '';
      let cLen = 0;
      
      if (idx + 1 < w.length && cMap[w.substring(idx, idx + 2)]) {
        c = cMap[w.substring(idx, idx + 2)];
        cLen = 2;
      } else if (cMap[w.substring(idx, idx + 1)]) {
        c = cMap[w.substring(idx, idx + 1)];
        cLen = 1;
      }

      if (c !== '') {
        idx += cLen;
        let v = '';
        let vLen = 0;
        
        if (idx + 1 < w.length && vSignMap[w.substring(idx, idx + 2)]) {
          v = vSignMap[w.substring(idx, idx + 2)];
          vLen = 2;
        } else if (vSignMap[w.substring(idx, idx + 1)]) {
          v = vSignMap[w.substring(idx, idx + 1)];
          vLen = 1;
        }
        
        result += c + v;
        if (vLen > 0) {
          idx += vLen;
        } else {
          result += '്';
        }
      } else {
        let v = '';
        let vLen = 0;
        
        if (idx + 1 < w.length && vInitMap[w.substring(idx, idx + 2)]) {
          v = vInitMap[w.substring(idx, idx + 2)];
          vLen = 2;
        } else if (vInitMap[w.substring(idx, idx + 1)]) {
          v = vInitMap[w.substring(idx, idx + 1)];
          vLen = 1;
        }
        
        if (v !== '') {
          result += v;
          idx += vLen;
        } else {
          result += w[idx];
          idx++;
        }
      }
    }

    return result
      .replace(/ല്്/g, 'ൽ')
      .replace(/ര്്/g, 'ർ')
      .replace(/ന്്/g, 'ൻ')
      .replace(/ള്്/g, 'ൾ')
      .replace(/ണ്്/g, 'ൺ')
      .replace(/കക്/g, 'ക്ക')
      .replace(/തത്/g, 'ത്ത')
      .replace(/നന്/g, 'nn')
      .replace(/nn്/g, 'ന്ന')
      .replace(/പപ്/g, 'പ്പ')
      .replace(/മമ്/g, 'മ്മ')
      .replace(/ലല്/g, 'ല്ല')
      .replace(/ടട്/g, 'ട്ട')
      .replace(/രര്/g, 'റ്റ');
  };

  const fetchGoogleTranslit = async (word: string): Promise<string> => {
    try {
      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=ml-t-i0-und&num=1`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        return data[1][0][1][0] || word;
      }
    } catch (e) {
      console.warn('Google Transliteration error, using fallback:', e);
    }
    return fallbackTransliterateWord(word);
  };

  const transliterateFullText = async (text: string): Promise<string> => {
    const tokens = text.split(/([a-zA-Z]+)/);
    const result = await Promise.all(
      tokens.map(async (token) => {
        if (/^[a-zA-Z]+$/.test(token)) {
          return await fetchGoogleTranslit(token);
        }
        return token;
      })
    );
    return result.join('');
  };

  const handleTextChange = async (val: string, cursorPosition: number) => {
    updateDesignerLayerProperty(selectedDesignerLayerId!, 'text', val);

    if (typingMode === 'phonetic') {
      clearTimeout(translitTimeoutRef.current);
      translitTimeoutRef.current = setTimeout(async () => {
        const transliterated = await transliterateFullText(val);
        if (transliterated !== val) {
          updateDesignerLayerProperty(selectedDesignerLayerId!, 'text', transliterated);
          setTimeout(() => {
            if (textareaRef.current) {
              const diff = transliterated.length - val.length;
              const newPos = Math.max(0, cursorPosition + diff);
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        }
      }, 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (typingMode !== 'inscript') return;

    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;

    e.preventDefault();
    const char = e.key;

    const inscriptKeyMap: Record<string, string> = {
      'q': 'ൌ', 'w': 'ൈ', 'e': 'ാ', 'r': 'ീ', 't': 'ൂ', 'y': 'ബ', 'u': 'ഹ', 'i': 'ഗ', 'o': 'ദ', 'p': 'ജ', '[': 'ഡ', ']': 'ൃ',
      'a': 'ോ', 's': 'േ', 'd': '്', 'f': 'ി', 'g': 'ു', 'h': 'പ', 'j': 'ര', 'k': 'ക', 'l': 'ത', ';': 'ച', "'": 'ട',
      'z': 'െ', 'x': 'ം', 'c': 'മ', 'v': 'ന', 'b': 'യ', 'n': 'ല', 'm': 'സ', ',': 'ശ', '.': 'ഃ', '/': 'യ',
      'Q': 'ഔ', 'W': 'ഐ', 'E': 'ആ', 'R': 'ഈ', 'T': 'ഊ', 'Y': 'ഭ', 'U': 'ങ', 'I': 'ഘ', 'O': 'ധ', 'P': 'ഝ', '{': 'ഢ', '}': 'ഞ',
      'A': 'ഓ', 'S': 'ഏ', 'D': 'അ', 'F': 'ഇ', 'G': 'ഉ', 'H': 'ഫ', 'J': 'റ', 'K': 'ഖ', 'L': 'ഥ', ':': 'ഛ', '"': 'ഠ',
      'Z': 'ഏ', 'X': 'ഃ', 'C': 'ണ', 'V': 'ഴ', 'B': 'ള', 'N': 'ശ', 'M': 'ഷ', '<': 'ഷ', '>': 'ള',
      '1': '൧', '2': '൨', '3': '൩', '4': '൪', '5': '൫', '6': '൬', '7': '൭', '8': '൮', '9': '൯', '0': '൦'
    };

    const mappedChar = inscriptKeyMap[char] || char;

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + mappedChar + text.substring(end);
    updateDesignerLayerProperty(selectedDesignerLayerId!, 'text', newText);

    setTimeout(() => {
      textarea.setSelectionRange(start + mappedChar.length, start + mappedChar.length);
    }, 0);
  };

  const drawDesignerLayerOnCanvas = (ctx: CanvasRenderingContext2D, layer: DesignerLayer): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (layer.type === 'image') {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          const leftInset = ((layer.cropLeft || 0) / 100) * layer.width;
          const rightInset = ((layer.cropRight || 0) / 100) * layer.width;
          const topInset = ((layer.cropTop || 0) / 100) * layer.height;
          const bottomInset = ((layer.cropBottom || 0) / 100) * layer.height;

          const cx = layer.x + leftInset;
          const cy = layer.y + topInset;
          const cw = Math.max(1, layer.width - leftInset - rightInset);
          const ch = Math.max(1, layer.height - topInset - bottomInset);

          const r = layer.borderRadius || 0;
          const rx = cw * (r / 100);
          const ry = ch * (r / 100);

          ctx.beginPath();
          if (ctx.roundRect) {
            try {
              ctx.roundRect(cx, cy, cw, ch, [{ x: rx, y: ry }]);
            } catch (e) {
              const rad = Math.min(cw, ch) * (r / 100);
              ctx.roundRect(cx, cy, cw, ch, rad);
            }
          } else {
            ctx.rect(cx, cy, cw, ch);
          }
          ctx.clip();

          drawImageCover(ctx, img, layer.x, layer.y, layer.width, layer.height);
          ctx.restore();
          resolve();
        };
        img.onerror = () => reject(new Error(`Layer image load failed: ${layer.name}`));
        img.src = layer.src || '';
      } else if (layer.type === 'text') {
        ctx.save();
        const fontStyleString = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize || 40}px "${layer.fontFamily || 'Outfit'}"`;
        ctx.font = fontStyleString;
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.textAlign = layer.textAlign || 'left';
        ctx.textBaseline = 'top';

        const lines = (layer.text || '').split('\n');
        const lineHeight = (layer.fontSize || 40) * 1.25;

        let startX = layer.x;
        if (layer.textAlign === 'center') {
          startX = layer.x + layer.width / 2;
        } else if (layer.textAlign === 'right') {
          startX = layer.x + layer.width;
        }

        lines.forEach((line, index) => {
          ctx.fillText(line, startX, layer.y + index * lineHeight);
        });

        ctx.restore();
        resolve();
      } else {
        resolve();
      }
    });
  };

  const synthesizeDesignerCanvas = async (): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Pre-load all text fonts used in the designer layers
        for (const layer of designerLayers) {
          if (layer.type === 'text' && layer.fontFamily) {
            await document.fonts.load(`${layer.fontSize || 40}px "${layer.fontFamily}"`);
          }
        }
        await document.fonts.ready;
      } catch (e) {
        console.warn('Font loading wait warning:', e);
      }

      const canvas = document.createElement('canvas');
      canvas.width = designerWidth;
      canvas.height = designerHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create designer canvas context'));
        return;
      }

      ctx.fillStyle = designerBgColor;
      ctx.fillRect(0, 0, designerWidth, designerHeight);

      for (const layer of designerLayers) {
        try {
          await drawDesignerLayerOnCanvas(ctx, layer);
        } catch (err) {
          console.error('Failed to render designer layer:', layer.name, err);
        }
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Designer canvas blob conversion failed'));
          }
        },
        'image/png'
      );
    });
  };

  const downloadDesignerImage = async () => {
    try {
      const blob = await synthesizeDesignerCanvas();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vidzone_design_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download designer image:', err);
      alert(`Export failed: ${err.message || err}`);
    }
  };

  const exportDesignerToVideoCover = async () => {
    try {
      const blob = await synthesizeDesignerCanvas();
      const filename = `designer_cover_${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      handleBgDrop(file);
      setCurrentMode('editor');
    } catch (err: any) {
      console.error('Failed to export designer cover:', err);
      alert(`Export failed: ${err.message || err}`);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error(err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audioRef.current.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Canvas synthesis logic
  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const targetRatio = w / h;
    
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    
    if (imgRatio > targetRatio) {
      sw = img.naturalHeight * targetRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / targetRatio;
      sy = (img.naturalHeight - sh) / 2;
    }
    
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const drawLayerOnCanvas = (ctx: CanvasRenderingContext2D, layer: FloatingLayer): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();

        // Calculate cropped bounding box bounds matching CSS inset crop percentages
        const leftInset = (layer.cropLeft / 100) * layer.width;
        const rightInset = (layer.cropRight / 100) * layer.width;
        const topInset = (layer.cropTop / 100) * layer.height;
        const bottomInset = (layer.cropBottom / 100) * layer.height;

        const cx = layer.x + leftInset;
        const cy = layer.y + topInset;
        const cw = Math.max(1, layer.width - leftInset - rightInset);
        const ch = Math.max(1, layer.height - topInset - bottomInset);

        // Apply border radius clip path to the cropped bounding box matching CSS elliptical corner radius
        const rx = cw * (layer.borderRadius / 100);
        const ry = ch * (layer.borderRadius / 100);
        ctx.beginPath();
        if (ctx.roundRect) {
          try {
            ctx.roundRect(cx, cy, cw, ch, [{ x: rx, y: ry }]);
          } catch (e) {
            // Fallback to circular corner radius if DOMPointInit array throws
            const rad = Math.min(cw, ch) * (layer.borderRadius / 100);
            ctx.roundRect(cx, cy, cw, ch, rad);
          }
        } else {
          ctx.rect(cx, cy, cw, ch);
        }
        ctx.clip();

        // Draw image using object-fit: cover in the original bounding box, matching CSS layout
        drawImageCover(ctx, img, layer.x, layer.y, layer.width, layer.height);

        ctx.restore();
        resolve();
      };
      img.onerror = () => reject(new Error('Layer image load failed'));
      img.src = layer.src;
    });
  };

  const synthesizeCanvas = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!image || !bgDimensions) {
        reject(new Error('No background image loaded'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = bgDimensions.width;
      canvas.height = bgDimensions.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      const bgImg = new Image();
      bgImg.onload = async () => {
        // Draw background base
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        // Render layers sequentially
        for (const layer of floatingLayers) {
          try {
            await drawLayerOnCanvas(ctx, layer);
          } catch (err) {
            console.error('Failed to render overlay layer:', layer.name, err);
          }
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas blob conversion failed'));
            }
          },
          'image/png'
        );
      };
      bgImg.onerror = () => reject(new Error('Failed to load background image'));
      bgImg.src = imagePreview!;
    });
  };

  // Compile Pipeline
  const generateVideo = async () => {
    if (!image || !audio) return;
    
    setProcessing(true);
    setProgress(0);
    setStatusText('Preparing...');
    setLogs(['Starting compilation pipeline...']);
    
    try {
      const ffmpeg = ffmpegRef.current;
      
      // Load FFmpeg WebAssembly core if not loaded yet
      if (!isFfmpegLoaded) {
        setStatusText('Loading Core...');
        addLog('Loading WebAssembly core files locally (approx. 30MB)...');
        
        const baseURL = window.location.origin;
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        setIsFfmpegLoaded(true);
        addLog('FFmpeg.wasm core engine successfully initialized.');
      }
      
      // Track encoding progress
      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        setProgress(percent);
        setStatusText(`Encoding (${percent}%)`);
      });
      
      // Track compiler output logs
      ffmpeg.on('log', ({ message }) => {
        addLog(message);
      });

      // 1. Synthesize multi-layer canvas
      setStatusText('Synthesizing Frame...');
      addLog('Synthesizing dynamic multi-layer cover art canvas...');
      const coverBlob = await synthesizeCanvas();
      const coverFile = new File([coverBlob], 'cover.png', { type: 'image/png' });
      
      addLog('Writing image buffer to virtual filesystem...');
      await ffmpeg.writeFile('input_image', await fetchFile(coverFile));
      
      addLog('Writing audio buffer to virtual filesystem...');
      await ffmpeg.writeFile('input_audio', await fetchFile(audio));
      
      setStatusText('Processing...');
      addLog('Processing inputs. Encoding H.264 video frame loop and AAC audio streams...');
      
      // FFmpeg command rules:
      // -loop 1: Loop the image frame
      // -framerate 2: Standard frame rate for still image video representation
      // -vf scale=trunc(iw/2)*2:trunc(ih/2)*2: ensures widths and heights are divisible by 2 for MP4 YUV420p standard
      // -c:v libx264: H.264 visual encoding
      // -crf 15: Constant Rate Factor (15 represents visually lossless high-definition clarity)
      // -preset medium: Medium encoding preset for balanced speed and maximum visual structure
      // -tune stillimage: Optimize for still-image video rendering
      // -c:a aac: AAC audio compression
      // -shortest: Terminate the video loop when the audio input ends
      await ffmpeg.exec([
        '-loop', '1',
        '-framerate', '2',
        '-i', 'input_image',
        '-i', 'input_audio',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264',
        '-crf', '15',
        '-preset', 'medium',
        '-tune', 'stillimage',
        '-c:a', 'aac',
        '-b:a', '320k',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        'output.mp4'
      ]);
      
      setStatusText('Exporting...');
      addLog('Reading output video stream...');
      const data = await ffmpeg.readFile('output.mp4');
      
      addLog('Creating video download url...');
      // Safe Uint8Array buffer conversion
      const rawBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const url = URL.createObjectURL(new Blob([rawBuffer.buffer as ArrayBuffer], { type: 'video/mp4' }));
      
      addLog('Invoking automatic user download...');
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${exportFileName || 'perfect_render'}.mp4`;
      downloadLink.click();
      
      addLog('Video compiled and exported successfully!');
      setStatusText('Success!');
      setProgress(100);

      // Auto-reset success message and progress ring after 2 seconds to restore normal export button
      setTimeout(() => {
        setProgress(0);
        setStatusText('Ready to Export');
        
        // Reset inputs
        setImage(null);
        setAudio(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        if (audioPreview) URL.revokeObjectURL(audioPreview);
        setAudioPreview(null);

        setExportFileName('');
        setIsPlaying(false);
        setCurrentTime(0);
        
        // Clear overlays
        floatingLayers.forEach((l) => URL.revokeObjectURL(l.src));
        setFloatingLayers([]);
        setSelectedLayerId(null);
        setBgDimensions(null);
      }, 2000);
    } catch (error: any) {
      console.error(error);
      addLog(`Error: ${error.message || error}`);
      setStatusText('Failed');

      // Auto-reset failure message after 3 seconds to allow retrying
      setTimeout(() => {
        setProgress(0);
        setStatusText('Ready to Export');
      }, 3000);
    } finally {
      setProcessing(false);
    }
  };

  // Circled Progress calculations
  const circumference = 314.16; // 2 * pi * r (r=50)
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div ref={containerRef} className="app-container">
      {introRendered && (
        <div className={`intro-overlay ${introVisible ? 'visible' : ''}`}>
          <div className="intro-content">
            <h1 className="intro-title">VidZone</h1>
            <p className="intro-sub">Presented by Jasmin</p>
          </div>
        </div>
      )}
      <div className="cyber-corners" />
      <div className="sci-fi-grid" />
      {/* Hidden Audio Player for live preview */}
      {audioPreview && (
        <audio ref={audioRef} src={audioPreview} preload="auto" />
      )}

      {/* Hidden preloader to force browser to load Malayalam and English fonts on page load */}
      <div style={{ opacity: 0, position: 'absolute', pointerEvents: 'none', height: 0, overflow: 'hidden' }}>
        <span style={{ fontFamily: 'Outfit' }}>preload</span>
        <span style={{ fontFamily: 'Inter' }}>preload</span>
        <span style={{ fontFamily: 'JetBrains Mono' }}>preload</span>
        <span style={{ fontFamily: 'Playfair Display' }}>preload</span>
        <span style={{ fontFamily: 'Montserrat' }}>preload</span>
        <span style={{ fontFamily: 'Manjari' }}>preload</span>
        <span style={{ fontFamily: 'Gayathri' }}>preload</span>
        <span style={{ fontFamily: 'Noto Sans Malayalam' }}>preload</span>
        <span style={{ fontFamily: 'Noto Serif Malayalam' }}>preload</span>
      </div>

      {/* Mode Selector Dropdown */}
      <div className="mode-selector-container">
        <button 
          className="mode-selector-btn"
          onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
        >
          <span>
            {currentMode === 'editor' 
              ? 'VidZone Video Editor' 
              : currentMode === 'pdf' 
              ? 'PDF to Image Converter' 
              : 'VidZone Image Creator'}
          </span>
          <svg className={`chevron-icon ${dropdownOpen ? 'open' : ''}`} viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        {dropdownOpen && (
          <div className="mode-dropdown-menu">
            <button 
              className={`dropdown-item ${currentMode === 'editor' ? 'active' : ''}`}
              onClick={() => {
                setCurrentMode('editor');
                setDropdownOpen(false);
              }}
            >
              <span>VidZone Video Editor UI</span>
            </button>
            <button 
              className={`dropdown-item ${currentMode === 'pdf' ? 'active' : ''}`}
              onClick={() => {
                setCurrentMode('pdf');
                setDropdownOpen(false);
              }}
            >
              <span>PDF to Image Converter</span>
            </button>
            <button 
              className={`dropdown-item ${currentMode === 'designer' ? 'active' : ''}`}
              onClick={() => {
                setCurrentMode('designer');
                setDropdownOpen(false);
              }}
            >
              <span>VidZone Image Creator</span>
            </button>
          </div>
        )}
      </div>

      {currentMode === 'editor' ? (
        <>
          <header className="app-header">
            <h1>VidZone</h1>
            <div className="premium-dialogue">
              <span>Studio-Grade Client-Side Renderer</span>
              <span className="divider">•</span>
              <span>No Uploads</span>
              <span className="divider">•</span>
              <span>100% Private</span>
              <span className="divider">•</span>
              <span>Uncapped Quality</span>
            </div>
            <p>VidZone compiles your music and visual covers into studio-grade H.264 MP4 videos entirely on your device.</p>
          </header>

          <div className="dashboard-grid">
            {/* Left Column: Interactive Video Player Mockup (which serves as the editor) */}
            <div className="video-mockup-editor-column">
              <h2 className="preview-title">
                <Video size={18} /> Interactive Video Mockup
                {image && (
                  <button className="remove-btn" style={{ marginLeft: 'auto' }} onClick={removeImage} title="Clear Canvas">
                    <Trash2 size={12} /> Clear Canvas
                  </button>
                )}
              </h2>

              {!image ? (
                <div 
                  key="bg-dropzone"
                  {...getImageProps()} 
                  className={`dropzone ${isImgDragActive ? 'drag-active' : ''}`}
                  onClick={openImgFileDialog}
                >
                  <input {...getImgInput()} />
                  <Upload className="dropzone-icon" />
                  <div className="dropzone-text">
                    <span className="dropzone-main-text">Drag & Drop Background Image</span>
                    <span className="dropzone-sub-text">Sets the mockup aspect ratio and cover base</span>
                  </div>
                  <span className="digital-metric">[IMG.STREAM: STANDBY]</span>
                </div>
              ) : (
                <div className="video-mockup-editor-wrapper">
                  <div className={`video-mockup ${isPlaying ? 'playing' : ''}`}>
                    {/* The interactive overlay area, behaving exactly like the old canvas-drop-area */}
                    <div 
                      key="canvas-drop-area"
                      {...getImageProps()} 
                      className="canvas-drop-area"
                      onClick={(e) => e.stopPropagation()}
                      onDragOver={(e) => {
                        const props = getImageProps();
                        if (props.onDragOver) props.onDragOver(e);
                        if (e.dataTransfer.types.includes('application/vidzone-pdf-page')) {
                          e.preventDefault();
                        }
                      }}
                      onDrop={(e) => {
                        const dataUrl = e.dataTransfer.getData('text/plain');
                        const pageIdx = e.dataTransfer.getData('application/vidzone-pdf-page');
                        if (dataUrl && pageIdx) {
                          e.preventDefault();
                          e.stopPropagation();
                          const filename = `pdf_page_${parseInt(pageIdx) + 1}.jpg`;
                          const file = dataURLtoFile(dataUrl, filename);
                          addFloatingLayer(file);
                        } else {
                          const props = getImageProps();
                          if (props.onDrop) props.onDrop(e as any);
                        }
                      }}
                    >
                      <input {...getImgInput()} />
                      
                      {/* The canvas preview board with overlays */}
                      <div 
                        ref={canvasWrapperRef}
                        className="canvas-preview-board"
                        style={{ aspectRatio: `${bgDimensions ? bgDimensions.width / bgDimensions.height : '16/9'}` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(null);
                        }}
                      >
                        {/* Background cover */}
                        <img src={imagePreview!} className="canvas-bg-image" alt="Canvas background" />
                        
                        {/* Render overlays */}
                        {floatingLayers.map((layer) => {
                          const isSelected = selectedLayerId === layer.id;
                          const scaleX = bgDimensions ? 100 / bgDimensions.width : 1;
                          const scaleY = bgDimensions ? 100 / bgDimensions.height : 1;
                          
                          return (
                            <div
                              key={layer.id}
                              className={`canvas-floating-layer ${isSelected ? 'selected' : ''}`}
                              style={{
                                left: `${layer.x * scaleX}%`,
                                top: `${layer.y * scaleY}%`,
                                width: `${layer.width * scaleX}%`,
                                height: `${layer.height * scaleY}%`,
                              }}
                              onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img 
                                src={layer.src} 
                                alt={layer.name} 
                                className="layer-img" 
                                style={{
                                  clipPath: `inset(${layer.cropTop}% ${layer.cropRight}% ${layer.cropBottom}% ${layer.cropLeft}% round ${layer.borderRadius}%)`
                                }}
                              />
                              
                              {isSelected && (
                                <div 
                                  className="resize-handle"
                                  onMouseDown={(e) => handleResizeMouseDown(e, layer.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inline mockup controls at the bottom of the player screen */}
                    {audioPreview && (
                      <div className="video-mockup-overlay">
                        <div className="playback-controls">
                          <button 
                            className="play-pause-btn" 
                            onClick={togglePlay}
                            title={isPlaying ? "Pause Preview" : "Play Preview"}
                          >
                            {isPlaying ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" />}
                          </button>
                          
                          <div className="progress-track-container">
                            <div className="progress-track" onClick={handleTrackClick}>
                              <div 
                                className="progress-bar-fill" 
                                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                              />
                            </div>
                            <div className="time-display">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sidebar Control Panel */}
            <div className="sidebar-control-panel">
              {/* Audio Dropzone */}
              <div className="sidebar-section">
                <div className="dropzone-title">
                  <Music size={16} /> Audio Track
                </div>
                <div 
                  {...getAudioProps()} 
                  className={`dropzone ${isAudDragActive ? 'drag-active' : ''} ${audio ? 'file-selected' : ''}`}
                >
                  <input {...getAudInput()} />
                  <div className="dropzone-content">
                    {audio ? (
                      <>
                        <div className="file-pill">
                          <Music size={14} />
                          <span>{audio.name}</span>
                          <button className="remove-btn" onClick={removeAudio}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <canvas 
                          ref={canvasRef} 
                          className="waveform-canvas" 
                          width={1000} 
                          height={70} 
                          onClick={(e) => e.stopPropagation()}
                        />
                        <p className="dropzone-sub-text">
                          {(audio.size / (1024 * 1024)).toFixed(2)} MB • Click/drag to replace
                        </p>
                        <span className="digital-metric">[AUD.STREAM: DECODED]</span>
                      </>
                    ) : (
                      <>
                        <Upload className="dropzone-icon" />
                        <div className="dropzone-text">
                          <span className="dropzone-main-text">Drag & Drop Audio</span>
                          <span className="dropzone-sub-text">Supports MP3, WAV, M4A, or OGG</span>
                        </div>
                        <span className="digital-metric">[AUD.STREAM: STANDBY]</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar controls for overlays */}
              {image && (
                <div className="canvas-sidebar">
                  <div className="sidebar-header">
                    <span>Layers & Settings</span>
                    <label className="add-overlay-btn" title="Add Overlay Layer">
                      <Plus size={14} /> Add Overlay
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) addFloatingLayer(file);
                      }} />
                    </label>
                  </div>

                  <div className="layers-list">
                    <div className="layer-item bg-layer" onClick={() => setSelectedLayerId(null)}>
                      <ImageIcon size={14} />
                      <span className="layer-name">Background ({image.name})</span>
                    </div>
                    
                    {floatingLayers.map((layer) => (
                      <div 
                        key={layer.id} 
                        className={`layer-item ${selectedLayerId === layer.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                      >
                        <Layers size={14} />
                        <span className="layer-name">{layer.name}</span>
                        <button className="layer-delete-btn" onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Dedicated sidebar dropzone for overlays */}
                  <div 
                    {...getOverlayProps()} 
                    className={`sidebar-dropzone ${isOverlayDragActive ? 'drag-active' : ''}`}
                  >
                    <input {...getOverlayInput()} />
                    <Upload size={14} />
                    <span>Drag & Drop Overlays here</span>
                  </div>

                  {/* Selected layer properties adjustment */}
                  <div className="layer-properties">
                    {selectedLayerId ? (
                      <>
                        <span className="properties-title">Layer Properties</span>
                        
                        {/* Border radius / shape */}
                        <div className="property-group">
                          <label>Corner Radius / Shape ({floatingLayers.find(l => l.id === selectedLayerId)?.borderRadius}%)</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            value={floatingLayers.find(l => l.id === selectedLayerId)?.borderRadius || 0}
                            onChange={(e) => updateLayerProperty(selectedLayerId, 'borderRadius', parseInt(e.target.value))}
                          />
                        </div>

                        {/* Cropping controls */}
                        <div className="property-group">
                          <span className="subtitle"><Crop size={12} /> Cropping (Inset %)</span>
                          <div className="crop-controls-grid">
                            <div>
                              <label>Top</label>
                              <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                value={floatingLayers.find(l => l.id === selectedLayerId)?.cropTop || 0}
                                onChange={(e) => updateLayerProperty(selectedLayerId, 'cropTop', parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <label>Bottom</label>
                              <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                value={floatingLayers.find(l => l.id === selectedLayerId)?.cropBottom || 0}
                                onChange={(e) => updateLayerProperty(selectedLayerId, 'cropBottom', parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <label>Left</label>
                              <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                value={floatingLayers.find(l => l.id === selectedLayerId)?.cropLeft || 0}
                                onChange={(e) => updateLayerProperty(selectedLayerId, 'cropLeft', parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <label>Right</label>
                              <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                value={floatingLayers.find(l => l.id === selectedLayerId)?.cropRight || 0}
                                onChange={(e) => updateLayerProperty(selectedLayerId, 'cropRight', parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>

                        <button 
                          className="apply-layer-btn"
                          onClick={() => setSelectedLayerId(null)}
                        >
                          Apply Overlay & Preview
                        </button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', minHeight: '80px' }}>
                        Select a floating layer on the player mockup to edit its properties
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compiler Action Section */}
          <div className="action-area">
            {/* Output Filename Input */}
            <div className="filename-input-container">
              <label htmlFor="filename-input">Output Filename</label>
              <div id="search-container">
                <div className="nebula"></div>
                <div className="starfield"></div>
                <div className="cosmic-dust"></div>
                <div className="cosmic-dust"></div>
                <div className="cosmic-dust"></div>
                <div className="stardust"></div>
                <div className="cosmic-ring"></div>

                <div id="main">
                  <input
                    id="filename-input"
                    className="input"
                    name="text"
                    type="text"
                    placeholder=""
                    value={exportFileName}
                    disabled={processing}
                    onChange={(e) => setExportFileName(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''))}
                  />
                  <div id="input-mask"></div>
                  <div id="cosmic-glow"></div>
                  <div className="wormhole-border"></div>
                  <div id="wormhole-icon">
                    <span className="mp4-text">.mp4</span>
                  </div>
                </div>
              </div>
            </div>

            {processing || progress > 0 ? (
              <div className="progress-ring-container">
                <svg 
                  className={`progress-ring ${statusText.includes('Core') || statusText.includes('Canvas') ? 'loading-wasm' : ''}`}
                  width="140" 
                  height="140" 
                  viewBox="0 0 120 120"
                >
                  <defs>
                    <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-secondary)" />
                    </linearGradient>
                  </defs>
                  <circle
                    className="progress-ring-circle-bg"
                    strokeWidth="6"
                    fill="transparent"
                    r="50"
                    cx="60"
                    cy="60"
                  />
                  <circle
                    className="progress-ring-circle-fill"
                    strokeWidth="6"
                    fill="transparent"
                    r="50"
                    cx="60"
                    cy="60"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="progress-text">
                  <span className="progress-percentage">{progress}%</span>
                  <span className="progress-status">{statusText}</span>
                </div>
              </div>
            ) : (
              <button 
                className="export-btn"
                disabled={!image || !audio}
                onClick={generateVideo}
              >
                <Video size={18} /> Export VidZone MP4
                <div className="star-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 784.11 815.53"
                  >
                    <g id="Layer_x0020_1">
                      <path
                        className="fil0"
                        d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
                      ></path>
                    </g>
                  </svg>
                </div>
                <div className="star-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 784.11 815.53"
                  >
                    <g id="Layer_x0020_1">
                      <path
                        className="fil0"
                        d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
                      ></path>
                    </g>
                  </svg>
                </div>
                <div className="star-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 784.11 815.53"
                  >
                    <g id="Layer_x0020_1">
                      <path
                        className="fil0"
                        d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
                      ></path>
                    </g>
                  </svg>
                </div>
                <div className="star-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 784.11 815.53"
                  >
                    <g id="Layer_x0020_1">
                      <path
                        className="fil0"
                        d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
                      ></path>
                    </g>
                  </svg>
                </div>
                <div className="star-5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 784.11 815.53"
                  >
                    <g id="Layer_x0020_1">
                      <path
                        className="fil0"
                        d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
                      ></path>
                    </g>
                  </svg>
                </div>
                <div className="star-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 784.11 815.53"
                  >
                    <g id="Layer_x0020_1">
                      <path
                        className="fil0"
                        d="M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z"
                      ></path>
                    </g>
                  </svg>
                </div>
              </button>
            )}

            {/* Console Log Panel for transparency */}
            {logs.length > 0 && (
              <div className="logs-container">
                {logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`log-item ${
                      log.toLowerCase().includes('success') 
                        ? 'success' 
                        : log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')
                        ? 'error' 
                        : 'info'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : currentMode === 'pdf' ? (
        <div className="pdf-converter-container">
          <header className="pdf-header">
            <h2>PDF to Image Converter</h2>
            <p>Convert PDF pages to high-quality JPEG images instantly and use them directly in your video.</p>
          </header>

          <div className="pdf-dropzone-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div 
              {...getPdfProps()} 
              className={`dropzone pdf-dropzone ${isPdfDragActive ? 'drag-active' : ''} ${pdfFile ? 'file-selected' : ''}`}
            >
              <input {...getPdfInput()} />
              <div className="dropzone-content">
                {pdfFile ? (
                  <>
                    <div className="file-pill">
                      <FileText size={14} className="icon-glow" />
                      <span>{pdfFile.name}</span>
                    </div>
                    <p className="dropzone-sub-text">
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Click/drag to replace
                    </p>
                    <span className="digital-metric">[PDF.STREAM: LOADED]</span>
                  </>
                ) : (
                  <>
                    <Upload className="dropzone-icon" />
                    <div className="dropzone-text">
                      <span className="dropzone-main-text">Drag & Drop PDF File</span>
                      <span className="dropzone-sub-text">Select a PDF to extract pages as images</span>
                    </div>
                    <span className="digital-metric">[PDF.STREAM: STANDBY]</span>
                  </>
                )}
              </div>
            </div>
            {pdfProgress && <div className="pdf-status">{pdfProgress}</div>}
          </div>

          {pdfPages.length > 0 && (
            <div>
              <h3 className="pdf-grid-title">Rendered PDF Pages ({pdfPages.length})</h3>
              <div className="pdf-grid">
                {pdfPages.map((pageDataUrl, idx) => (
                  <div key={idx} className="pdf-page-card">
                    <div className="pdf-thumbnail-container">
                      <img 
                        src={pageDataUrl} 
                        className="pdf-page-thumbnail" 
                        alt={`PDF Page ${idx + 1}`} 
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', pageDataUrl);
                          e.dataTransfer.setData('application/vidzone-pdf-page', idx.toString());
                        }}
                      />
                    </div>
                    <div className="pdf-page-info">
                      <span className="pdf-page-number">PAGE {idx + 1}</span>
                      <div className="pdf-page-actions">
                        <button 
                          className="pdf-btn use-btn"
                          onClick={() => usePageAsCover(pageDataUrl, idx)}
                        >
                          Use as Cover
                        </button>
                        <button 
                          className="pdf-btn"
                          onClick={() => downloadPageImage(pageDataUrl, idx)}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="designer-workspace">
          <header className="pdf-header">
            <h2>VidZone Image Creator</h2>
            <p>Create high-resolution custom graphics, cover designs, and Malayalam or English text overlays.</p>
          </header>

          <div className="designer-grid">
            {/* Left Column: Canvas Viewport */}
            <div className="designer-viewport-column">
              <h2 className="preview-title">
                <Sparkles size={18} /> Interactive Canvas
              </h2>

              <div className="designer-canvas-outer">
                <div 
                  ref={designerCanvasRef}
                  className={`designer-canvas-workspace ${isDesignerDragOver ? 'drag-over' : ''}`}
                  style={{
                    width: '100%',
                    aspectRatio: `${designerWidth} / ${designerHeight}`,
                    backgroundColor: designerBgColor,
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDesignerDragOver(true);
                  }}
                  onDragLeave={() => {
                    setIsDesignerDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDesignerDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    const imgFiles = files.filter(f => f.type.startsWith('image/'));
                    if (imgFiles.length > 0) {
                      addDesignerImageLayer(imgFiles[0]);
                    }
                  }}
                  onClick={() => setSelectedDesignerLayerId(null)}
                >
                  {/* Render Designer Layers */}
                  {designerLayers.map((layer) => {
                    const isSelected = selectedDesignerLayerId === layer.id;
                    const scaleX = 100 / designerWidth;
                    const scaleY = 100 / designerHeight;
                    
                    return (
                      <div
                        key={layer.id}
                        className={`designer-layer-item ${isSelected ? 'selected' : ''}`}
                        style={{
                          left: `${layer.x * scaleX}%`,
                          top: `${layer.y * scaleY}%`,
                          width: `${layer.width * scaleX}%`,
                          height: `${layer.height * scaleY}%`,
                          zIndex: layer.zIndex,
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedDesignerLayerId(layer.id);
                          setDesignerDragState({
                            layerId: layer.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            initialX: layer.x,
                            initialY: layer.y
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {layer.type === 'image' ? (
                          <div className="designer-layer-content">
                            <img 
                              src={layer.src} 
                              alt={layer.name} 
                              className="designer-image-el" 
                              style={{
                                clipPath: `inset(${layer.cropTop}% ${layer.cropRight}% ${layer.cropBottom}% ${layer.cropLeft}% round ${layer.borderRadius}%)`
                              }}
                            />
                          </div>
                        ) : (
                          <div className="designer-layer-content">
                            <div 
                              className="designer-text-el"
                              style={{
                                color: layer.color,
                                fontSize: `${layer.fontSize! * designerScale}px`,
                                fontFamily: layer.fontFamily,
                                fontWeight: layer.fontWeight,
                                fontStyle: layer.fontStyle,
                                textAlign: layer.textAlign,
                              }}
                            >
                              {layer.text}
                            </div>
                          </div>
                        )}
                        
                        {isSelected && (
                          <div 
                            className="designer-resize-handle"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDesignerResizeState({
                                layerId: layer.id,
                                startX: e.clientX,
                                startY: e.clientY,
                                startWidth: layer.width,
                                startHeight: layer.height
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions below Canvas */}
              <div className="designer-export-options">
                <div className="designer-export-row">
                  <button 
                    className="designer-export-btn editor-link-btn"
                    onClick={exportDesignerToVideoCover}
                  >
                    <Video size={16} /> Use in Video Creator
                  </button>
                  <button 
                    className="designer-export-btn download-btn"
                    onClick={downloadDesignerImage}
                  >
                    <Download size={16} /> Download Image
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Designer Properties Panel */}
            <div className="sidebar-control-panel">
              {/* Canvas Dimensions Section */}
              <div className="sidebar-section">
                <div className="dropzone-title">
                  <Layers size={16} /> Canvas Dimensions
                </div>
                <div className="layer-properties">
                  <div className="property-group">
                    <label>Presets</label>
                    <div className="designer-presets-container">
                      <button 
                        className={`preset-btn ${selectedPreset === 'youtube' ? 'active' : ''}`}
                        onClick={() => applyPreset('youtube')}
                      >
                        YouTube (16:9)
                      </button>
                      <button 
                        className={`preset-btn ${selectedPreset === 'instagram_sq' ? 'active' : ''}`}
                        onClick={() => applyPreset('instagram_sq')}
                      >
                        Instagram 1:1
                      </button>
                      <button 
                        className={`preset-btn ${selectedPreset === 'instagram_story' ? 'active' : ''}`}
                        onClick={() => applyPreset('instagram_story')}
                      >
                        Story 9:16
                      </button>
                      <button 
                        className={`preset-btn ${selectedPreset === 'full_hd' ? 'active' : ''}`}
                        onClick={() => applyPreset('full_hd')}
                      >
                        Full HD 1080p
                      </button>
                      <button 
                        className={`preset-btn ${selectedPreset === 'twitter' ? 'active' : ''}`}
                        onClick={() => applyPreset('twitter')}
                      >
                        Twitter Post
                      </button>
                      <button 
                        className={`preset-btn ${selectedPreset === 'custom' ? 'active' : ''}`}
                        onClick={() => setSelectedPreset('custom')}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  <div className="designer-dimensions-grid">
                    <div className="hud-input-group">
                      <label htmlFor="designer-width-input">Width (px)</label>
                      <input 
                        id="designer-width-input"
                        type="number" 
                        className="hud-number-input"
                        value={designerWidth}
                        onChange={(e) => {
                          setSelectedPreset('custom');
                          setDesignerWidth(Math.max(100, Math.min(4000, parseInt(e.target.value) || 100)));
                        }}
                      />
                    </div>
                    <div className="hud-input-group">
                      <label htmlFor="designer-height-input">Height (px)</label>
                      <input 
                        id="designer-height-input"
                        type="number" 
                        className="hud-number-input"
                        value={designerHeight}
                        onChange={(e) => {
                          setSelectedPreset('custom');
                          setDesignerHeight(Math.max(100, Math.min(4000, parseInt(e.target.value) || 100)));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Color Customization */}
              <div className="sidebar-section">
                <div className="dropzone-title">
                  <ImageIcon size={16} /> Background Style
                </div>
                <div className="layer-properties color-grid-container">
                  <span className="color-grid-title">Color Grid Preset</span>
                  <div className="color-selection-row">
                    {[
                      '#09090b', // Base dark
                      '#18181b', // Zinc dark
                      '#27272a', // Grey
                      '#7f1d1d', // Dark red
                      '#14532d', // Dark green
                      '#0f172a', // Dark blue
                      '#3b0764', // Dark violet
                      '#581c87', // Dark purple
                      '#6366f1', // Indigo accent
                      '#d946ef', // Magenta accent
                      '#00f0ff', // Cyber cyan
                      '#ffffff'  // Pure white
                    ].map((col) => (
                      <div 
                        key={col} 
                        className={`color-swatch ${designerBgColor === col ? 'active' : ''}`}
                        style={{ backgroundColor: col }}
                        onClick={() => setDesignerBgColor(col)}
                      />
                    ))}
                    <div className="custom-color-picker-wrapper">
                      <label htmlFor="designer-bg-color-picker" style={{ display: 'none' }}>Custom BG Color</label>
                      <input 
                        id="designer-bg-color-picker"
                        type="color" 
                        className="custom-color-input"
                        value={designerBgColor.startsWith('#') && designerBgColor.length === 7 ? designerBgColor : '#09090b'}
                        onChange={(e) => setDesignerBgColor(e.target.value)}
                        title="Choose custom background color"
                      />
                      <span>Custom Color</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Elements Section */}
              <div className="sidebar-section">
                <div className="dropzone-title">
                  <Plus size={16} /> Add Elements
                </div>
                <div className="add-elements-row">
                  <button className="designer-action-btn" onClick={addDesignerTextLayer}>
                    <Type size={16} /> Add Text Layer
                  </button>
                  <label className="designer-action-btn" style={{ cursor: 'pointer' }}>
                    <ImageIcon size={16} /> Add Image Layer
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) addDesignerImageLayer(file);
                      }} 
                    />
                  </label>
                </div>
              </div>

              {/* Designer Layers List & Hierarchy */}
              <div className="sidebar-section">
                <div className="sidebar-header">
                  <span>Designer Layers</span>
                  <span className="digital-metric">[{designerLayers.length} LAYERS]</span>
                </div>
                
                <div className="layers-list">
                  {designerLayers.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      No layers added yet. Use the buttons above to add text or images.
                    </div>
                  ) : (
                    designerLayers.map((layer) => (
                      <div 
                        key={layer.id} 
                        className={`layer-item ${selectedDesignerLayerId === layer.id ? 'active' : ''}`}
                        onClick={() => setSelectedDesignerLayerId(layer.id)}
                      >
                        {layer.type === 'text' ? <Type size={14} /> : <ImageIcon size={14} />}
                        <span className="layer-name">{layer.name}</span>
                        <button className="layer-delete-btn" onClick={(e) => {
                          e.stopPropagation();
                          deleteDesignerLayer(layer.id);
                        }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Layer Inspector properties */}
                {selectedDesignerLayerId && designerLayers.find(l => l.id === selectedDesignerLayerId) && (
                  <div className="layer-properties">
                    <span className="properties-title">Properties Inspector</span>
                    
                    {/* Layer Positioning Coordinate adjustments */}
                    <div className="crop-controls-grid">
                      <div>
                        <label>X Position</label>
                        <input 
                          type="number"
                          className="hud-number-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.x || 0}
                          onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'x', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label>Y Position</label>
                        <input 
                          type="number"
                          className="hud-number-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.y || 0}
                          onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'y', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label>Width (px)</label>
                        <input 
                          type="number"
                          className="hud-number-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.width || 0}
                          onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'width', Math.max(10, parseInt(e.target.value) || 10))}
                        />
                      </div>
                      <div>
                        <label>Height (px)</label>
                        <input 
                          type="number"
                          className="hud-number-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.height || 0}
                          onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'height', Math.max(10, parseInt(e.target.value) || 10))}
                        />
                      </div>
                    </div>

                    {/* Depth/Ordering Controls */}
                    <div className="property-group">
                      <label>Arrange Stack Depth</label>
                      <div className="order-buttons-grid">
                        <button 
                          className="order-btn" 
                          onClick={() => moveDesignerLayer('front')}
                          title="Bring to Front"
                        >
                          Front
                        </button>
                        <button 
                          className="order-btn" 
                          onClick={() => moveDesignerLayer('up')}
                          title="Move Up"
                        >
                          Up
                        </button>
                        <button 
                          className="order-btn" 
                          onClick={() => moveDesignerLayer('down')}
                          title="Move Down"
                        >
                          Down
                        </button>
                        <button 
                          className="order-btn" 
                          onClick={() => moveDesignerLayer('back')}
                          title="Send to Back"
                        >
                          Back
                        </button>
                      </div>
                    </div>

                    {/* Text Specific Property Controls */}
                    {designerLayers.find(l => l.id === selectedDesignerLayerId)?.type === 'text' && (
                      <>
                        <div className="property-group">
                          <label>Typing Input Mode</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className={`preset-btn ${typingMode === 'english' ? 'active' : ''}`}
                              style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem' }}
                              onClick={() => setTypingMode('english')}
                            >
                              English
                            </button>
                            <button
                              type="button"
                              className={`preset-btn ${typingMode === 'phonetic' ? 'active' : ''}`}
                              style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem' }}
                              onClick={() => setTypingMode('phonetic')}
                              title="Type phonetically (e.g. 'amma' -> 'അമ്മ')"
                            >
                              Phonetic
                            </button>
                            <button
                              type="button"
                              className={`preset-btn ${typingMode === 'inscript' ? 'active' : ''}`}
                              style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem' }}
                              onClick={() => setTypingMode('inscript')}
                              title="Direct Malayalam InScript key mapping"
                            >
                              Keyboard
                            </button>
                          </div>
                        </div>

                        <div className="property-group">
                          <label htmlFor="designer-text-value-input">Text Value</label>
                          <textarea
                            ref={textareaRef}
                            id="designer-text-value-input"
                            className="hud-number-input"
                            rows={3}
                            style={{ resize: 'vertical', fontSize: '0.8125rem' }}
                            value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.text || ''}
                            onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                              typingMode === 'phonetic' 
                                ? "Type in English to get Malayalam (e.g. 'amma' -> 'അമ്മ')" 
                                : typingMode === 'inscript'
                                ? "Type using mapped InScript keys (see guide below)"
                                : "Enter text here"
                            }
                          />
                        </div>

                        {typingMode === 'inscript' && (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', textAlign: 'center' }}>Malayalam InScript Keyboard Map</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px', fontFamily: 'monospace', fontSize: '0.6875rem', textAlign: 'center' }}>
                              <div>q:ൌ</div><div>w:ൈ</div><div>e:ാ</div><div>r:ീ</div><div>t:ൂ</div><div>y:ബ</div><div>u:ഹ</div><div>i:ഗ</div><div>o:ദ</div><div>p:ജ</div>
                              <div>a:ോ</div><div>s:േ</div><div>d:്</div><div>f:ി</div><div>g:ു</div><div>h:പ</div><div>j:ര</div><div>k:ക</div><div>l:ത</div><div>;:ച</div>
                              <div>z:െ</div><div>x:ം</div><div>c:മ</div><div>v:ന</div><div>b:യ</div><div>n:ല</div><div>m:സ</div><div>,:ശ</div><div>.:ഃ</div><div>/:യ</div>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
                              Hold <strong>Shift</strong> for vowels (D:അ, E:ആ, F:ഇ, R:ഈ, G:ഉ, T:ഊ, S:ഏ, A:ഓ).
                            </div>
                          </div>
                        )}

                        <div className="property-group">
                          <label>Font Family</label>
                          <select 
                            className="hud-select"
                            aria-label="Font Family Selection"
                            value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.fontFamily || 'Outfit'}
                            onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'fontFamily', e.target.value)}
                          >
                            <optgroup label="English Fonts">
                              <option value="Outfit">Outfit (Default)</option>
                              <option value="Inter">Inter</option>
                              <option value="JetBrains Mono">JetBrains Mono</option>
                              <option value="Playfair Display">Playfair Display</option>
                              <option value="Montserrat">Montserrat</option>
                            </optgroup>
                            <optgroup label="Malayalam Fonts">
                              <option value="Manjari">Manjari</option>
                              <option value="Gayathri">Gayathri</option>
                              <option value="Noto Sans Malayalam">Noto Sans Malayalam</option>
                              <option value="Noto Serif Malayalam">Noto Serif Malayalam</option>
                            </optgroup>
                          </select>
                        </div>

                        <div className="property-group">
                          <label>Font Size ({designerLayers.find(l => l.id === selectedDesignerLayerId)?.fontSize}px)</label>
                          <input 
                            type="range"
                            min="8"
                            max="200"
                            value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.fontSize || 30}
                            onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'fontSize', parseInt(e.target.value))}
                          />
                        </div>

                        <div className="property-group">
                          <label>Text Color</label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input 
                              type="color"
                              className="custom-color-input"
                              value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.color || '#ffffff'}
                              onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'color', e.target.value)}
                              title="Choose text color"
                            />
                            <input 
                              type="text"
                              className="hud-number-input"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: '90px' }}
                              value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.color || '#ffffff'}
                              onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'color', e.target.value)}
                              title="Hex text color input"
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div className="property-group">
                            <label>Text Alignment</label>
                            <div className="style-toggles-row">
                              <button 
                                className={`toggle-icon-btn ${designerLayers.find(l => l.id === selectedDesignerLayerId)?.textAlign === 'left' ? 'active' : ''}`}
                                onClick={() => updateDesignerLayerProperty(selectedDesignerLayerId, 'textAlign', 'left')}
                                title="Align Left"
                              >
                                <AlignLeft size={16} />
                              </button>
                              <button 
                                className={`toggle-icon-btn ${designerLayers.find(l => l.id === selectedDesignerLayerId)?.textAlign === 'center' ? 'active' : ''}`}
                                onClick={() => updateDesignerLayerProperty(selectedDesignerLayerId, 'textAlign', 'center')}
                                title="Align Center"
                              >
                                <AlignCenter size={16} />
                              </button>
                              <button 
                                className={`toggle-icon-btn ${designerLayers.find(l => l.id === selectedDesignerLayerId)?.textAlign === 'right' ? 'active' : ''}`}
                                onClick={() => updateDesignerLayerProperty(selectedDesignerLayerId, 'textAlign', 'right')}
                                title="Align Right"
                              >
                                <AlignRight size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="property-group">
                            <label>Text Style</label>
                            <div className="style-toggles-row">
                              <button 
                                className={`toggle-icon-btn ${designerLayers.find(l => l.id === selectedDesignerLayerId)?.fontWeight === 'bold' ? 'active' : ''}`}
                                onClick={() => updateDesignerLayerProperty(
                                  selectedDesignerLayerId, 
                                  'fontWeight', 
                                  designerLayers.find(l => l.id === selectedDesignerLayerId)?.fontWeight === 'bold' ? 'normal' : 'bold'
                                )}
                                title="Bold"
                              >
                                <Bold size={16} />
                              </button>
                              <button 
                                className={`toggle-icon-btn ${designerLayers.find(l => l.id === selectedDesignerLayerId)?.fontStyle === 'italic' ? 'active' : ''}`}
                                onClick={() => updateDesignerLayerProperty(
                                  selectedDesignerLayerId, 
                                  'fontStyle', 
                                  designerLayers.find(l => l.id === selectedDesignerLayerId)?.fontStyle === 'italic' ? 'normal' : 'italic'
                                )}
                                title="Italic"
                              >
                                <Italic size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Image Specific Property Controls */}
                    {designerLayers.find(l => l.id === selectedDesignerLayerId)?.type === 'image' && (
                      <>
                        <div className="property-group">
                          <label>Corner Radius ({designerLayers.find(l => l.id === selectedDesignerLayerId)?.borderRadius}%)</label>
                          <input 
                            type="range"
                            min="0"
                            max="50"
                            value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.borderRadius || 0}
                            onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'borderRadius', parseInt(e.target.value))}
                          />
                        </div>

                        <div className="property-group">
                          <span className="subtitle"><Crop size={12} /> Crop (Inset %)</span>
                          <div className="crop-controls-grid">
                            <div>
                              <label>Top</label>
                              <input 
                                type="range"
                                min="0"
                                max="90"
                                value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.cropTop || 0}
                                onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'cropTop', parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <label>Bottom</label>
                              <input 
                                type="range"
                                min="0"
                                max="90"
                                value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.cropBottom || 0}
                                onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'cropBottom', parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <label>Left</label>
                              <input 
                                type="range"
                                min="0"
                                max="90"
                                value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.cropLeft || 0}
                                onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'cropLeft', parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <label>Right</label>
                              <input 
                                type="range"
                                min="0"
                                max="90"
                                value={designerLayers.find(l => l.id === selectedDesignerLayerId)?.cropRight || 0}
                                onChange={(e) => updateDesignerLayerProperty(selectedDesignerLayerId, 'cropRight', parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <button 
                      className="apply-layer-btn"
                      onClick={() => setSelectedDesignerLayerId(null)}
                    >
                      Deselect & Finish
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticker Footer */}
      <footer className="app-footer">
        <div className="ticker-wrap">
          <div className="ticker">
            <div className="ticker-item">H.264 ENCODING</div>
            <div className="ticker-item">CLIENT-SIDE PROCESSING</div>
            <div className="ticker-item">WEBASEMBLY POWERED</div>
            <div className="ticker-item">ZERO SERVER LATENCY</div>
            <div className="ticker-item">100% PRIVATE & SECURE</div>
            <div className="ticker-item">AAC 320KBPS AUDIO</div>
            <div className="ticker-item">LOSSLESS MERGE</div>
            <div className="ticker-item">CHROME APP MODE</div>
            {/* Repeat for seamless loop */}
            <div className="ticker-item">H.264 ENCODING</div>
            <div className="ticker-item">CLIENT-SIDE PROCESSING</div>
            <div className="ticker-item">WEBASEMBLY POWERED</div>
            <div className="ticker-item">ZERO SERVER LATENCY</div>
            <div className="ticker-item">100% PRIVATE & SECURE</div>
            <div className="ticker-item">AAC 320KBPS AUDIO</div>
            <div className="ticker-item">LOSSLESS MERGE</div>
            <div className="ticker-item">CHROME APP MODE</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
