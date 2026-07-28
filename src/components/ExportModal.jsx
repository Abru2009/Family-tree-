import React, { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { Download, FileText, Image as ImageIcon, Table, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ExportModal = ({ onClose }) => {
  const { data } = useFamily();
  const [exporting, setExporting] = useState(false);

  // 1. Export as High-Res PNG
  const handleExportPNG = async () => {
    try {
      setExporting(true);
      const viewportEl = document.querySelector('.react-flow__viewport');
      if (!viewportEl) {
        alert('Could not capture family tree view');
        return;
      }

      const canvas = await html2canvas(viewportEl, {
        backgroundColor: '#0a1223',
        scale: 2, // High resolution
        useCORS: true,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `family_tree_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Failed to export PNG image');
    } finally {
      setExporting(false);
      onClose();
    }
  };

  // 2. Export as Print-Friendly PDF
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const viewportEl = document.querySelector('.react-flow__viewport');
      if (!viewportEl) {
        alert('Could not capture family tree view');
        return;
      }

      const canvas = await html2canvas(viewportEl, {
        backgroundColor: '#0a1223',
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`family_tree_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF file');
    } finally {
      setExporting(false);
      onClose();
    }
  };

  // 3. Export Data as CSV
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Name', 'Gender', 'BirthDate', 'DeathDate', 'FamilyHeritage', 'Phone', 'Email', 'Occupation', 'Company', 'Address', 'Location', 'Notes'];
      const rows = data.members.map(m => [
        m.id,
        `"${m.name || ''}"`,
        m.gender || '',
        m.birthDate || '',
        m.deathDate || '',
        `"${m.heritage || ''}"`,
        `"${m.phone || ''}"`,
        `"${m.email || ''}"`,
        `"${m.occupation || ''}"`,
        `"${m.company || ''}"`,
        `"${m.address || ''}"`,
        `"${m.location || ''}"`,
        `"${m.notes || ''}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `family_tree_members_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('Failed to export CSV file');
    } finally {
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10, 18, 35, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: 420,
        padding: 24, borderRadius: 20,
        position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Download size={22} color="var(--accent-color)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Export Family Tree
          </h2>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Choose your preferred format to export or save your family tree data.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* PNG */}
          <button
            onClick={handleExportPNG}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(69, 183, 174, 0.08)',
              border: '1px solid rgba(69, 183, 174, 0.25)',
              color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <ImageIcon size={24} color="#45b7ae" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>High-Res Image (PNG)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Best for sharing & social media</div>
            </div>
          </button>

          {/* PDF */}
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(69, 183, 174, 0.08)',
              border: '1px solid rgba(69, 183, 174, 0.25)',
              color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <FileText size={24} color="#e0899a" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>PDF Document</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Print-friendly document format</div>
            </div>
          </button>

          {/* CSV */}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(69, 183, 174, 0.08)',
              border: '1px solid rgba(69, 183, 174, 0.25)',
              color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <Table size={24} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>CSV Spreadsheet</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Raw member data for Excel / Google Sheets</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
