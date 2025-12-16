import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { CreateClientRequest } from '../../models/client.models';

@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  /**
   * Generate Excel template file with required fields marked
   */
  generateTemplate(): void {
    // Create header row with * indicating required fields
    const headers = [
      'Name*',
      'Description',
      'Industry',
      'Website',
      'Primary Contact Name*',
      'Primary Contact Email*',
    ];

    const templateData = [
      headers, // First row is headers
      [
        'Example Client 1',
        'Sample client description',
        'Technology',
        'https://example.com',
        'John Doe',
        'john@example.com',
      ],
      [
        'Example Client 2',
        'Another sample client',
        'Retail',
        '',
        'Jane Smith',
        'jane@example.com',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');

    // Style header row (bold)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'FFE0E0E0' } },
      };
    }

    // Set column widths
    const colWidths = [
      { wch: 25 }, // Name
      { wch: 40 }, // Description
      { wch: 20 }, // Industry
      { wch: 30 }, // Website
      { wch: 25 }, // Primary Contact Name
      { wch: 30 }, // Primary Contact Email
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'client-upload-template.xlsx');
  }

  /**
   * Parse Excel file and extract client data
   * Validates that required fields (Name, Primary Contact Name, Primary Contact Email) are present
   */
  parseExcelFile(file: File): Promise<CreateClientRequest[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Parse as array of arrays to handle header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Get as array of arrays
            defval: null,
          });

          // Skip header row (first row) and filter empty rows
          const dataRows = jsonData.slice(1).filter((row: any) => {
            // Skip empty rows
            return row && row.length > 0 && row[0] !== null && String(row[0]).trim() !== '';
          });

          const clients: CreateClientRequest[] = dataRows.map((row: any) => {
            const client: CreateClientRequest = {
              name: this.trimValue(row[0]) || '', // Name (required - validation will catch empty)
              description: this.trimValue(row[1]), // Description
              industry: this.trimValue(row[2]), // Industry
              website: this.trimValue(row[3]), // Website
              primaryContactName: this.trimValue(row[4]) || '', // Primary Contact Name (required for bulk - validation will catch empty)
              primaryContactEmail: this.trimValue(row[5]) || '', // Primary Contact Email (required for bulk - validation will catch empty)
            };

            // Remove undefined values for optional fields only
            if (client.description === undefined) {
              delete client.description;
            }
            if (client.industry === undefined) {
              delete client.industry;
            }
            if (client.website === undefined) {
              delete client.website;
            }

            return client;
          });

          // Validate clients - required fields for bulk upload
          const errors: string[] = [];
          clients.forEach((client, index) => {
            const rowNumber = index + 2; // +2 because we skip header and arrays are 0-indexed

            // Name validation (required)
            if (!client.name || client.name.trim() === '') {
              errors.push(`Row ${rowNumber}: Name is required`);
            }
            if (client.name && client.name.length > 200) {
              errors.push(`Row ${rowNumber}: Name must not exceed 200 characters`);
            }
            if (client.name && client.name.length < 2) {
              errors.push(`Row ${rowNumber}: Name must be at least 2 characters`);
            }

            // Primary Contact Name validation (required for bulk upload)
            if (!client.primaryContactName || client.primaryContactName.trim() === '') {
              errors.push(`Row ${rowNumber}: Primary Contact Name is required for bulk upload`);
            }
            if (client.primaryContactName && client.primaryContactName.length > 100) {
              errors.push(`Row ${rowNumber}: Primary Contact Name must not exceed 100 characters`);
            }

            // Primary Contact Email validation (required for bulk upload)
            if (!client.primaryContactEmail || client.primaryContactEmail.trim() === '') {
              errors.push(`Row ${rowNumber}: Primary Contact Email is required for bulk upload`);
            }
            if (client.primaryContactEmail && !this.isValidEmail(client.primaryContactEmail)) {
              errors.push(`Row ${rowNumber}: Primary Contact Email must be a valid email address`);
            }
            if (client.primaryContactEmail && client.primaryContactEmail.length > 255) {
              errors.push(`Row ${rowNumber}: Primary Contact Email must not exceed 255 characters`);
            }

            // Optional field validations
            if (client.description && client.description.length > 1000) {
              errors.push(`Row ${rowNumber}: Description must not exceed 1000 characters`);
            }
            if (client.industry && client.industry.length > 100) {
              errors.push(`Row ${rowNumber}: Industry must not exceed 100 characters`);
            }
            if (client.website && client.website.trim() !== '') {
              if (!this.isValidUrl(client.website)) {
                errors.push(`Row ${rowNumber}: Website must be a valid URL`);
              }
              if (client.website.length > 200) {
                errors.push(`Row ${rowNumber}: Website must not exceed 200 characters`);
              }
            }
          });

          if (errors.length > 0) {
            reject(new Error(errors.join('\n')));
          } else {
            resolve(clients);
          }
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private trimValue(value: any): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const trimmed = String(value).trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

