import React, { useState, useEffect } from 'react';
import { FileText, Lock, Link as LinkIcon, Download, Eye } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import html2pdf from 'html2pdf.js';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPreview = async (url: string) => {
    try {
      setPreviewLoading(true);
      setError('');

      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'text/html'
        }
      });

      // Create a temporary container and inject the content
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = response.data;

      // Extract and inject styles
      const styles = tempContainer.getElementsByTagName('style');
      const styleLinks = tempContainer.getElementsByTagName('link');
      let styleContent = '';

      // Collect inline styles
      Array.from(styles).forEach(style => {
        styleContent += style.innerHTML;
      });

      // Collect external stylesheets
      Array.from(styleLinks).forEach(link => {
        if (link.rel === 'stylesheet' && link.href) {
          styleContent += `@import url('${link.href}');`;
        }
      });

      // Find the main content
      let mainContent = tempContainer.querySelector('main') || 
                       tempContainer.querySelector('.main') ||
                       tempContainer.querySelector('#content') ||
                       tempContainer.querySelector('.content') ||
                       tempContainer.body;

      if (mainContent) {
        // Create a styled preview
        setPreview(`
          <style>
            ${styleContent}
            .preview-container {
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              max-height: 500px;
              overflow-y: auto;
            }
            .preview-container img {
              max-width: 100%;
              height: auto;
            }
          </style>
          <div class="preview-container">
            ${mainContent.innerHTML}
          </div>
        `);
      } else {
        throw new Error('Could not find main content in the webpage');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      setPreview('');
    } finally {
      setPreviewLoading(false);
    }
  };

  const convertToPDF = async () => {
    try {
      setLoading(true);
      setError('');

      if (!url) {
        throw new Error('Please enter a valid URL');
      }

      try {
        new URL(url);
      } catch {
        throw new Error('Please enter a valid URL format (e.g., https://example.com)');
      }

      // Use the preview content for PDF generation if available
      const contentToConvert = preview || await (async () => {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await axios.get(proxyUrl, {
          timeout: 10000,
          headers: {
            'Accept': 'text/html'
          }
        });
        return response.data;
      })();

      // Create a temporary container with proper styling
      const container = document.createElement('div');
      container.innerHTML = contentToConvert;
      container.style.width = '800px'; // Fixed width for better rendering
      container.style.margin = '0 auto';
      container.style.padding = '20px';
      document.body.appendChild(container);

      // Convert HTML to PDF with enhanced options
      const pdfBlob = await html2pdf().set({
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          letterRendering: true,
          width: 800, // Match container width
          windowWidth: 800,
        },
        jsPDF: {
          unit: 'pt',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
          hotfixes: ['px_scaling']
        },
        filename: 'webpage.pdf'
      }).from(container).outputPdf('blob');

      document.body.removeChild(container);

      if (passkey) {
        const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());
        await pdfDoc.encrypt({
          userPassword: passkey,
          ownerPassword: passkey,
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: false,
            fillingForms: false,
            contentAccessibility: true,
            documentAssembly: false
          }
        });
        const encryptedPdfBytes = await pdfDoc.save();
        
        const downloadUrl = window.URL.createObjectURL(new Blob([encryptedPdfBytes], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${new URL(url).hostname}-encrypted.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        const downloadUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${new URL(url).hostname}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('PDF conversion error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while converting the webpage to PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6">
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
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <button
                  onClick={() => url && fetchPreview(url)}
                  disabled={!url || previewLoading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-500 border-t-transparent" />
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      <span>Preview</span>
                    </>
                  )}
                </button>
              </div>
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
              disabled={loading || !url}
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

            <div className="space-y-2">
              <p className="text-xs text-gray-500 text-center">
                Enter a publicly accessible URL to convert it into a PDF.
                {passkey && " The PDF will be encrypted with your passkey."}
              </p>
              <p className="text-xs text-gray-500 text-center">
                Note: Some websites may block content from being converted due to their security settings.
              </p>
            </div>
          </div>
        </div>

        {preview && (
          <div className="bg-white rounded-xl shadow-xl p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <div 
              className="preview-wrapper"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
