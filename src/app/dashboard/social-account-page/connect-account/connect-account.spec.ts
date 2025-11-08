import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectAccount } from './connect-account';

describe('ConnectAccount', () => {
  let component: ConnectAccount;
  let fixture: ComponentFixture<ConnectAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectAccount]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConnectAccount);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
