import { useState } from 'react';
import PdfUploader from './components/PdfUploader';
import PdfViewer from './components/PdfViewer';

function App() {
  const [pdfFile, setPdfFile] =
    useState<File | null>(null);

  return (
    <div>
      <h1>PDF Editor</h1>

      <PdfUploader
        onFileSelect={setPdfFile}
      />

      {pdfFile && (
        <div>
          <p>
            Selected file: {pdfFile.name}
          </p>

          <PdfViewer file={pdfFile} />
        </div>
      )}
    </div>
  );
}

export default App;