import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  file: File;
}

interface TextItem {
  id: number;
  text: string;
  x: number;
  y: number;
  pageNumber: number;
}

function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);

  const [isAddingText, setIsAddingText] = useState(false);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const onDocumentLoadSuccess = ({
    numPages,
  }: {
    numPages: number;
  }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // =========================
  // PAGE NAVIGATION
  // =========================

  const previousPage = () => {
    setPageNumber((current) => Math.max(1, current - 1));
  };

  const nextPage = () => {
    setPageNumber((current) =>
      Math.min(numPages, current + 1)
    );
  };

  // =========================
  // ZOOM
  // =========================

  const zoomIn = () => {
    setScale((current) => current + 0.2);
  };

  const zoomOut = () => {
    setScale((current) =>
      Math.max(0.4, current - 0.2)
    );
  };

  // =========================
  // ADD TEXT
  // =========================

  const handleAddText = () => {
    setIsAddingText(true);
  };

  const handleOverlayClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isAddingText) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const text = prompt('Enter your text:');

    if (!text) {
      setIsAddingText(false);
      return;
    }

    const newText: TextItem = {
  id: Date.now(),
  text,
  x,
  y,
  pageNumber,
};

    setTexts((current) => [
      ...current,
      newText,
    ]);

    setIsAddingText(false);
  };

  // =========================
  // DRAG TEXT
  // =========================

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    id: number
  ) => {
    event.stopPropagation();

    setDraggingId(id);
  };

  const handleMouseMove = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (draggingId === null) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setTexts((current) =>
      current.map((item) =>
        item.id === draggingId
          ? {
              ...item,
              x,
              y,
            }
          : item
      )
    );
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  return (
    <div>
      {/* ========================= */}
      {/* TOOLBAR */}
      {/* ========================= */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <button onClick={previousPage}>
          Previous
        </button>

        <span>
          Page {pageNumber} of {numPages}
        </span>

        <button onClick={nextPage}>
          Next
        </button>

        <button onClick={zoomOut}>
          -
        </button>

        <span>
          {Math.round(scale * 100)}%
        </span>

        <button onClick={zoomIn}>
          +
        </button>

        <button onClick={handleAddText}>
          Add Text
        </button>
      </div>

      {/* ========================= */}
      {/* ADD TEXT MESSAGE */}
      {/* ========================= */}

      {isAddingText && (
        <p>
          Click anywhere on the PDF to place your
          text.
        </p>
      )}

      {/* ========================= */}
      {/* PDF CONTAINER */}
      {/* ========================= */}

      <div
        style={{
          position: 'relative',
          display: 'inline-block',
        }}
      >
        {/* PDF */}

        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
          />
        </Document>

        {/* ========================= */}
        {/* OVERLAY */}
        {/* ========================= */}

        <div
          onClick={handleOverlayClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: isAddingText
              ? 'crosshair'
              : 'default',
          }}
        >
          {/* ========================= */}
          {/* TEXT ITEMS */}
          {/* ========================= */}

          {texts
  .filter((item) => item.pageNumber === pageNumber)
  .map((item) => (
            <div
              key={item.id}
              onMouseDown={(event) =>
                handleMouseDown(
                  event,
                  item.id
                )
              }
              style={{
                position: 'absolute',
                left: item.x,
                top: item.y,
                fontSize: '18px',
                color: 'black',
                cursor: 'move',
                userSelect: 'none',
                background: 'rgba(255, 255, 255, 0.5)',
                padding: '2px 4px',
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PdfViewer;