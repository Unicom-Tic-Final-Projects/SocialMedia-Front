import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Platform, SocialAccount } from '../models/social.models';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class SocialAccountsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly accountsSubject = new BehaviorSubject<SocialAccount[]>([]);
  readonly accounts$ = this.accountsSubject.asObservable();

  constructor() {
    this.refresh().subscribe();
  }

  refresh(limit = 12): Observable<SocialAccount[]> {
    return this.http
      .get<{ users: any[] }>(`${this.baseUrl}/users`, { params: { limit } as any })
      .pipe(
        map(({ users }) => users.map((user) => this.mapUserToAccount(user))),
        tap((accounts) => this.accountsSubject.next(accounts))
      );
  }

  list(): SocialAccount[] {
    return this.accountsSubject.value;
  }

  connect(
    platform: Platform,
    accountName: string,
    accountType: SocialAccount['accountType'] = 'business'
  ): Observable<SocialAccount> {
    const [firstName, ...rest] = accountName.split(' ');
    const body = {
      firstName: firstName || accountName,
      lastName: rest.join(' ') || platform,
      email: `${accountName.replace(/\s+/g, '').toLowerCase()}@example.com`,
      age: 32,
      gender: 'other',
      company: {
        name: 'NexusPost',
        department: platform,
        title: accountType,
      },
    };

    return this.http.post<any>(`${this.baseUrl}/users/add`, body).pipe(
      map((user) => this.mapUserToAccount(user, platform, accountType)),
      tap((account) => this.accountsSubject.next([...this.accountsSubject.value, account]))
    );
  }

  update(accountId: string, updates: Partial<SocialAccount>): Observable<SocialAccount> {
    return this.http.put<any>(`${this.baseUrl}/users/${accountId}`, updates).pipe(
      map((user) => this.mapUserToAccount(user)),
      tap((account) =>
        this.accountsSubject.next(
          this.accountsSubject.value.map((item) => (item.id === account.id ? account : item))
        )
      )
    );
  }

  reconnect(accountId: string): Observable<SocialAccount> {
    return this.update(accountId, { status: 'connected', connectedAt: new Date().toISOString() });
  }

  disconnect(accountId: string): Observable<boolean> {
    return this.http.delete<{ isDeleted: boolean }>(`${this.baseUrl}/users/${accountId}`).pipe(
      map((response) => response.isDeleted ?? true),
      tap((isDeleted) => {
        if (isDeleted) {
          this.accountsSubject.next(this.accountsSubject.value.filter((acc) => acc.id !== accountId));
        }
      })
    );
  }

  accountsFor(platform: Platform): Observable<SocialAccount[]> {
    return this.accounts$.pipe(
      map((accounts) => accounts.filter((account) => account.platform === platform && account.status === 'connected'))
    );
  }

  isConnected(platform: Platform): boolean {
    return this.accountsSubject.value.some(
      (account) => account.platform === platform && account.status === 'connected'
    );
  }

  private mapUserToAccount(
    user: any,
    fallbackPlatform?: Platform,
    fallbackType: SocialAccount['accountType'] = 'business'
  ): SocialAccount {
    const platform = (user.company?.department?.toLowerCase() as Platform) || fallbackPlatform || 'facebook';
    const statusCycle: SocialAccount['status'][] = ['connected', 'reconnecting', 'disconnected'];
    return {
      id: String(user.id),
      platform,
      accountName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'Account',
      accountId: `acc_${user.id}`,
      accountType: (user.company?.title as SocialAccount['accountType']) || fallbackType,
      connectedAt: new Date(Date.now() - (user.id % 7) * 86400000).toISOString(),
      status: statusCycle[user.id % statusCycle.length],
      accessToken: `tok_${user.id}_${Date.now()}`,
    };
  }
}
