import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhyOnevo } from './why-onevo';

describe('WhyOnevo', () => {
  let component: WhyOnevo;
  let fixture: ComponentFixture<WhyOnevo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhyOnevo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhyOnevo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
