import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  readonly githubUrl = 'https://github.com/Jablothas';
  readonly email = 'mail@jablo.dev';

  openGithub(): void {
    window.open(this.githubUrl, '_blank', 'noopener,noreferrer');
  }

  openEmail(): void {
    window.location.href = `mailto:${this.email}`;
  }
}

