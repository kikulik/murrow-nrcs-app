// src/services/PrintService.js
// Service for printing and export functionality
export class PrintService {
    static printRundownList(rundown) {
        const printWindow = window.open('', '_blank');
        const currentDate = new Date().toLocaleDateString();
        const totalDuration = rundown.items ?
            this.formatDuration(this.calculateTotalDuration(rundown.items)) : '00:00';

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rundown List - ${rundown.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .meta { margin-bottom: 20px; }
          .rundown-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .rundown-table th, .rundown-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .rundown-table th { background-color: #f0f0f0; font-weight: bold; }
          .item-types { font-size: 0.8em; }
          .status { font-size: 0.8em; font-weight: bold; }
          .break-row { background-color: #f9f9f9; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${rundown.name}</h1>
          <div class="meta">
            <p>Date: ${currentDate} | Total Duration: ${totalDuration}</p>
          </div>
        </div>
        
        <table class="rundown-table">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th style="width: 80px;">Time</th>
              <th>Title</th>
              <th style="width: 80px;">Duration</th>
              <th style="width: 100px;">Type</th>
              <th style="width: 100px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rundown.items.map((item, index) => `
              <tr class="${item.type?.includes('BRK') ? 'break-row' : ''}">
                <td>${index + 1}</td>
                <td>${item.time || '00:00:00'}</td>
                <td>${item.title}</td>
                <td>${item.duration}</td>
                <td class="item-types">${Array.isArray(item.type) ? item.type.join(', ') : item.type || ''}</td>
                <td class="status">${item.storyStatus || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; margin-right: 10px;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px;">Close</button>
        </div>
      </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    }

    static generateRTF(rundown) {
        const rtfHeader = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Sylfaen;}{\\f1\\fnil\\fcharset204 Sylfaen;}}\\uc1 `;
        const rtfFooter = `}`;

        let rtfContent = rtfHeader;
        rtfContent += `\\f1\\fs28\\b ${this.escapeRTFText(rundown.name)}\\b0\\par\\par`;

        rundown.items.forEach((item, index) => {
            rtfContent += `\\fs28\\b ${index + 1}. ${this.escapeRTFText(item.title)} (${item.duration})\\b0\\par\\par`;

            if (item.content) {
                rtfContent += `\\fs28 ${this.escapeRTFText(item.content)}\\par\\par`;
            } else {
                rtfContent += `\\fs28\\i [No script content for this item]\\i0\\par\\par`;
            }

            if (index < rundown.items.length - 1) {
                rtfContent += `\\page`;
            }
        });

        rtfContent += rtfFooter;
        return rtfContent;
    }

    static escapeRTFText(text) {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/[\u0080-\uFFFF]/g, (match) => {
                const code = match.charCodeAt(0);
                return `\\u${code}?`;
            });
    }

    static downloadRTF(rundown) {
        const rtfContent = this.generateRTF(rundown);
        const blob = new Blob([rtfContent], { type: 'application/rtf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${rundown.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.rtf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    static formatDuration(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    static calculateTotalDuration(items) {
        if (!Array.isArray(items)) return 0;
        return items.reduce((total, item) => {
            const duration = item.duration || '00:00';
            const parts = duration.split(':').map(Number);
            if (parts.length === 2) return total + parts[0] * 60 + parts[1];
            return total;
        }, 0);
    }
}