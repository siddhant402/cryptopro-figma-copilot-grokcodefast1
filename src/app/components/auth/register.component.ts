import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RegisterData } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <h2>Create an account</h2>
          <p>Sign up for your CryptoPro account</p>
        </div>

    <form (ngSubmit)="onSubmit()" #registerForm="ngForm" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">First name</label>
      <input id="firstName" name="firstName" [(ngModel)]="data.firstName" required class="form-input" #firstName="ngModel">
      <div class="field-error" *ngIf="firstName.invalid && (firstName.dirty || firstName.touched)">First name is required</div>
            </div>
            <div class="form-group">
              <label for="lastName">Last name</label>
      <input id="lastName" name="lastName" [(ngModel)]="data.lastName" required class="form-input" #lastName="ngModel">
      <div class="field-error" *ngIf="lastName.invalid && (lastName.dirty || lastName.touched)">Last name is required</div>
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" [(ngModel)]="data.email" required email class="form-input" #emailModel="ngModel">
            <div class="field-error" *ngIf="emailModel.invalid && (emailModel.dirty || emailModel.touched)">
              <span *ngIf="emailModel.errors?.['required']">Email is required</span>
              <span *ngIf="emailModel.errors?.['email']">Enter a valid email</span>
            </div>
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input id="username" name="username" [(ngModel)]="data.username" required class="form-input">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" [(ngModel)]="data.password" required minlength="8" class="form-input" #passwordModel="ngModel" (ngModelChange)="onPasswordChange()">
            <div class="field-error" *ngIf="passwordModel.invalid && (passwordModel.dirty || passwordModel.touched)">
              <span *ngIf="passwordModel.errors?.['required']">Password is required</span>
              <span *ngIf="passwordModel.errors?.['minlength']">Password must be at least 8 characters</span>
            </div>

            <div class="password-strength">
              <div class="strength-bar" [class.level-1]="passwordStrength>=1" [class.level-2]="passwordStrength>=2" [class.level-3]="passwordStrength>=3" [class.level-4]="passwordStrength>=4"></div>
              <div class="strength-label">{{ passwordStrengthLabel }}</div>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" [(ngModel)]="data.confirmPassword" required minlength="8" class="form-input" #confirmModel="ngModel">
            <div class="field-error" *ngIf="(confirmModel.dirty || confirmModel.touched) && passwordMismatch">Passwords do not match</div>
          </div>

          <label class="checkbox-container">
            <input type="checkbox" name="acceptTerms" [(ngModel)]="data.acceptTerms" #termsModel="ngModel">
            I accept the Terms of Service
          </label>
          <div class="field-error" *ngIf="termsModel.invalid && (termsModel.dirty || termsModel.touched) && !data.acceptTerms">You must accept the terms</div>

          <div class="server-error" *ngIf="serverError">{{ serverError }}</div>

          <button type="submit" class="btn-primary" [disabled]="registerForm.invalid || isLoading || passwordMismatch">{{ isLoading ? 'Creating…' : 'Create account' }}</button>
        </form>

        <div class="signup-footer">
          <p>Already have an account? <a routerLink="/login">Sign in</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:2rem;
      background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
    }

    .register-card {
      background: white;
      border-radius: 20px; /* match login */
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); /* match login */
      padding: 3rem; /* match login */
      width: 100%;
      max-width: 450px; /* match login card width */
      animation: slideUp 0.5s ease-out;
      color: #000; /* make all card text black for better contrast */
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .register-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .register-header h2 {
      color: #1e3a8a; /* match login heading color */
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .register-header p {
      color: #6c757d;
      font-size: 1rem;
    }

    .form-row { display:flex; gap:1rem; }

    .form-group { flex:1; margin-bottom:1.5rem; }

    .form-group label {
      display:block;
      margin-bottom:0.5rem;
      color: #1e3a8a;
      font-weight:600;
      font-size:0.9rem;
    }

    .form-input {
      width:100%;
      padding:1rem; /* match login input padding */
      border:2px solid #e9ecef; /* match login */
      border-radius:10px; /* match login */
      font-size:1rem;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
      box-sizing: border-box;
      color: #000;
      background: #fff;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .field-error {
      color: #dc3545;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .password-strength {
      margin-top: 0.5rem;
      display:flex;
      align-items:center;
      gap:0.5rem;
    }

    .strength-bar {
      width: 140px;
      height: 8px;
      background: #e9ecef;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .strength-bar::after {
      content: '';
      position: absolute;
      left: 0; top:0; bottom:0;
      width: 0%;
      background: linear-gradient(90deg,#ff6b6b,#f59e0b,#10b981,#06b6d4);
      transition: width 200ms ease;
    }

    .strength-bar.level-1::after { width: 25%; }
    .strength-bar.level-2::after { width: 50%; }
    .strength-bar.level-3::after { width: 75%; }
    .strength-bar.level-4::after { width: 100%; }

    .strength-label { font-size: 0.85rem; color: #374151; }

    .server-error { color:#b91c1c; background: #fff1f2; padding:0.5rem; border-radius:8px; margin:0.75rem 0; }

    .btn-primary {
      padding:0.75rem 1rem;
      background: linear-gradient(45deg,#667eea,#764ba2);
      color:white;
      border:none;
      border-radius:8px;
      cursor:pointer;
    }

    .checkbox-container { display:flex; gap:0.5rem; align-items:center; margin:1rem 0; color: #000; }

    .signup-footer p { color: #000; }
  `]
})
export class RegisterComponent {
  data: RegisterData = {
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  };

  isLoading = false;
  serverError: string | null = null;
  passwordStrength = 0;

  get passwordStrengthLabel() {
    switch (this.passwordStrength) {
      case 0: return 'Too weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      default: return '';
    }
  }

  get passwordMismatch() {
    return !!this.data.password && !!this.data.confirmPassword && this.data.password !== this.data.confirmPassword;
  }

  onPasswordChange() {
    const pw = this.data.password || '';
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    this.passwordStrength = score;
  }

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit() {
    this.serverError = null;
    if (!this.data.acceptTerms) {
      this.serverError = 'You must accept the terms to register';
      return;
    }

    if (this.passwordMismatch) {
      this.serverError = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    try {
      const ok = await this.auth.register(this.data);
      this.isLoading = false;
      if (ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.serverError = 'Registration failed. Check your details.';
      }
    } catch (err: any) {
      this.isLoading = false;
      this.serverError = err?.message || 'Registration error';
    }
  }
}
