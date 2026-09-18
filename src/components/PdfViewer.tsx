import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  PDFDocument,
  rgb,
  StandardFonts,
} from 'pdf-lib';

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
  fontSize: number;
  bold: boolean;
  color: string;
}

interface ImageItem {
  id: number;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

interface DrawingPoint {
  x: number;
  y: number;
}

interface DrawingItem {
  id: number;
  points: DrawingPoint[];
  pageNumber: number;
}

function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);

  const [isAddingText, setIsAddingText] =
    useState(false);

  const [isAddingImage, setIsAddingImage] =
    useState(false);

  const [isDrawing, setIsDrawing] =
    useState(false);

  const [texts, setTexts] =
    useState<TextItem[]>([]);

  const [images, setImages] =
    useState<ImageItem[]>([]);

  const [drawings, setDrawings] =
    useState<DrawingItem[]>([]);

  const [selectedTextId, setSelectedTextId] =
    useState<number | null>(null);

  const [selectedImageId, setSelectedImageId] =
    useState<number | null>(null);

  const [draggingId, setDraggingId] =
    useState<number | null>(null);

  const [draggingType, setDraggingType] =
    useState<'text' | 'image' | null>(null);

  const [resizingImageId, setResizingImageId] =
    useState<number | null>(null);

  const [isCurrentlyDrawing, setIsCurrentlyDrawing] =
    useState(false);

  const currentStroke = useRef<DrawingPoint[]>([]);

  const drawingCanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  // ==========================================
  // PDF LOAD
  // ==========================================

  const onDocumentLoadSuccess = ({
    numPages,
  }: {
    numPages: number;
  }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // ==========================================
  // PAGE NAVIGATION
  // ==========================================

  const previousPage = () => {
    setPageNumber((current) =>
      Math.max(1, current - 1),
    );

    setSelectedTextId(null);
    setSelectedImageId(null);
  };

  const nextPage = () => {
    setPageNumber((current) =>
      Math.min(numPages, current + 1),
    );

    setSelectedTextId(null);
    setSelectedImageId(null);
  };

  // ==========================================
  // ZOOM
  // ==========================================

  const zoomIn = () => {
    setScale((current) => current + 0.2);
  };

  const zoomOut = () => {
    setScale((current) =>
      Math.max(0.4, current - 0.2),
    );
  };

  // ==========================================
  // ADD TEXT
  // ==========================================

  const handleAddText = () => {
    setIsAddingText(true);
    setIsAddingImage(false);
    setIsDrawing(false);

    setSelectedTextId(null);
    setSelectedImageId(null);
  };

  const handleAddTextToPdf = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!isAddingText) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const text = prompt('Enter your text:');

    if (!text || text.trim() === '') {
      setIsAddingText(false);
      return;
    }

    const newText: TextItem = {
      id: Date.now(),
      text,
      x,
      y,
      pageNumber,
      fontSize: 18,
      bold: false,
      color: '#000000',
    };

    setTexts((current) => [
      ...current,
      newText,
    ]);

    setSelectedTextId(newText.id);
    setSelectedImageId(null);

    setIsAddingText(false);
  };

  // ==========================================
  // ADD IMAGE
  // ==========================================

  const handleAddImage = () => {
    setIsAddingImage(true);
    setIsAddingText(false);
    setIsDrawing(false);

    setSelectedTextId(null);
    setSelectedImageId(null);
  };

  // ==========================================
  // IMAGE FILE SELECT
  // ==========================================

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !== 'image/png' &&
      selectedFile.type !== 'image/jpeg'
    ) {
      alert(
        'Please select a PNG or JPG image.',
      );

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        return;
      }

      const image = new Image();

      image.onload = () => {
        const maxWidth = 200;
        const maxHeight = 200;

        let width = image.width;
        let height = image.height;

        if (width > maxWidth) {
          const ratio =
            maxWidth / width;

          width = maxWidth;
          height *= ratio;
        }

        if (height > maxHeight) {
          const ratio =
            maxHeight / height;

          height = maxHeight;
          width *= ratio;
        }

        const newImage: ImageItem = {
          id: Date.now(),
          src: result,
          x: 50,
          y: 50,
          width,
          height,
          pageNumber,
        };

        setImages((current) => [
          ...current,
          newImage,
        ]);

        setSelectedImageId(
          newImage.id,
        );

        setSelectedTextId(null);

        setIsAddingImage(false);
      };

      image.src = result;
    };

    reader.readAsDataURL(selectedFile);

    event.target.value = '';
  };

  // ==========================================
  // SELECT TEXT
  // ==========================================

  const handleSelectText = (
    event: React.MouseEvent<HTMLDivElement>,
    id: number,
  ) => {
    event.stopPropagation();

    if (
      isAddingText ||
      isAddingImage ||
      isDrawing
    ) {
      return;
    }

    setSelectedTextId(id);
    setSelectedImageId(null);
  };

  // ==========================================
  // SELECT IMAGE
  // ==========================================

  const handleSelectImage = (
    event: React.MouseEvent<HTMLImageElement>,
    id: number,
  ) => {
    event.stopPropagation();

    if (
      isAddingText ||
      isAddingImage ||
      isDrawing
    ) {
      return;
    }

    setSelectedImageId(id);
    setSelectedTextId(null);
  };

  // ==========================================
  // START TEXT DRAG
  // ==========================================

  const handleTextMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    id: number,
  ) => {
    event.stopPropagation();

    if (
      isAddingText ||
      isAddingImage ||
      isDrawing
    ) {
      return;
    }

    setSelectedTextId(id);
    setSelectedImageId(null);

    setDraggingId(id);
    setDraggingType('text');
  };

  // ==========================================
  // START IMAGE DRAG
  // ==========================================

  const handleImageMouseDown = (
    event: React.MouseEvent<HTMLImageElement>,
    id: number,
  ) => {
    event.stopPropagation();

    if (
      isAddingText ||
      isAddingImage ||
      isDrawing
    ) {
      return;
    }

    setSelectedImageId(id);
    setSelectedTextId(null);

    setDraggingId(id);
    setDraggingType('image');
  };

  // ==========================================
  // START IMAGE RESIZE
  // ==========================================

  const handleResizeMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    id: number,
  ) => {
    event.stopPropagation();

    setResizingImageId(id);
    setSelectedImageId(id);
    setSelectedTextId(null);
  };

  // ==========================================
  // DRAG / RESIZE
  // ==========================================

  const handleMouseMove = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (isDrawing) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Drag text

    if (
      draggingId !== null &&
      draggingType === 'text'
    ) {
      setTexts((current) =>
        current.map((item) =>
          item.id === draggingId
            ? {
                ...item,
                x,
                y,
              }
            : item,
        ),
      );

      return;
    }

    // Drag image

    if (
      draggingId !== null &&
      draggingType === 'image'
    ) {
      setImages((current) =>
        current.map((item) =>
          item.id === draggingId
            ? {
                ...item,
                x,
                y,
              }
            : item,
        ),
      );

      return;
    }

    // Resize image

    if (resizingImageId !== null) {
      setImages((current) =>
        current.map((item) => {
          if (
            item.id !==
            resizingImageId
          ) {
            return item;
          }

          const newWidth =
            Math.max(
              30,
              x - item.x,
            );

          const aspectRatio =
            item.width /
            item.height;

          const newHeight =
            newWidth /
            aspectRatio;

          return {
            ...item,
            width: newWidth,
            height: newHeight,
          };
        }),
      );
    }
  };

  // ==========================================
  // STOP DRAG
  // ==========================================

  const handleMouseUp = () => {
    setDraggingId(null);
    setDraggingType(null);
    setResizingImageId(null);
  };

  // ==========================================
  // EDIT TEXT
  // ==========================================

  const handleEditText = (
    event: React.MouseEvent<HTMLDivElement>,
    id: number,
  ) => {
    event.stopPropagation();

    const selectedText = texts.find(
      (item) => item.id === id,
    );

    if (!selectedText) {
      return;
    }

    const updatedText = prompt(
      'Edit your text:',
      selectedText.text,
    );

    if (
      updatedText === null ||
      updatedText.trim() === ''
    ) {
      return;
    }

    setTexts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              text: updatedText,
            }
          : item,
      ),
    );
  };

  // ==========================================
  // DELETE TEXT
  // ==========================================

  const handleDeleteText = (
    event: React.MouseEvent<HTMLDivElement>,
    id: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const shouldDelete =
      window.confirm(
        'Are you sure you want to delete this text?',
      );

    if (!shouldDelete) {
      return;
    }

    setTexts((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    );

    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
  };

  // ==========================================
  // DELETE IMAGE
  // ==========================================

  const handleDeleteImage = (
    event: React.MouseEvent<HTMLImageElement>,
    id: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const shouldDelete =
      window.confirm(
        'Are you sure you want to delete this image?',
      );

    if (!shouldDelete) {
      return;
    }

    setImages((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    );

    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

  // ==========================================
  // TEXT FONT SIZE
  // ==========================================

  const handleFontSizeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    if (selectedTextId === null) {
      return;
    }

    const fontSize = Number(
      event.target.value,
    );

    setTexts((current) =>
      current.map((item) =>
        item.id === selectedTextId
          ? {
              ...item,
              fontSize,
            }
          : item,
      ),
    );
  };

  // ==========================================
  // TEXT BOLD
  // ==========================================

  const handleToggleBold = () => {
    if (selectedTextId === null) {
      return;
    }

    setTexts((current) =>
      current.map((item) =>
        item.id === selectedTextId
          ? {
              ...item,
              bold: !item.bold,
            }
          : item,
      ),
    );
  };

  // ==========================================
  // TEXT COLOR
  // ==========================================

  const handleColorChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    if (selectedTextId === null) {
      return;
    }

    const color = event.target.value;

    setTexts((current) =>
      current.map((item) =>
        item.id === selectedTextId
          ? {
              ...item,
              color,
            }
          : item,
      ),
    );
  };

  // ==========================================
  // DELETE SELECTED TEXT
  // ==========================================

  const handleDeleteSelectedText =
    () => {
      if (
        selectedTextId === null
      ) {
        return;
      }

      const shouldDelete =
        window.confirm(
          'Are you sure you want to delete this text?',
        );

      if (!shouldDelete) {
        return;
      }

      setTexts((current) =>
        current.filter(
          (item) =>
            item.id !==
            selectedTextId,
        ),
      );

      setSelectedTextId(null);
    };

  // ==========================================
  // DELETE SELECTED IMAGE
  // ==========================================

  const handleDeleteSelectedImage =
    () => {
      if (
        selectedImageId === null
      ) {
        return;
      }

      const shouldDelete =
        window.confirm(
          'Are you sure you want to delete this image?',
        );

      if (!shouldDelete) {
        return;
      }

      setImages((current) =>
        current.filter(
          (item) =>
            item.id !==
            selectedImageId,
        ),
      );

      setSelectedImageId(null);
    };

  // ==========================================
  // DRAWING MODE
  // ==========================================

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setIsAddingText(false);
    setIsAddingImage(false);

    setSelectedTextId(null);
    setSelectedImageId(null);
  };

  // ==========================================
  // DRAWING START
  // ==========================================

  const handleDrawingStart = (
    event: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) {
      return;
    }

    const canvas =
      drawingCanvasRef.current;

    if (!canvas) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;

    currentStroke.current = [
      {
        x,
        y,
      },
    ];

    setIsCurrentlyDrawing(true);

    const context =
      canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.beginPath();

    context.moveTo(
      x,
      y,
    );
  };

  // ==========================================
  // DRAWING MOVE
  // ==========================================

  const handleDrawingMove = (
    event: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (
      !isDrawing ||
      !isCurrentlyDrawing
    ) {
      return;
    }

    const canvas =
      drawingCanvasRef.current;

    if (!canvas) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;

    currentStroke.current.push({
      x,
      y,
    });

    const context =
      canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.lineTo(
      x,
      y,
    );

    context.stroke();
  };

  // ==========================================
  // DRAWING END
  // ==========================================

  const handleDrawingEnd = () => {
    if (
      !isCurrentlyDrawing
    ) {
      return;
    }

    const points = [
      ...currentStroke.current,
    ];

    if (points.length > 1) {
      const newDrawing: DrawingItem = {
        id: Date.now(),
        points,
        pageNumber,
      };

      setDrawings((current) => [
        ...current,
        newDrawing,
      ]);
    }

    currentStroke.current = [];

    setIsCurrentlyDrawing(false);
  };

  // ==========================================
  // CLEAR CURRENT PAGE DRAWINGS
  // ==========================================

  const handleClearDrawing = () => {
    setDrawings((current) =>
      current.filter(
        (item) =>
          item.pageNumber !==
          pageNumber,
      ),
    );
  };

  // ==========================================
  // EXIT DRAWING MODE
  // ==========================================

  const handleFinishDrawing = () => {
    setIsDrawing(false);
    setIsCurrentlyDrawing(false);
    currentStroke.current = [];
  };

  // ==========================================
  // DRAW EXISTING STROKES
  // ==========================================

  useEffect(() => {
    const canvas =
      drawingCanvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    context.strokeStyle =
      'black';

    context.lineWidth = 2;

    context.lineCap = 'round';

    context.lineJoin = 'round';

    const pageDrawings =
      drawings.filter(
        (item) =>
          item.pageNumber ===
          pageNumber,
      );

    pageDrawings.forEach(
      (drawing) => {
        if (
          drawing.points.length <
          2
        ) {
          return;
        }

        context.beginPath();

        context.moveTo(
          drawing.points[0].x,
          drawing.points[0].y,
        );

        for (
          let index = 1;
          index <
          drawing.points.length;
          index++
        ) {
          context.lineTo(
            drawing.points[index]
              .x,
            drawing.points[index]
              .y,
          );
        }

        context.stroke();
      },
    );
  }, [
    drawings,
    pageNumber,
  ]);

  // ==========================================
  // DOWNLOAD PDF
  // ==========================================

  const handleDownloadPdf =
    async () => {
      try {
        const existingPdfBytes =
          await file.arrayBuffer();

        const pdfDoc =
          await PDFDocument.load(
            existingPdfBytes,
          );

        const regularFont =
          await pdfDoc.embedFont(
            StandardFonts.Helvetica,
          );

        const boldFont =
          await pdfDoc.embedFont(
            StandardFonts.HelveticaBold,
          );

        const pages =
          pdfDoc.getPages();

        // ====================================
        // DRAW TEXT
        // ====================================

        texts.forEach(
          (item) => {
            const pdfPage =
              pages[
                item.pageNumber - 1
              ];

            if (!pdfPage) {
              return;
            }

            const {
              height,
            } =
              pdfPage.getSize();

            const textX =
              item.x / scale;

            const textY =
              height -
              item.y /
                scale -
              item.fontSize;

            const hex =
              item.color.replace(
                '#',
                '',
              );

            const red =
              parseInt(
                hex.substring(
                  0,
                  2,
                ),
                16,
              ) / 255;

            const green =
              parseInt(
                hex.substring(
                  2,
                  4,
                ),
                16,
              ) / 255;

            const blue =
              parseInt(
                hex.substring(
                  4,
                  6,
                ),
                16,
              ) / 255;

            pdfPage.drawText(
              item.text,
              {
                x: textX,
                y: textY,
                size:
                  item.fontSize,
                font:
                  item.bold
                    ? boldFont
                    : regularFont,
                color: rgb(
                  red,
                  green,
                  blue,
                ),
              },
            );
          },
        );

        // ====================================
        // DRAW IMAGES
        // ====================================

        for (
          const item of images
        ) {
          const pdfPage =
            pages[
              item.pageNumber - 1
            ];

          if (!pdfPage) {
            continue;
          }

          const {
            height: pageHeight,
          } =
            pdfPage.getSize();

          let embeddedImage;

          if (
            item.src.startsWith(
              'data:image/png',
            )
          ) {
            embeddedImage =
              await pdfDoc.embedPng(
                item.src,
              );
          } else {
            embeddedImage =
              await pdfDoc.embedJpg(
                item.src,
              );
          }

          const imageWidth =
            item.width /
            scale;

          const imageHeight =
            item.height /
            scale;

          const imageX =
            item.x / scale;

          const imageY =
            pageHeight -
            item.y /
              scale -
            imageHeight;

          pdfPage.drawImage(
            embeddedImage,
            {
              x: imageX,
              y: imageY,
              width:
                imageWidth,
              height:
                imageHeight,
            },
          );
        }

        // ====================================
        // DRAW SIGNATURES
        // ====================================

        for (
          const drawing of drawings
        ) {
          const pdfPage =
            pages[
              drawing.pageNumber - 1
            ];

          if (!pdfPage) {
            continue;
          }

          const {
            height: pageHeight,
          } =
            pdfPage.getSize();

          if (
            drawing.points.length <
            2
          ) {
            continue;
          }

          for (
            let index = 1;
            index <
            drawing.points.length;
            index++
          ) {
            const previous =
              drawing.points[
                index - 1
              ];

            const current =
              drawing.points[
                index
              ];

            const startX =
              previous.x /
              scale;

            const startY =
              pageHeight -
              previous.y /
                scale;

            const endX =
              current.x /
              scale;

            const endY =
              pageHeight -
              current.y /
                scale;

            pdfPage.drawLine(
              {
                start: {
                  x: startX,
                  y: startY,
                },

                end: {
                  x: endX,
                  y: endY,
                },

                thickness: 2,

                color: rgb(
                  0,
                  0,
                  0,
                ),
              },
            );
          }
        }

        // ====================================
        // SAVE
        // ====================================

        const pdfBuffer =
          await pdfDoc.save();
        const pdfArrayBuffer = new ArrayBuffer(
          pdfBuffer.byteLength,
        );
        new Uint8Array(pdfArrayBuffer).set(
          pdfBuffer,
        );

        const blob =
          new Blob(
            [pdfArrayBuffer],
            {
              type:
                'application/pdf',
            },
          );

        const url =
          URL.createObjectURL(
            blob,
          );

        const link =
          document.createElement(
            'a',
          );

        link.href = url;

        link.download =
          'edited-document.pdf';

        link.click();

        URL.revokeObjectURL(
          url,
        );
      } catch (error) {
        console.error(
          'Failed to download PDF:',
          error,
        );

        alert(
          'Failed to download PDF.',
        );
      }
    };

  // ==========================================
  // SELECTED TEXT
  // ==========================================

  const selectedText =
    texts.find(
      (item) =>
        item.id ===
        selectedTextId,
    );

  // ==========================================
  // SELECTED IMAGE
  // ==========================================

  const selectedImage =
    images.find(
      (item) =>
        item.id ===
        selectedImageId,
    );

  // ==========================================
  // UI
  // ==========================================

  return (
    <div>
      {/* ======================================
          MAIN TOOLBAR
      ====================================== */}

      <div
        style={{
          display:
            'flex',
          alignItems:
            'center',
          gap:
            '10px',
          marginBottom:
            '20px',
          flexWrap:
            'wrap',
        }}
      >
        <button
          onClick={
            previousPage
          }
          disabled={
            pageNumber ===
            1
          }
        >
          Previous
        </button>

        <span>
          Page{' '}
          {pageNumber}{' '}
          of{' '}
          {numPages}
        </span>

        <button
          onClick={
            nextPage
          }
          disabled={
            pageNumber ===
            numPages
          }
        >
          Next
        </button>

        <button
          onClick={
            zoomOut
          }
        >
          -
        </button>

        <span>
          {Math.round(
            scale * 100,
          )}
          %
        </span>

        <button
          onClick={
            zoomIn
          }
        >
          +
        </button>

        <button
          onClick={
            handleAddText
          }
        >
          Add Text
        </button>

        <button
          onClick={
            handleAddImage
          }
        >
          Add Image
        </button>

        <button
          onClick={
            handleStartDrawing
          }
        >
          Draw / Signature
        </button>

        <button
          onClick={
            handleDownloadPdf
          }
        >
          Download PDF
        </button>
      </div>

      {/* ======================================
          IMAGE FILE INPUT
      ====================================== */}

      {isAddingImage && (
        <div
          style={{
            marginBottom:
              '20px',
          }}
        >
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={
              handleImageFileChange
            }
          />

          <button
            onClick={() =>
              setIsAddingImage(
                false,
              )
            }
            style={{
              marginLeft:
                '10px',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ======================================
          DRAWING TOOLBAR
      ====================================== */}

      {isDrawing && (
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap:
              '10px',
            marginBottom:
              '20px',
            padding:
              '10px',
            border:
              '1px solid #ccc',
            borderRadius:
              '5px',
          }}
        >
          <strong>
            Drawing Mode
          </strong>

          <button
            onClick={
              handleClearDrawing
            }
          >
            Clear Page
          </button>

          <button
            onClick={
              handleFinishDrawing
            }
          >
            Done
          </button>
        </div>
      )}

      {/* ======================================
          TEXT FORMATTING
      ====================================== */}

      {selectedText && (
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap:
              '10px',
            marginBottom:
              '20px',
            padding:
              '10px',
            border:
              '1px solid #ccc',
            borderRadius:
              '5px',
            flexWrap:
              'wrap',
          }}
        >
          <strong>
            Text Formatting:
          </strong>

          <label>
            Size:{' '}

            <select
              value={
                selectedText.fontSize
              }
              onChange={
                handleFontSizeChange
              }
            >
              <option value="12">
                12
              </option>

              <option value="16">
                16
              </option>

              <option value="18">
                18
              </option>

              <option value="20">
                20
              </option>

              <option value="24">
                24
              </option>

              <option value="32">
                32
              </option>

              <option value="40">
                40
              </option>
            </select>
          </label>

          <button
            onClick={
              handleToggleBold
            }
            style={{
              fontWeight:
                'bold',

              backgroundColor:
                selectedText.bold
                  ? '#ddd'
                  : 'white',
            }}
          >
            B
          </button>

          <label>
            Color:{' '}

            <select
              value={
                selectedText.color
              }
              onChange={
                handleColorChange
              }
            >
              <option value="#000000">
                Black
              </option>

              <option value="#ff0000">
                Red
              </option>

              <option value="#0000ff">
                Blue
              </option>

              <option value="#008000">
                Green
              </option>

              <option value="#800080">
                Purple
              </option>
            </select>
          </label>

          <button
            onClick={
              handleDeleteSelectedText
            }
          >
            Delete
          </button>
        </div>
      )}

      {/* ======================================
          IMAGE TOOLBAR
      ====================================== */}

      {selectedImage && (
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap:
              '10px',
            marginBottom:
              '20px',
            padding:
              '10px',
            border:
              '1px solid #ccc',
            borderRadius:
              '5px',
            flexWrap:
              'wrap',
          }}
        >
          <strong>
            Image Selected
          </strong>

          <span>
            Size:{' '}
            {Math.round(
              selectedImage.width,
            )}
            x
            {Math.round(
              selectedImage.height,
            )}
          </span>

          <button
            onClick={
              handleDeleteSelectedImage
            }
          >
            Delete
          </button>
        </div>
      )}

      {/* ======================================
          INSTRUCTIONS
      ====================================== */}

      {isAddingText && (
        <p>
          Click anywhere on the PDF
          to place your text.
        </p>
      )}

      {isAddingImage && (
        <p>
          Select a JPG or PNG image.
        </p>
      )}

      {isDrawing && (
        <p>
          Draw your signature using
          your mouse inside the PDF.
        </p>
      )}

      {/* ======================================
          PDF CONTAINER
      ====================================== */}

      <div
        style={{
          position:
            'relative',

          display:
            'inline-block',
        }}
      >
        <Document
          file={file}
          onLoadSuccess={
            onDocumentLoadSuccess
          }
        >
          <Page
            pageNumber={
              pageNumber
            }
            scale={
              scale
            }
          />
        </Document>

        {/* ====================================
            OVERLAY
        ==================================== */}

        <div
          onClick={
            handleAddTextToPdf
          }
          onMouseMove={
            handleMouseMove
          }
          onMouseUp={
            handleMouseUp
          }
          onMouseLeave={
            handleMouseUp
          }
          style={{
            position:
              'absolute',

            top: 0,

            left: 0,

            width:
              '100%',

            height:
              '100%',

            cursor:
              isAddingText
                ? 'crosshair'
                : isDrawing
                  ? 'crosshair'
                  : 'default',
          }}
        >
          {/* ==================================
              TEXT
          ================================== */}

          {texts
            .filter(
              (item) =>
                item.pageNumber ===
                pageNumber,
            )
            .map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  onMouseDown={(
                    event,
                  ) =>
                    handleTextMouseDown(
                      event,
                      item.id,
                    )
                  }
                  onClick={(
                    event,
                  ) =>
                    handleSelectText(
                      event,
                      item.id,
                    )
                  }
                  onDoubleClick={(
                    event,
                  ) =>
                    handleEditText(
                      event,
                      item.id,
                    )
                  }
                  onContextMenu={(
                    event,
                  ) =>
                    handleDeleteText(
                      event,
                      item.id,
                    )
                  }
                  style={{
                    position:
                      'absolute',

                    left:
                      item.x,

                    top:
                      item.y,

                    fontSize:
                      `${item.fontSize}px`,

                    fontWeight:
                      item.bold
                        ? 'bold'
                        : 'normal',

                    color:
                      item.color,

                    cursor:
                      'move',

                    userSelect:
                      'none',

                    backgroundColor:
                      selectedTextId ===
                      item.id
                        ? 'rgba(0, 123, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.5)',

                    border:
                      selectedTextId ===
                      item.id
                        ? '1px dashed #007bff'
                        : '1px solid transparent',

                    padding:
                      '2px 4px',
                  }}
                >
                  {
                    item.text
                  }
                </div>
              ),
            )}

          {/* ==================================
              IMAGES
          ================================== */}

          {images
            .filter(
              (item) =>
                item.pageNumber ===
                pageNumber,
            )
            .map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  style={{
                    position:
                      'absolute',

                    left:
                      item.x,

                    top:
                      item.y,

                    width:
                      item.width,

                    height:
                      item.height,

                    border:
                      selectedImageId ===
                      item.id
                        ? '2px dashed #007bff'
                        : '2px solid transparent',
                  }}
                >
                  <img
                    src={
                      item.src
                    }
                    alt="PDF overlay"
                    onMouseDown={(
                      event,
                    ) =>
                      handleImageMouseDown(
                        event,
                        item.id,
                      )
                    }
                    onClick={(
                      event,
                    ) =>
                      handleSelectImage(
                        event,
                        item.id,
                      )
                    }
                    onContextMenu={(
                      event,
                    ) =>
                      handleDeleteImage(
                        event,
                        item.id,
                      )
                    }
                    draggable={
                      false
                    }
                    style={{
                      width:
                        '100%',

                      height:
                        '100%',

                      objectFit:
                        'contain',

                      cursor:
                        'move',

                      display:
                        'block',

                      userSelect:
                        'none',
                    }}
                  />

                  {/* Resize handle */}

                  {selectedImageId ===
                    item.id && (
                    <div
                      onMouseDown={(
                        event,
                      ) =>
                        handleResizeMouseDown(
                          event,
                          item.id,
                        )
                      }
                      style={{
                        position:
                          'absolute',

                        right:
                          '-6px',

                        bottom:
                          '-6px',

                        width:
                          '12px',

                        height:
                          '12px',

                        background:
                          '#007bff',

                        cursor:
                          'nwse-resize',

                        borderRadius:
                          '2px',
                      }}
                    />
                  )}
                </div>
              ),
            )}

          {/* ==================================
              DRAWING CANVAS
          ================================== */}

          {isDrawing && (
            <canvas
              ref={
                drawingCanvasRef
              }
              width={
                1000
              }
              height={
                1400
              }
              onMouseDown={
                handleDrawingStart
              }
              onMouseMove={
                handleDrawingMove
              }
              onMouseUp={
                handleDrawingEnd
              }
              onMouseLeave={
                handleDrawingEnd
              }
              style={{
                position:
                  'absolute',

                top: 0,

                left: 0,

                width:
                  '100%',

                height:
                  '100%',

                cursor:
                  'crosshair',

                zIndex:
                  10,
              }}
            />
          )}
        </div>
      </div>

      {/* ======================================
          INSTRUCTIONS
      ====================================== */}

      <div
        style={{
          marginTop:
            '20px',
        }}
      >
        <p>
          <strong>
            Instructions:
          </strong>
        </p>

        <ul>
          <li>
            Add Text → click PDF.
          </li>

          <li>
            Click text to select.
          </li>

          <li>
            Drag text to move.
          </li>

          <li>
            Double-click text to edit.
          </li>

          <li>
            Right-click text to delete.
          </li>

          <li>
            Add Image → select JPG/PNG.
          </li>

          <li>
            Drag image to move.
          </li>

          <li>
            Drag blue corner to resize.
          </li>

          <li>
            Right-click image to delete.
          </li>

          <li>
            Draw / Signature → draw
            with your mouse.
          </li>

          <li>
            Clear Page → remove
            drawings on current page.
          </li>

          <li>
            Download PDF → save all
            changes into the PDF.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default PdfViewer;