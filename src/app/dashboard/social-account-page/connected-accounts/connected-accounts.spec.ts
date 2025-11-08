import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectedAccounts } from './connected-accounts';

describe('ConnectedAccounts', () => {
  let component: ConnectedAccounts;
  let fixture: ComponentFixture<ConnectedAccounts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectedAccounts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConnectedAccounts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
