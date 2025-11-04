import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoaderSpinner } from './loader-spinner';

describe('LoaderSpinner', () => {
  let component: LoaderSpinner;
  let fixture: ComponentFixture<LoaderSpinner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoaderSpinner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoaderSpinner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
