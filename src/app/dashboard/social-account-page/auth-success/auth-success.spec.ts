import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthSuccess } from './auth-success';

describe('AuthSuccess', () => {
  let component: AuthSuccess;
  let fixture: ComponentFixture<AuthSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthSuccess]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthSuccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
