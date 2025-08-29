import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { WalletService, WalletBalance, Transaction, DepositAddress, Portfolio } from '../../services/wallet.service';
import { CryptoDataService } from '../../services/crypto-data.service';

interface DepositRequest {
  symbol: string;
  amount: number;
  fromAddress: string;
}

interface WithdrawalRequest {
  symbol: string;
  amount: number;
  toAddress: string;
  twoFactorCode?: string;
}

@Component({
  selector: 'app-wallet-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wallet-container">
      <!-- Header -->
      <div class="wallet-header">
        <div class="header-content">
          <h1 class="wallet-title">Wallet</h1>
          <p class="wallet-subtitle">Manage your cryptocurrency assets and transactions</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="refreshWallet()">
            <span class="icon">🔄</span>
            Refresh
          </button>
        </div>
      </div>

      <!-- Portfolio Summary -->
      <div class="portfolio-summary" *ngIf="portfolio">
        <div class="summary-card total-value">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <h3>Total Balance</h3>
            <p class="card-value">{{ formatCurrency(portfolio.totalValue) }}</p>
            <p class="card-change" [class.positive]="portfolio.totalChangePercent24h >= 0"
               [class.negative]="portfolio.totalChangePercent24h < 0">
              {{ formatPercentage(portfolio.totalChangePercent24h) }} (24h)
            </p>
          </div>
        </div>

        <div class="summary-card assets-count">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <h3>Active Assets</h3>
            <p class="card-value">{{ getActiveAssetsCount() }}</p>
            <p class="card-subtitle">Cryptocurrencies</p>
          </div>
        </div>

        <div class="summary-card total-change">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <h3>24h Change</h3>
            <p class="card-value" [class.positive]="portfolio.totalChange24h >= 0"
               [class.negative]="portfolio.totalChange24h < 0">
              {{ formatCurrency(getAbsoluteChange(portfolio.totalChange24h)) }}
            </p>
            <p class="card-subtitle">{{ portfolio.totalChange24h >= 0 ? 'Gain' : 'Loss' }}</p>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="wallet-content">
        <!-- Balances Section -->
        <div class="wallet-section balances-section">
          <div class="section-header">
            <h3>Your Balances</h3>
            <div class="section-actions">
              <button class="btn-secondary" (click)="showZeroBalances = !showZeroBalances">
                {{ showZeroBalances ? 'Hide Zero' : 'Show All' }}
              </button>
            </div>
          </div>

          <div class="balances-grid">
            <div class="balance-card" *ngFor="let balance of displayedBalances; trackBy: trackBySymbol">
              <div class="balance-header">
                <div class="balance-icon-info">
                  <span class="balance-icon">{{ balance.icon }}</span>
                  <div class="balance-details">
                    <span class="balance-symbol">{{ balance.symbol }}</span>
                    <span class="balance-name">{{ getCryptoName(balance.symbol) }}</span>
                  </div>
                </div>
                <div class="balance-actions">
                  <button class="action-btn deposit-btn" (click)="openDepositModal(balance.symbol)">
                    Deposit
                  </button>
                  <button class="action-btn withdraw-btn"
                          [disabled]="balance.available <= 0"
                          (click)="openWithdrawModal(balance.symbol)">
                    Withdraw
                  </button>
                </div>
              </div>

              <div class="balance-amounts">
                <div class="amount-row">
                  <span class="amount-label">Total:</span>
                  <span class="amount-value">{{ formatCrypto(balance.amount, balance.symbol) }}</span>
                </div>
                <div class="amount-row">
                  <span class="amount-label">Available:</span>
                  <span class="amount-value available">{{ formatCrypto(balance.available, balance.symbol) }}</span>
                </div>
                <div class="amount-row" *ngIf="balance.inOrders > 0">
                  <span class="amount-label">In Orders:</span>
                  <span class="amount-value in-orders">{{ formatCrypto(balance.inOrders, balance.symbol) }}</span>
                </div>
              </div>

              <div class="balance-value">
                <span class="usd-value">{{ formatCurrency(balance.valueUSD) }}</span>
                <span class="value-change" *ngIf="getBalanceChange(balance.symbol) as change">
                  <span [class.positive]="change >= 0" [class.negative]="change < 0">
                    {{ formatPercentage(change) }}
                  </span>
                </span>
              </div>
            </div>

            <div class="empty-balances" *ngIf="displayedBalances.length === 0">
              <div class="empty-icon">👛</div>
              <h4>No Balances Found</h4>
              <p>Deposit some cryptocurrency to get started</p>
              <button class="btn-primary" (click)="openDepositModal('BTC')">Deposit BTC</button>
            </div>
          </div>
        </div>

        <!-- Transaction History -->
        <div class="wallet-section transactions-section">
          <div class="section-header">
            <h3>Transaction History</h3>
            <div class="section-filters">
              <select [(ngModel)]="transactionFilter" (change)="filterTransactions()">
                <option value="all">All Transactions</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="buy">Buy Orders</option>
                <option value="sell">Sell Orders</option>
                <option value="transfer">Transfers</option>
              </select>
            </div>
          </div>

          <div class="transactions-list">
            <div class="transaction-item" *ngFor="let transaction of filteredTransactions; trackBy: trackByTransactionId">
              <div class="transaction-icon" [style.background-color]="getTransactionTypeColor(transaction.type)">
                <span>{{ getTransactionTypeIcon(transaction.type) }}</span>
              </div>

              <div class="transaction-content">
                <div class="transaction-header">
                  <div class="transaction-title">
                    {{ getTransactionTitle(transaction) }}
                  </div>
                  <div class="transaction-status" [style.color]="walletService.getTransactionStatusColor(transaction.status)">
                    {{ walletService.getTransactionStatusText(transaction.status) }}
                  </div>
                </div>

                <div class="transaction-details">
                  <div class="transaction-info">
                    <span class="info-label">Amount:</span>
                    <span class="info-value">{{ formatCrypto(transaction.amount, transaction.symbol) }}</span>
                  </div>
                  <div class="transaction-info" *ngIf="transaction.price > 0">
                    <span class="info-label">Price:</span>
                    <span class="info-value">{{ formatCurrency(transaction.price) }}</span>
                  </div>
                  <div class="transaction-info">
                    <span class="info-label">Total:</span>
                    <span class="info-value">{{ formatCurrency(transaction.total) }}</span>
                  </div>
                  <div class="transaction-info" *ngIf="transaction.fee > 0">
                    <span class="info-label">Fee:</span>
                    <span class="info-value">{{ formatCurrency(transaction.fee) }}</span>
                  </div>
                </div>

                <div class="transaction-addresses" *ngIf="transaction.fromAddress || transaction.toAddress">
                  <div class="address-info" *ngIf="transaction.fromAddress">
                    <span class="address-label">From:</span>
                    <span class="address-value">{{ formatAddress(transaction.fromAddress) }}</span>
                  </div>
                  <div class="address-info" *ngIf="transaction.toAddress">
                    <span class="address-label">To:</span>
                    <span class="address-value">{{ formatAddress(transaction.toAddress) }}</span>
                  </div>
                </div>

                <div class="transaction-meta">
                  <span class="transaction-date">{{ transaction.timestamp | date:'medium' }}</span>
                  <span class="transaction-id" *ngIf="transaction.txHash">
                    TX: {{ formatTxHash(transaction.txHash) }}
                  </span>
                </div>
              </div>

              <div class="transaction-amount">
                <div class="amount-display" [class.positive]="isPositiveTransaction(transaction)"
                     [class.negative]="!isPositiveTransaction(transaction)">
                  <span class="amount-sign">{{ isPositiveTransaction(transaction) ? '+' : '-' }}</span>
                  <span class="amount-value">{{ formatCrypto(transaction.amount, transaction.symbol) }}</span>
                </div>
                <div class="amount-usd">{{ formatCurrency(transaction.total) }}</div>
              </div>
            </div>

            <div class="no-transactions" *ngIf="filteredTransactions.length === 0">
              <div class="no-data-icon">📋</div>
              <h4>No Transactions</h4>
              <p>Your transaction history will appear here</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Deposit Modal -->
      <div class="modal-overlay" *ngIf="showDepositModal" (click)="closeDepositModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Deposit {{ depositSymbol }}</h3>
            <button class="close-btn" (click)="closeDepositModal()">×</button>
          </div>

          <div class="modal-body" *ngIf="depositAddress">
            <div class="deposit-info">
              <p>Send {{ depositSymbol }} to the following address:</p>

              <div class="address-display">
                <div class="address-qr">
                  <!-- QR Code would be generated here -->
                  <div class="qr-placeholder">📱</div>
                </div>
                <div class="address-details">
                  <div class="address-field">
                    <label>Address:</label>
                    <div class="address-value">{{ depositAddress.address }}</div>
                    <button class="copy-btn" (click)="copyToClipboard(depositAddress.address)">
                      <span class="copy-icon">📋</span>
                      Copy
                    </button>
                  </div>
                  <div class="address-field" *ngIf="depositAddress.network">
                    <label>Network:</label>
                    <div class="address-value">{{ depositAddress.network }}</div>
                  </div>
                  <div class="address-field" *ngIf="depositAddress.memo">
                    <label>Memo:</label>
                    <div class="address-value">{{ depositAddress.memo }}</div>
                  </div>
                </div>
              </div>

              <div class="deposit-notice">
                <div class="notice-icon">⚠️</div>
                <div class="notice-content">
                  <h4>Important Notice</h4>
                  <ul>
                    <li>Send only {{ depositSymbol }} to this address</li>
                    <li>Minimum deposit: 0.0001 {{ depositSymbol }}</li>
                    <li>Deposits are usually confirmed within 10-60 minutes</li>
                    <li>Do not send from smart contracts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Withdraw Modal -->
      <div class="modal-overlay" *ngIf="showWithdrawModal" (click)="closeWithdrawModal()">
        <div class="modal-content withdraw-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Withdraw {{ withdrawSymbol }}</h3>
            <button class="close-btn" (click)="closeWithdrawModal()">×</button>
          </div>

          <form class="withdraw-form" (ngSubmit)="submitWithdrawal()">
            <div class="form-group">
              <label for="withdraw-address">Recipient Address</label>
              <input type="text" id="withdraw-address" [(ngModel)]="withdrawalRequest.toAddress"
                     name="toAddress" placeholder="Enter recipient address" required>
            </div>

            <div class="form-group">
              <label for="withdraw-amount">Amount ({{ withdrawSymbol }})</label>
              <input type="number" id="withdraw-amount" [(ngModel)]="withdrawalRequest.amount"
                     name="amount" placeholder="0.00" min="0" step="0.00000001"
                     [max]="maxWithdrawAmount" (input)="calculateWithdrawalTotal()" required>
              <div class="input-helper">
                <span>Available: {{ formatCrypto(maxWithdrawAmount, withdrawSymbol) }}</span>
                <button type="button" class="max-btn" (click)="setMaxWithdrawal()">Max</button>
              </div>
            </div>

            <div class="withdrawal-summary" *ngIf="withdrawalRequest.amount > 0">
              <div class="summary-item">
                <span>Amount:</span>
                <span>{{ formatCrypto(withdrawalRequest.amount, withdrawSymbol) }}</span>
              </div>
              <div class="summary-item">
                <span>Fee:</span>
                <span>{{ formatCurrency(withdrawalFee) }}</span>
              </div>
              <div class="summary-item total">
                <span>You will receive:</span>
                <span>{{ formatCrypto(withdrawalRequest.amount - withdrawalFee, withdrawSymbol) }}</span>
              </div>
            </div>

            <div class="form-group" *ngIf="requiresTwoFactor">
              <label for="two-factor">2FA Code</label>
              <input type="text" id="two-factor" [(ngModel)]="withdrawalRequest.twoFactorCode"
                     name="twoFactorCode" placeholder="Enter 2FA code" maxlength="6">
            </div>

            <div class="withdraw-notice">
              <div class="notice-icon">⚠️</div>
              <div class="notice-content">
                <h4>Withdrawal Notice</h4>
                <p>Please double-check the recipient address. Withdrawals are irreversible.</p>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeWithdrawModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="!canWithdraw()">
                Withdraw {{ withdrawSymbol }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wallet-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      background: var(--bg-primary);
      min-height: 100vh;
    }

    .wallet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .header-content h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .header-content p {
      margin: 0.5rem 0 0 0;
      color: var(--text-secondary);
      font-size: 1.1rem;
    }

    .header-actions .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .header-actions .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .portfolio-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .card-icon {
      font-size: 2rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
      border-radius: 50%;
    }

    .card-content h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .card-change {
      font-size: 0.9rem;
      margin: 0.25rem 0 0 0;
    }

    .card-change.positive {
      color: #10b981;
    }

    .card-change.negative {
      color: #ef4444;
    }

    .card-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 0.25rem 0 0 0;
    }

    .wallet-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .wallet-section {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .section-actions, .section-filters {
      display: flex;
      gap: 1rem;
    }

    .btn-secondary {
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: var(--bg-hover);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .section-filters select {
      padding: 0.5rem 1rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }

    .balances-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1rem;
    }

    .balance-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.25rem;
      transition: all 0.2s;
    }

    .balance-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      border-color: var(--primary-color);
    }

    .balance-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .balance-icon-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .balance-icon {
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-hover);
      border-radius: 50%;
    }

    .balance-details {
      display: flex;
      flex-direction: column;
    }

    .balance-symbol {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .balance-name {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .balance-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.375rem;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .deposit-btn:hover:not(:disabled) {
      background: #10b981;
      border-color: #10b981;
    }

    .withdraw-btn:hover:not(:disabled) {
      background: #ef4444;
      border-color: #ef4444;
    }

    .balance-amounts {
      margin-bottom: 1rem;
    }

    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .amount-row:last-child {
      margin-bottom: 0;
    }

    .amount-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .amount-value {
      font-weight: 500;
      color: var(--text-primary);
    }

    .amount-value.available {
      color: #10b981;
    }

    .amount-value.in-orders {
      color: #f59e0b;
    }

    .balance-value {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .usd-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .value-change {
      font-size: 0.9rem;
    }

    .value-change .positive {
      color: #10b981;
    }

    .value-change .negative {
      color: #ef4444;
    }

    .empty-balances {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-balances h4 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .transaction-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      transition: all 0.2s;
    }

    .transaction-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .transaction-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .transaction-content {
      flex: 1;
      min-width: 0;
    }

    .transaction-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .transaction-title {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .transaction-status {
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: var(--bg-hover);
    }

    .transaction-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .transaction-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .transaction-addresses {
      margin-bottom: 0.75rem;
    }

    .address-info {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .address-info:last-child {
      margin-bottom: 0;
    }

    .address-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      min-width: 35px;
    }

    .address-value {
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      color: var(--text-primary);
      word-break: break-all;
    }

    .transaction-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .transaction-id {
      font-family: 'Courier New', monospace;
    }

    .transaction-amount {
      text-align: right;
      flex-shrink: 0;
    }

    .amount-display {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }

    .amount-sign {
      font-size: 1.2rem;
      font-weight: 600;
    }

    .amount-value {
      font-size: 1.1rem;
      font-weight: 600;
    }

    .amount-display.positive {
      color: #10b981;
    }

    .amount-display.positive .amount-sign {
      color: #10b981;
    }

    .amount-display.negative {
      color: #ef4444;
    }

    .amount-display.negative .amount-sign {
      color: #ef4444;
    }

    .amount-usd {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .no-transactions {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .no-data-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-transactions h4 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 0;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid var(--border-color);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .modal-body {
      padding: 1.5rem;
    }

    .address-display {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
    }

    .qr-placeholder {
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-hover);
      border-radius: 0.5rem;
      font-size: 2rem;
    }

    .address-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .address-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .address-field label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .address-field .address-value {
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      color: var(--text-primary);
      word-break: break-all;
      line-height: 1.4;
    }

    .copy-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      align-self: flex-start;
    }

    .copy-btn:hover {
      background: var(--primary-hover);
    }

    .deposit-notice {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 0.5rem;
    }

    .notice-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .notice-content h4 {
      margin: 0 0 0.5rem 0;
      color: #f59e0b;
      font-size: 1rem;
    }

    .notice-content ul {
      margin: 0;
      padding-left: 1.5rem;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .notice-content li {
      margin-bottom: 0.25rem;
    }

    /* Withdraw Modal */
    .withdraw-modal {
      max-width: 600px;
    }

    .withdraw-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .form-group input {
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }

    .input-helper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .max-btn {
      padding: 0.25rem 0.5rem;
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: 0.25rem;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .max-btn:hover {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .withdrawal-summary {
      background: var(--bg-primary);
      border-radius: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--border-color);
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .summary-item.total {
      border-top: 1px solid var(--border-color);
      padding-top: 0.5rem;
      margin-top: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
    }

    .summary-item:last-child {
      margin-bottom: 0;
    }

    .withdraw-notice {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 0.5rem;
    }

    .withdraw-notice .notice-icon {
      color: #ef4444;
    }

    .withdraw-notice .notice-content h4 {
      margin: 0 0 0.5rem 0;
      color: #ef4444;
      font-size: 1rem;
    }

    .withdraw-notice .notice-content p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .modal-actions .btn-primary {
      padding: 0.75rem 2rem;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .modal-actions .btn-primary:hover:not(:disabled) {
      background: #dc2626;
      transform: translateY(-1px);
    }

    .modal-actions .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .modal-actions .btn-secondary {
      padding: 0.75rem 2rem;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .modal-actions .btn-secondary:hover {
      background: var(--bg-hover);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .wallet-container {
        padding: 1rem;
      }

      .portfolio-summary {
        grid-template-columns: 1fr;
      }

      .balances-grid {
        grid-template-columns: 1fr;
      }

      .balance-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .balance-actions {
        width: 100%;
        justify-content: flex-end;
      }

      .transaction-item {
        flex-direction: column;
        gap: 1rem;
      }

      .transaction-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .transaction-amount {
        text-align: left;
      }

      .address-display {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .modal-content {
        margin: 1rem;
        max-width: none;
      }

      .withdraw-form {
        gap: 1rem;
      }

      .modal-actions {
        flex-direction: column;
      }

      .modal-actions button {
        width: 100%;
      }
    }
  `]
})
export class WalletManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  portfolio: Portfolio | null = null;
  allBalances: WalletBalance[] = [];
  displayedBalances: WalletBalance[] = [];
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];

  showZeroBalances = false;
  transactionFilter = 'all';

  // Modal states
  showDepositModal = false;
  showWithdrawModal = false;
  depositSymbol = '';
  withdrawSymbol = '';
  depositAddress: DepositAddress | null = null;

  withdrawalRequest: WithdrawalRequest = {
    symbol: '',
    amount: 0,
    toAddress: ''
  };

  maxWithdrawAmount = 0;
  withdrawalFee = 0;
  requiresTwoFactor = false;

  constructor(
    public walletService: WalletService,
    private cryptoDataService: CryptoDataService
  ) {}

  ngOnInit() {
    this.loadWalletData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadWalletData() {
    // Load portfolio
    this.walletService.getPortfolio().pipe(takeUntil(this.destroy$)).subscribe((portfolio: Portfolio) => {
      this.portfolio = portfolio;
      this.updateDisplayedBalances();
    });

    // Load balances
    this.walletService.getBalances().pipe(takeUntil(this.destroy$)).subscribe((balances: WalletBalance[]) => {
      this.allBalances = balances;
      this.updateDisplayedBalances();
    });

    // Load transactions
    this.walletService.getTransactions().pipe(takeUntil(this.destroy$)).subscribe((transactions: Transaction[]) => {
      this.allTransactions = transactions;
      this.filterTransactions();
    });
  }

  private setupRealTimeUpdates() {
    // Update data every 30 seconds
    setInterval(() => {
      this.loadWalletData();
    }, 30000);
  }

  private updateDisplayedBalances() {
    if (!this.portfolio) return;

    this.displayedBalances = this.showZeroBalances
      ? this.portfolio.balances
      : this.portfolio.balances.filter(balance => balance.amount > 0);
  }

  filterTransactions() {
    if (this.transactionFilter === 'all') {
      this.filteredTransactions = this.allTransactions;
    } else {
      this.filteredTransactions = this.allTransactions.filter(tx => tx.type === this.transactionFilter);
    }
  }

  getActiveAssetsCount(): number {
    return this.portfolio?.balances?.filter(b => b.amount > 0)?.length || 0;
  }

  refreshWallet() {
    this.loadWalletData();
  }

  openDepositModal(symbol: string) {
    this.depositSymbol = symbol;
    this.walletService.getDepositAddress(symbol).pipe(takeUntil(this.destroy$)).subscribe((address: DepositAddress | undefined) => {
      this.depositAddress = address || null;
      this.showDepositModal = true;
    });
  }

  closeDepositModal() {
    this.showDepositModal = false;
    this.depositAddress = null;
  }

  openWithdrawModal(symbol: string) {
    const balance = this.allBalances.find(b => b.symbol === symbol);
    if (!balance || balance.available <= 0) return;

    this.withdrawSymbol = symbol;
    this.withdrawalRequest = {
      symbol,
      amount: 0,
      toAddress: ''
    };
    this.maxWithdrawAmount = balance.available;
    this.requiresTwoFactor = balance.available > 10; // Require 2FA for large withdrawals
    this.showWithdrawModal = true;
  }

  closeWithdrawModal() {
    this.showWithdrawModal = false;
    this.withdrawalRequest = {
      symbol: '',
      amount: 0,
      toAddress: ''
    };
  }

  calculateWithdrawalTotal() {
    this.withdrawalFee = this.walletService.getWithdrawalFee(
      this.withdrawSymbol,
      this.withdrawalRequest.amount
    );
  }

  setMaxWithdrawal() {
    this.withdrawalRequest.amount = this.maxWithdrawAmount;
    this.calculateWithdrawalTotal();
  }

  canWithdraw(): boolean {
    return this.withdrawalRequest.amount > 0 &&
           this.withdrawalRequest.amount <= this.maxWithdrawAmount &&
           this.withdrawalRequest.toAddress.trim().length > 0 &&
           (!this.requiresTwoFactor || (this.withdrawalRequest.twoFactorCode?.length === 6));
  }

  async submitWithdrawal() {
    if (!this.canWithdraw()) return;

    try {
      await this.walletService.createWithdrawal(
        this.withdrawSymbol,
        this.withdrawalRequest.amount,
        this.withdrawalRequest.toAddress
      );

      this.closeWithdrawModal();
      this.loadWalletData(); // Refresh data

      // Show success message (in a real app)
      console.log('Withdrawal request submitted successfully');
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      // Show error message (in a real app)
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Show success message (in a real app)
      console.log('Address copied to clipboard');
    });
  }

  getAbsoluteChange(value: number): number {
    return Math.abs(value);
  }

  getBalanceChange(symbol: string): number | null {
    // This would normally calculate the 24h change for the balance
    // For demo purposes, return a mock value
    return Math.random() * 10 - 5; // Random change between -5% and +5%
  }

  getCryptoName(symbol: string): string {
    const names: { [key: string]: string } = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'ADA': 'Cardano',
      'DOT': 'Polkadot',
      'SOL': 'Solana',
      'LINK': 'Chainlink'
    };
    return names[symbol] || symbol;
  }

  getTransactionTypeColor(type: Transaction['type']): string {
    switch (type) {
      case 'buy': return '#10b981';
      case 'sell': return '#ef4444';
      case 'deposit': return '#3b82f6';
      case 'withdrawal': return '#f59e0b';
      case 'transfer': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  getTransactionTypeIcon(type: Transaction['type']): string {
    switch (type) {
      case 'buy': return '🛒';
      case 'sell': return '💰';
      case 'deposit': return '⬇️';
      case 'withdrawal': return '⬆️';
      case 'transfer': return '↗️';
      default: return '🔄';
    }
  }

  getTransactionTitle(transaction: Transaction): string {
    switch (transaction.type) {
      case 'buy': return `Bought ${transaction.symbol}`;
      case 'sell': return `Sold ${transaction.symbol}`;
      case 'deposit': return `Deposited ${transaction.symbol}`;
      case 'withdrawal': return `Withdrew ${transaction.symbol}`;
      case 'transfer': return `Transferred ${transaction.symbol}`;
      default: return `${transaction.type} ${transaction.symbol}`;
    }
  }

  isPositiveTransaction(transaction: Transaction): boolean {
    return transaction.type === 'buy' || transaction.type === 'deposit';
  }

  formatAddress(address: string): string {
    if (address.length <= 20) return address;
    return address.substring(0, 10) + '...' + address.substring(address.length - 8);
  }

  formatTxHash(hash: string): string {
    if (hash.length <= 12) return hash;
    return hash.substring(0, 6) + '...' + hash.substring(hash.length - 6);
  }

  formatCurrency(amount: number): string {
    return this.cryptoDataService.formatCurrency(amount);
  }

  formatPercentage(value: number): string {
    return this.cryptoDataService.formatPercentage(value);
  }

  formatCrypto(amount: number, symbol: string): string {
    return this.walletService.formatCrypto(amount, symbol);
  }

  trackBySymbol(index: number, balance: WalletBalance): string {
    return balance.symbol;
  }

  trackByTransactionId(index: number, transaction: Transaction): string {
    return transaction.id;
  }
}
