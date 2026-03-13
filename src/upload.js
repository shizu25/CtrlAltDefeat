export async function extractTextFromUpload(file) {
  if (!file) return '';

  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json') {
    return file.text();
  }

  if (ext === 'pdf') {
    throw new Error('PDF parsing is not configured in this build yet. Export the file as .txt and upload again.');
  }

  if (ext === 'docx') {
    throw new Error('DOCX parsing is not configured in this build yet. Export the file as .txt and upload again.');
  }

  return file.text();
}
