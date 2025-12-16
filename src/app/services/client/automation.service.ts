import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { LoggingService } from '../../core/services/logging.service';

export interface AutomationRule {
  id?: string;
  name: string;
  trigger: string;
  conditions?: any;
  actions?: any[];
  enabled?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AutomationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly loggingService = inject(LoggingService);

  /**
   * Get all automation rules
   */
  getAutomationRules(): Observable<AutomationRule[]> {
    return this.http.get<AutomationRule[]>(`${this.baseUrl}/api/automation/rules`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load automation rules', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get automation rule by ID
   */
  getAutomationRule(ruleId: string): Observable<AutomationRule> {
    return this.http.get<AutomationRule>(`${this.baseUrl}/api/automation/rules/${ruleId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load automation rule', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Create automation rule
   */
  createAutomationRule(rule: AutomationRule): Observable<AutomationRule> {
    return this.http.post<AutomationRule>(`${this.baseUrl}/api/automation/rules`, rule).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to create automation rule', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Update automation rule
   */
  updateAutomationRule(ruleId: string, rule: Partial<AutomationRule>): Observable<AutomationRule> {
    return this.http.put<AutomationRule>(`${this.baseUrl}/api/automation/rules/${ruleId}`, rule).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to update automation rule', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete automation rule
   */
  deleteAutomationRule(ruleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/automation/rules/${ruleId}`).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to delete automation rule', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Enable/disable automation rule
   */
  toggleAutomationRule(ruleId: string, enabled: boolean): Observable<AutomationRule> {
    return this.http.patch<AutomationRule>(`${this.baseUrl}/api/automation/rules/${ruleId}/toggle`, { enabled }).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to toggle automation rule', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get automation execution history
   */
  getAutomationHistory(ruleId?: string): Observable<any[]> {
    const url = ruleId 
      ? `${this.baseUrl}/api/automation/history/${ruleId}`
      : `${this.baseUrl}/api/automation/history`;
    return this.http.get<any[]>(url).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to load automation history', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Test automation rule
   */
  testAutomationRule(ruleId: string, testData?: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/automation/rules/${ruleId}/test`, testData || {}).pipe(
      catchError((error) => {
        this.loggingService.error('Failed to test automation rule', error, 'AutomationService');
        return throwError(() => error);
      }),
    );
  }
}
