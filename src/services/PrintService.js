// src/services/PrintService.js
// Service for printing and export functionality
export class PrintService {
  static printForPresenter(rundown) {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString();

    printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Presenter Script - ${rundown.name}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        line-height: 1.6;
                        font-size: 14pt;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 15px; 
                        font-size: 16pt;
                    }
                    .item { 
                        margin-bottom: 40px; 
                        page-break-inside: avoid;
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 20px;
                    }
                    .item-header {
                        background-color: #f0f0f0;
                        padding: 10px;
                        margin-bottom: 15px;
                        border-left: 4px solid #333;
                    }
                    .item-title { 
                        font-size: 18pt;
                        margin-bottom: 10px;
                    }
                    .item-content { 
                        font-size: 20pt;
                        line-height: 1.8;
                        margin: 15px 0;
                        padding: 10px;
                        background-color: #f9f9f9;
                    }
                    .live-item {
                        background-color: #ffe6e6;
                        border-left-color: #ff0000;
                    }
                    .break-item {
                        background-color: #fff3cd;
                        border-left-color: #ffc107;
                    }
                    @media print {
                        body { margin: 0; font-size: 12pt; }
                        .no-print { display: none; }
                        .item { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${rundown.name}</h1>
                    <p>Presenter Script - ${currentDate}</p>
                </div>
                
                ${rundown.items.map((item, index) => `
                    <div class="item">
                        <div class="item-header ${item.type?.includes('LV') ? 'live-item' : ''} ${item.type?.includes('BRK') ? 'break-item' : ''}">
                            <div class="item-title">${index + 1}. ${item.title}</div>
                        </div>
                        <div class="item-content">
                            ${item.content || '[No script content available for this item]'}
                        </div>
                    </div>
                `).join('')}
                
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; margin-right: 10px; font-size: 14pt;">Print</button>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 14pt;">Close</button>
                </div>
            </body>
            </html>
        `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  static printRundownList(rundown, airTime = '12:00') {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString();
    const totalDuration = rundown.items ?
      PrintService.formatDuration(PrintService.calculateTotalDuration(rundown.items)) : '00:00';

    const itemsWithTime = PrintService.calculateRundownTimes(rundown.items, airTime);

    printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rundown List - ${rundown.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 10px; 
                    }
                    .meta { margin-bottom: 20px; }
                    .rundown-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 20px; 
                    }
                    .rundown-table th, .rundown-table td { 
                        border: 1px solid #000; 
                        padding: 8px; 
                        text-align: left; 
                    }
                    .rundown-table th { 
                        background-color: #f0f0f0; 
                        font-weight: bold; 
                    }
                    .item-types { font-size: 0.8em; }
                    .status { font-size: 0.8em; font-weight: bold; }
                    .break-row { background-color: #f9f9f9; }
                    .live-row { background-color: #ffe6e6; }
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
                        <p>Date: ${currentDate} | Air Time: ${airTime} | Total Duration: ${totalDuration}</p>
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
                        ${itemsWithTime.map((item, index) => `
                            <tr class="${item.type?.includes('BRK') ? 'break-row' : ''} ${item.type?.includes('LV') ? 'live-row' : ''}">
                                <td>${index + 1}</td>
                                <td>${item.calculatedTime}</td>
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

  static calculateRundownTimes(items, airTime) {
    if (!Array.isArray(items)) return [];

    const [hours, minutes] = airTime.split(':').map(Number);
    let currentTimeInMinutes = hours * 60 + minutes;

    return items.map(item => {
      const itemStartTime = PrintService.minutesToTimeString(currentTimeInMinutes);
      const durationInMinutes = PrintService.parseDuration(item.duration);
      currentTimeInMinutes += durationInMinutes;

      return {
        ...item,
        calculatedTime: itemStartTime
      };
    });
  }

  static minutesToTimeString(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  static parseDuration(durationStr) {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }

  static generateRTF(rundown) {
    const rtfHeader = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\\uc1 `;
    const rtfFooter = `}`;

    let rtfContent = rtfHeader;

    rundown.items.forEach((item, index) => {
      rtfContent += `\\f0\\fs24 ${index + 1}. ${PrintService.escapeRTFText(item.title)}\\par\\par`;

      if (item.content && item.content.trim()) {
        rtfContent += `\\fs24 ${PrintService.escapeRTFText(item.content)}\\par\\par`;
      } else {
        rtfContent += `\\fs24 [No script content for this item]\\par\\par`;
      }

      if (index < rundown.items.length - 1) {
        rtfContent += `\\page `;
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
      .replace(/\n/g, '\\par ')
      .replace(/\r/g, '')
      .replace(/[\u0080-\uFFFF]/g, (match) => {
        const code = match.charCodeAt(0);
        return `\\u${code}?`;
      });
  }

  static downloadRTF(rundown) {
    const rtfContent = PrintService.generateRTF(rundown);
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
