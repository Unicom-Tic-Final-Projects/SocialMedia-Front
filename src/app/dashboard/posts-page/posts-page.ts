import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-posts-page',
  imports: [],
  templateUrl: './posts-page.html',
  styleUrl: './posts-page.css',
})
export class PostsPage implements OnInit {
  posts = [
    { title: 'Black Friday Offer', platform: 'Instagram', status: 'Scheduled', scheduledAt: new Date() },
    { title: 'Holiday Sale', platform: 'Facebook', status: 'Published', scheduledAt: new Date() },
    { title: 'New Year Teaser', platform: 'LinkedIn', status: 'Draft', scheduledAt: new Date() },
  ];

  ngOnInit(): void {}
}
