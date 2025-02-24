import React, { useState } from 'react';
import { FileText, Lock, Link as LinkIcon, Download } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import html2pdf from 'html2pdf.js';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const convertToPDF = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate URL
      if (!url) {
        throw new Error('Please enter a valid URL');
      }

      // Fetch webpage content
      const response = await axios.get(url);
      const content = response.data;

      // Convert HTML to PDF
      const pdfBlob = await html2pdf()
        .set({
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
        })
        .from(content)
        .outputPdf('blob');

      // If passkey is provided, encrypt the PDF
      if (passkey) {
        const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());
        await pdfDoc.encrypt({ userPassword: passkey, ownerPassword: passkey });
        const encryptedPdfBytes = await pdfDoc.save();
        
        // Create download link for encrypted PDF
        const blob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'encrypted-document.pdf';
        link.click();
      } else {
        // Create download link for non-encrypted PDF
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'document.pdf';
        link.click();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <FileText className="w-12 h-12 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-800 ml-3">URL to PDF Converter</h1>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <LinkIcon className="w-4 h-4 mr-2" />
                Website URL
              </div>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                PDF Passkey (Optional)
              </div>
            </label>
            <input
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Enter passkey to encrypt PDF"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={convertToPDF}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Convert & Download PDF</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Enter a publicly accessible URL to convert it into a PDF.
            {passkey && " The PDF will be encrypted with your passkey."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;

