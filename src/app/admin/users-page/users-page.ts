import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../services/admin/users.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [CommonModule],
  templateUrl: './users-page.html',
  styleUrl: './users-page.css',
})
export class AdminUsersPage implements OnInit {
  users: any[] = [];
  loading = true;

  constructor(private usersService: UsersService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.usersService.getUsers().subscribe({
      next: (users) => {
        // Transform API data to match template structure
        this.users = users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.id <= 2 ? 'Admin' : 'User', // Mock role assignment
          status: user.id % 3 === 0 ? 'inactive' : 'active', // Mock status
          joined: new Date().toISOString().split('T')[0] // Mock date
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }

  deleteUser(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.usersService.deleteUser(id).subscribe({
        next: () => {
          this.users = this.users.filter(user => user.id !== id);
        },
        error: (error) => {
          console.error('Error deleting user:', error);
        }
      });
    }
  }
}

