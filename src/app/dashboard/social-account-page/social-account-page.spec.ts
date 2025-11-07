import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialAccountPage } from './social-account-page';

describe('SocialAccountPage', () => {
  let component: SocialAccountPage;
  let fixture: ComponentFixture<SocialAccountPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialAccountPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocialAccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
