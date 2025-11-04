import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostEditor } from './post-editor';

describe('PostEditor', () => {
  let component: PostEditor;
  let fixture: ComponentFixture<PostEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
