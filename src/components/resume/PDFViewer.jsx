import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';

export default function PDFViewer({ fileUrl }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to load PDF');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        console.error('PDF load error:', err);
        setError('Failed to load PDF. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadPDF();
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileUrl]);

  return (
    <Card className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between bg-slate-50">
        <div className="text-sm font-medium text-slate-700">PDF Viewer</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            disabled={!blobUrl}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.min(2.0, scale + 0.1))}
            disabled={!blobUrl}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <CardContent className="flex-1 overflow-auto p-0 bg-slate-100">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
              <p className="text-sm text-slate-600">Loading PDF...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="text-sm text-slate-900 font-medium mb-1">Error Loading PDF</p>
              <p className="text-xs text-slate-600">{error}</p>
            </div>
          </div>
        )}
        
        {blobUrl && !loading && !error && (
          <div className="h-full overflow-auto p-4" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <object
              data={blobUrl}
              type="application/pdf"
              className="w-full"
              style={{ height: `${100 / scale}vh` }}
            >
              <embed src={blobUrl} type="application/pdf" className="w-full h-full" />
            </object>
          </div>
        )}
      </CardContent>
    </Card>
  );
}