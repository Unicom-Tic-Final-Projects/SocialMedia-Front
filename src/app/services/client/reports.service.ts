import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';

export interface ReportRequest {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  platform?: string;
  format?: 'pdf' | 'csv' | 'xlsx';
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Generate daily report
   */
  generateDailyReport(request: ReportRequest): Observable<Blob> {
    let params = new HttpParams().set('period', 'daily');
    if (request.startDate) params = params.set('startDate', request.startDate);
    if (request.endDate) params = params.set('endDate', request.endDate);
    if (request.clientId) params = params.set('clientId', request.clientId);
    if (request.platform) params = params.set('platform', request.platform);
    if (request.format) params = params.set('format', request.format);

    return this.http.get(`${this.baseUrl}/api/reports/daily`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to generate daily report', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Generate weekly report
   */
  generateWeeklyReport(request: ReportRequest): Observable<Blob> {
    let params = new HttpParams().set('period', 'weekly');
    if (request.startDate) params = params.set('startDate', request.startDate);
    if (request.endDate) params = params.set('endDate', request.endDate);
    if (request.clientId) params = params.set('clientId', request.clientId);
    if (request.platform) params = params.set('platform', request.platform);
    if (request.format) params = params.set('format', request.format);

    return this.http.get(`${this.baseUrl}/api/reports/weekly`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to generate weekly report', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Generate monthly report
   */
  generateMonthlyReport(request: ReportRequest): Observable<Blob> {
    let params = new HttpParams().set('period', 'monthly');
    if (request.startDate) params = params.set('startDate', request.startDate);
    if (request.endDate) params = params.set('endDate', request.endDate);
    if (request.clientId) params = params.set('clientId', request.clientId);
    if (request.platform) params = params.set('platform', request.platform);
    if (request.format) params = params.set('format', request.format);

    return this.http.get(`${this.baseUrl}/api/reports/monthly`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to generate monthly report', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Generate custom date range report
   */
  generateCustomReport(request: ReportRequest): Observable<Blob> {
    let params = new HttpParams();
    if (request.startDate) params = params.set('startDate', request.startDate);
    if (request.endDate) params = params.set('endDate', request.endDate);
    if (request.clientId) params = params.set('clientId', request.clientId);
    if (request.platform) params = params.set('platform', request.platform);
    if (request.format) params = params.set('format', request.format || 'pdf');

    return this.http.get(`${this.baseUrl}/api/reports/custom`, { params, responseType: 'blob' }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to generate custom report', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get report templates
   */
  getReportTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/reports/templates`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load report templates', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Schedule automated reports
   */
  scheduleReport(request: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/reports/schedule`, request).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to schedule report', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get scheduled reports
   */
  getScheduledReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/reports/scheduled`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load scheduled reports', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete scheduled report
   */
  deleteScheduledReport(reportId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/reports/scheduled/${reportId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to delete scheduled report', error, 'ReportsService');
        return throwError(() => error);
      }),
    );
  }
}
