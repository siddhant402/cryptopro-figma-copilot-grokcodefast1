import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { UserDashboardComponent } from './components/dashboard/user-dashboard.component';
import { TradingInterfaceComponent } from './components/trading/trading-interface.component';
import { WalletManagementComponent } from './components/wallet/wallet-management.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login - CryptoPro'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Sign Up - CryptoPro'
  },
  {
    path: 'dashboard',
    component: UserDashboardComponent,
    title: 'Dashboard - CryptoPro'
  },
  {
    path: 'trade',
    component: TradingInterfaceComponent,
    title: 'Trading - CryptoPro'
  },
  {
    path: 'wallet',
    component: WalletManagementComponent,
    title: 'Wallet - CryptoPro'
  },
  {
    path: 'market',
    component: UserDashboardComponent, // Placeholder - would be a dedicated market component
    title: 'Market - CryptoPro'
  },
  {
    path: 'transactions',
    component: WalletManagementComponent, // Placeholder - would be a dedicated transactions component
    title: 'Transactions - CryptoPro'
  },
  {
    path: 'settings',
    component: UserDashboardComponent, // Placeholder - would be a dedicated settings component
    title: 'Settings - CryptoPro'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
