import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

export default function TableExportButtons({ data, headers, title, onExportCSV }) {
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    
    // Add table manually
    doc.setFontSize(9);
    let yPosition = 32;
    
    // Add headers
    doc.setFont(undefined, 'bold');
    let xPosition = 14;
    headers.forEach((header, idx) => {
      doc.text(header, xPosition, yPosition);
      xPosition += 60;
    });
    
    // Add data rows
    doc.setFont(undefined, 'normal');
    yPosition += 7;
    data.forEach((row) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 15;
      }
      xPosition = 14;
      row.forEach((cell) => {
        doc.text(String(cell).substring(0, 30), xPosition, yPosition);
        xPosition += 60;
      });
      yPosition += 7;
    });
    
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex gap-2">
      {onExportCSV && (
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleExportPDF}>
        <FileText className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
}