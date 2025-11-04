import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastMessage } from './toast-message';

describe('ToastMessage', () => {
  let component: ToastMessage;
  let fixture: ComponentFixture<ToastMessage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastMessage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToastMessage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
