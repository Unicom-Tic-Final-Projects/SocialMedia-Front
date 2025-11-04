import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CtaBand } from './cta-band';

describe('CtaBand', () => {
  let component: CtaBand;
  let fixture: ComponentFixture<CtaBand>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaBand]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CtaBand);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
