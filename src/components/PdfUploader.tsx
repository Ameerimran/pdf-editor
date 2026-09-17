interface PdfUploaderProps {
  onFileSelect: (file: File) => void;
}

function PdfUploader({
  onFileSelect,
}: PdfUploaderProps) {
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (
      file &&
      file.type === 'application/pdf'
    ) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default PdfUploader;