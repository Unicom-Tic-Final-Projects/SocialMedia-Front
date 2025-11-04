import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntegrationsSection } from './integrations-section';

describe('IntegrationsSection', () => {
  let component: IntegrationsSection;
  let fixture: ComponentFixture<IntegrationsSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntegrationsSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntegrationsSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
