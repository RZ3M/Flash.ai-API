const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text content from different file types
 */
const extractTextFromFile = async (file) => {
  try {
    switch (file.mimetype) {
      case 'application/pdf':
        const pdfData = await pdfParse(file.buffer);
        return pdfData.text;

      case 'text/plain':
        return file.buffer.toString('utf-8');

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;

      case 'application/msword': // .doc
        throw new Error('Legacy .doc files are not supported. Please convert to .docx');

      default:
        throw new Error(`Unsupported file type: ${file.mimetype}`);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
};

module.exports = {
  extractTextFromFile
};
