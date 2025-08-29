import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { CryptoDataService, CryptoCurrency } from '../../services/crypto-data.service';
import { WalletService, WalletBalance, Transaction } from '../../services/wallet.service';
import { AuthService } from '../../services/auth.service';

interface TradeOrder {
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
}

@Component({
  selector: 'app-trading-interface',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="trading-container">
      <!-- Header -->
      <div class="trading-header">
        <h1 class="trading-title">Trading</h1>
        <p class="trading-subtitle">Buy and sell cryptocurrencies with real-time prices</p>
      </div>

      <div class="trading-content">
        <!-- Market Overview -->
        <div class="market-overview-section">
          <div class="section-header">
            <h3>Market Overview</h3>
            <div class="market-indicators">
              <div class="indicator">
                <span class="indicator-label">Fear & Greed:</span>
                <span class="indicator-value" [style.color]="getFearGreedColor()">
                  {{ marketData?.fearGreedIndex || 0 }}/100 {{ getFearGreedLabel() }}
                </span>
              </div>
              <div class="indicator">
                <span class="indicator-label">BTC Dominance:</span>
                <span class="indicator-value">{{ marketData?.btcDominance?.toFixed(1) || 0 }}%</span>
              </div>
            </div>
          </div>

          <div class="crypto-grid">
            <div class="crypto-card" *ngFor="let crypto of topCryptos; trackBy: trackBySymbol"
                 [class.selected]="selectedCrypto?.symbol === crypto.symbol"
                 (click)="selectCrypto(crypto)">
              <div class="crypto-header">
                <div class="crypto-info">
                  <span class="crypto-icon">{{ crypto.icon }}</span>
                  <div class="crypto-details">
                    <span class="crypto-name">{{ crypto.name }}</span>
                    <span class="crypto-symbol">{{ crypto.symbol }}</span>
                  </div>
                </div>
                <div class="crypto-price">
                  <span class="price">{{ formatCurrency(crypto.price) }}</span>
                  <span class="change" [class.positive]="crypto.changePercent24h >= 0"
                        [class.negative]="crypto.changePercent24h < 0">
                    {{ formatPercentage(crypto.changePercent24h) }}
                  </span>
                </div>
              </div>

              <div class="crypto-stats">
                <div class="stat">
                  <span class="stat-label">24h Volume</span>
                  <span class="stat-value">{{ formatCurrency(crypto.volume24h) }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Market Cap</span>
                  <span class="stat-value">{{ formatCurrency(crypto.marketCap) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Trading Interface -->
        <div class="trading-interface-section" *ngIf="selectedCrypto">
          <div class="trading-panel">
            <!-- Price Chart Placeholder -->
            <div class="price-chart">
              <div class="chart-header">
                <h3>{{ selectedCrypto.name }} ({{ selectedCrypto.symbol }})</h3>
                <div class="price-display">
                  <span class="current-price">{{ formatCurrency(selectedCrypto.price) }}</span>
                  <span class="price-change" [class.positive]="selectedCrypto.changePercent24h >= 0"
                        [class.negative]="selectedCrypto.changePercent24h < 0">
                    {{ formatPercentage(selectedCrypto.changePercent24h) }}
                  </span>
                </div>
              </div>

              <div class="chart-placeholder">
                <div class="chart-icon">📈</div>
                <p>Interactive price chart will be implemented here</p>
                <p class="chart-note">Real-time candlestick charts with technical indicators</p>
              </div>
            </div>

            <!-- Trading Form -->
            <div class="trading-form">
              <div class="form-tabs">
                <button class="tab-button" [class.active]="activeTab === 'buy'"
                        (click)="setActiveTab('buy')">
                  Buy {{ selectedCrypto.symbol }}
                </button>
                <button class="tab-button" [class.active]="activeTab === 'sell'"
                        (click)="setActiveTab('sell')">
                  Sell {{ selectedCrypto.symbol }}
                </button>
              </div>

              <form class="order-form" [ngSwitch]="activeTab">
                <!-- Buy Form -->
                <div *ngSwitchCase="'buy'" class="order-form-content">
                  <div class="form-group">
                    <label for="buy-amount">Amount ({{ selectedCrypto.symbol }})</label>
                    <input type="number" id="buy-amount" [(ngModel)]="buyOrder.amount"
                           name="buyAmount" placeholder="0.00" min="0" step="0.00000001"
                           (input)="calculateBuyTotal()">
                    <div class="input-actions">
                      <button type="button" class="action-btn" (click)="setMaxBuyAmount()">Max</button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="buy-price">Price (USD)</label>
                    <input type="number" id="buy-price" [(ngModel)]="buyOrder.price"
                           name="buyPrice" placeholder="0.00" min="0" step="0.01"
                           (input)="calculateBuyTotal()">
                    <div class="input-actions">
                      <button type="button" class="action-btn" (click)="setMarketPrice('buy')">Market</button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Total (USD)</label>
                    <input type="number" [value]="buyOrder.total" readonly
                           placeholder="0.00" class="readonly-input">
                  </div>

                  <div class="order-summary" *ngIf="buyOrder.amount > 0">
                    <div class="summary-row">
                      <span>Fee (0.1%):</span>
                      <span>{{ formatCurrency(buyOrder.total * 0.001) }}</span>
                    </div>
                    <div class="summary-row total">
                      <span>Total Cost:</span>
                      <span>{{ formatCurrency(buyOrder.total + (buyOrder.total * 0.001)) }}</span>
                    </div>
                  </div>

                  <button type="button" class="order-button buy-button"
                          [disabled]="!canPlaceBuyOrder()"
                          (click)="placeBuyOrder()">
                    <span class="button-icon">🛒</span>
                    Buy {{ selectedCrypto.symbol }}
                  </button>
                </div>

                <!-- Sell Form -->
                <div *ngSwitchCase="'sell'" class="order-form-content">
                  <div class="balance-info" *ngIf="getBalanceForSymbol(selectedCrypto.symbol) as balance">
                    <span class="balance-label">Available:</span>
                    <span class="balance-value">{{ formatCrypto(balance.available, selectedCrypto.symbol) }}</span>
                  </div>

                  <div class="form-group">
                    <label for="sell-amount">Amount ({{ selectedCrypto.symbol }})</label>
                    <input type="number" id="sell-amount" [(ngModel)]="sellOrder.amount"
                           name="sellAmount" placeholder="0.00" min="0" step="0.00000001"
                           [max]="getMaxSellAmount()" (input)="calculateSellTotal()">
                    <div class="input-actions">
                      <button type="button" class="action-btn" (click)="setMaxSellAmount()">Max</button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="sell-price">Price (USD)</label>
                    <input type="number" id="sell-price" [(ngModel)]="sellOrder.price"
                           name="sellPrice" placeholder="0.00" min="0" step="0.01"
                           (input)="calculateSellTotal()">
                    <div class="input-actions">
                      <button type="button" class="action-btn" (click)="setMarketPrice('sell')">Market</button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Total (USD)</label>
                    <input type="number" [value]="sellOrder.total" readonly
                           placeholder="0.00" class="readonly-input">
                  </div>

                  <div class="order-summary" *ngIf="sellOrder.amount > 0">
                    <div class="summary-row">
                      <span>Fee (0.1%):</span>
                      <span>{{ formatCurrency(sellOrder.total * 0.001) }}</span>
                    </div>
                    <div class="summary-row total">
                      <span>Total Received:</span>
                      <span>{{ formatCurrency(sellOrder.total - (sellOrder.total * 0.001)) }}</span>
                    </div>
                  </div>

                  <button type="button" class="order-button sell-button"
                          [disabled]="!canPlaceSellOrder()"
                          (click)="placeSellOrder()">
                    <span class="button-icon">💰</span>
                    Sell {{ selectedCrypto.symbol }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="recent-orders">
            <div class="section-header">
              <h3>Recent Orders</h3>
              <button class="view-all-btn" routerLink="/transactions">View All</button>
            </div>

            <div class="orders-list">
              <div class="order-item" *ngFor="let order of recentOrders">
                <div class="order-icon" [style.background-color]="getOrderTypeColor(order.type)">
                  <span>{{ getOrderTypeIcon(order.type) }}</span>
                </div>
                <div class="order-info">
                  <div class="order-description">
                    {{ order.type === 'buy' ? 'Bought' : 'Sold' }} {{ formatCrypto(order.amount, order.symbol) }}
                  </div>
                  <div class="order-meta">
                    <span class="order-date">{{ order.timestamp | date:'short' }}</span>
                    <span class="order-status" [style.color]="walletService.getTransactionStatusColor(order.status)">
                      {{ walletService.getTransactionStatusText(order.status) }}
                    </span>
                  </div>
                </div>
                <div class="order-amount">
                  <div class="amount-value" [class.positive]="order.type === 'buy'" [class.negative]="order.type === 'sell'">
                    {{ order.type === 'buy' ? '-' : '+' }}{{ formatCurrency(order.total) }}
                  </div>
                  <div class="amount-price">@ {{ formatCurrency(order.price) }}</div>
                </div>
              </div>

              <div class="no-orders" *ngIf="recentOrders.length === 0">
                <div class="no-orders-icon">📋</div>
                <p>No recent orders</p>
                <p class="no-orders-note">Your trading history will appear here</p>
              </div>
            </div>
          </div>
        </div>

        <!-- No Crypto Selected -->
        <div class="no-selection" *ngIf="!selectedCrypto">
          <div class="no-selection-content">
            <div class="no-selection-icon">📊</div>
            <h3>Select a Cryptocurrency</h3>
            <p>Choose a cryptocurrency from the market overview to start trading</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trading-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      background: var(--bg-primary);
      min-height: 100vh;
    }

    .trading-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .trading-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .trading-subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
      margin: 0.5rem 0 0 0;
    }

    .trading-content {
      display: grid;
      gap: 2rem;
    }

    /* Market Overview */
    .market-overview-section {
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

    .market-indicators {
      display: flex;
      gap: 2rem;
    }

    .indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .indicator-label {
      color: var(--text-secondary);
    }

    .indicator-value {
      font-weight: 500;
    }

    .crypto-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .crypto-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .crypto-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      border-color: var(--primary-color);
    }

    .crypto-card.selected {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .crypto-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .crypto-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .crypto-icon {
      font-size: 1.5rem;
    }

    .crypto-details {
      display: flex;
      flex-direction: column;
    }

    .crypto-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .crypto-symbol {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .crypto-price {
      text-align: right;
    }

    .crypto-price .price {
      display: block;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .crypto-price .change {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .crypto-price .change.positive {
      color: #10b981;
    }

    .crypto-price .change.negative {
      color: #ef4444;
    }

    .crypto-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    /* Trading Interface */
    .trading-interface-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }

    .trading-panel {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .price-chart {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .chart-header h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .price-display {
      text-align: right;
    }

    .current-price {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .price-change {
      font-size: 1rem;
      font-weight: 500;
    }

    .price-change.positive {
      color: #10b981;
    }

    .price-change.negative {
      color: #ef4444;
    }

    .chart-placeholder {
      height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 2px dashed var(--border-color);
      text-align: center;
      color: var(--text-secondary);
    }

    .chart-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .chart-note {
      font-size: 0.9rem;
      opacity: 0.7;
      margin-top: 0.5rem;
    }

    .trading-form {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
    }

    .form-tabs {
      display: flex;
      margin-bottom: 1.5rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      padding: 0.25rem;
    }

    .tab-button {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: 0.25rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .tab-button.active {
      background: var(--primary-color);
      color: white;
    }

    .tab-button:hover:not(.active) {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .order-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
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

    .form-group input.readonly-input {
      background: var(--bg-hover);
      cursor: not-allowed;
    }

    .input-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .action-btn {
      padding: 0.25rem 0.75rem;
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: 0.25rem;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .balance-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .balance-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .balance-value {
      font-weight: 600;
      color: var(--text-primary);
    }

    .order-summary {
      background: var(--bg-primary);
      border-radius: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--border-color);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .summary-row.total {
      border-top: 1px solid var(--border-color);
      padding-top: 0.5rem;
      margin-top: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
    }

    .summary-row:last-child {
      margin-bottom: 0;
    }

    .order-button {
      padding: 1rem 2rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
      margin-top: 1rem;
    }

    .order-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .buy-button {
      background: #10b981;
      color: white;
    }

    .buy-button:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
    }

    .sell-button {
      background: #ef4444;
      color: white;
    }

    .sell-button:hover:not(:disabled) {
      background: #dc2626;
      transform: translateY(-1px);
    }

    .recent-orders {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
    }

    .view-all-btn {
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--primary-color);
      border: 1px solid var(--primary-color);
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .view-all-btn:hover {
      background: var(--primary-color);
      color: white;
    }

    .orders-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    .order-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
      transition: all 0.2s;
    }

    .order-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .order-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2rem;
    }

    .order-info {
      flex: 1;
    }

    .order-description {
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .order-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .order-amount {
      text-align: right;
    }

    .amount-value {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .amount-value.positive {
      color: #10b981;
    }

    .amount-value.negative {
      color: #ef4444;
    }

    .amount-price {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .no-orders {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .no-orders-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-orders-note {
      font-size: 0.9rem;
      opacity: 0.7;
      margin-top: 0.5rem;
    }

    .no-selection {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      background: var(--bg-secondary);
      border-radius: 1rem;
      border: 1px solid var(--border-color);
    }

    .no-selection-content {
      text-align: center;
      color: var(--text-secondary);
    }

    .no-selection-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-selection-content h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
      font-size: 1.5rem;
    }

    .no-selection-content p {
      margin: 0;
      font-size: 1rem;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .trading-interface-section {
        grid-template-columns: 1fr;
      }

      .crypto-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .trading-container {
        padding: 1rem;
      }

      .market-indicators {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .form-tabs {
        flex-direction: column;
      }

      .order-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .order-amount {
        text-align: left;
      }
    }
  `]
})
export class TradingInterfaceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  topCryptos: CryptoCurrency[] = [];
  selectedCrypto: CryptoCurrency | null = null;
  marketData: any = null;

  activeTab: 'buy' | 'sell' = 'buy';

  buyOrder: TradeOrder = {
    symbol: '',
    type: 'buy',
    amount: 0,
    price: 0,
    total: 0
  };

  sellOrder: TradeOrder = {
    symbol: '',
    type: 'sell',
    amount: 0,
    price: 0,
    total: 0
  };

  recentOrders: Transaction[] = [];

  constructor(
    private cryptoDataService: CryptoDataService,
    public walletService: WalletService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadMarketData();
    this.loadRecentOrders();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMarketData() {
    // Load top cryptocurrencies
    this.cryptoDataService.getTopCryptocurrencies(8).pipe(takeUntil(this.destroy$)).subscribe((cryptos: CryptoCurrency[]) => {
      this.topCryptos = cryptos;
      // Auto-select first crypto if none selected
      if (!this.selectedCrypto && cryptos.length > 0) {
        this.selectCrypto(cryptos[0]);
      }
    });

    // Load market data
    this.cryptoDataService.getMarketData().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.marketData = data;
    });
  }

  private loadRecentOrders() {
    this.walletService.getTransactions(10).pipe(takeUntil(this.destroy$)).subscribe((transactions: Transaction[]) => {
      this.recentOrders = transactions.filter(tx => tx.type === 'buy' || tx.type === 'sell');
    });
  }

  private setupRealTimeUpdates() {
    // Update prices every 5 seconds
    setInterval(() => {
      if (this.selectedCrypto) {
        this.updateSelectedCryptoPrice();
      }
    }, 5000);
  }

  private updateSelectedCryptoPrice() {
    if (!this.selectedCrypto) return;

    this.cryptoDataService.getCryptocurrencyBySymbol(this.selectedCrypto.symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe((crypto: CryptoCurrency | undefined) => {
        if (crypto) {
          this.selectedCrypto = crypto;
          // Update order prices if using market price
          if (this.buyOrder.price === this.selectedCrypto.price) {
            this.calculateBuyTotal();
          }
          if (this.sellOrder.price === this.selectedCrypto.price) {
            this.calculateSellTotal();
          }
        }
      });
  }

  selectCrypto(crypto: CryptoCurrency) {
    this.selectedCrypto = crypto;
    this.buyOrder.symbol = crypto.symbol;
    this.sellOrder.symbol = crypto.symbol;
    this.setMarketPrice('buy');
    this.setMarketPrice('sell');
  }

  setActiveTab(tab: 'buy' | 'sell') {
    this.activeTab = tab;
  }

  setMarketPrice(orderType: 'buy' | 'sell') {
    if (!this.selectedCrypto) return;

    if (orderType === 'buy') {
      this.buyOrder.price = this.selectedCrypto.price;
      this.calculateBuyTotal();
    } else {
      this.sellOrder.price = this.selectedCrypto.price;
      this.calculateSellTotal();
    }
  }

  calculateBuyTotal() {
    this.buyOrder.total = this.buyOrder.amount * this.buyOrder.price;
  }

  calculateSellTotal() {
    this.sellOrder.total = this.sellOrder.amount * this.sellOrder.price;
  }

  setMaxBuyAmount() {
    // In a real app, this would check user's USD balance
    // For demo, set a reasonable max
    this.buyOrder.amount = 10000 / this.buyOrder.price; // Max $10,000 worth
    this.calculateBuyTotal();
  }

  setMaxSellAmount() {
    if (!this.selectedCrypto) return;

    const balance = this.getBalanceForSymbol(this.selectedCrypto.symbol);
    if (balance) {
      this.sellOrder.amount = balance.available;
      this.calculateSellTotal();
    }
  }

  getMaxSellAmount(): number {
    if (!this.selectedCrypto) return 0;

    const balance = this.getBalanceForSymbol(this.selectedCrypto.symbol);
    return balance ? balance.available : 0;
  }

  getBalanceForSymbol(symbol: string): WalletBalance | undefined {
    // This would normally come from the wallet service
    // For demo purposes, we'll return mock data
    return {
      symbol,
      amount: symbol === 'BTC' ? 0.54321 : symbol === 'ETH' ? 12.5 : 100,
      valueUSD: 0,
      available: symbol === 'BTC' ? 0.54321 : symbol === 'ETH' ? 12.5 : 100,
      inOrders: 0,
      icon: symbol === 'BTC' ? '₿' : symbol === 'ETH' ? 'Ξ' : '●'
    };
  }

  canPlaceBuyOrder(): boolean {
    return this.buyOrder.amount > 0 && this.buyOrder.price > 0 && this.buyOrder.total > 0;
  }

  canPlaceSellOrder(): boolean {
    if (!this.selectedCrypto) return false;

    const balance = this.getBalanceForSymbol(this.selectedCrypto.symbol);
    return this.sellOrder.amount > 0 &&
           this.sellOrder.price > 0 &&
           this.sellOrder.total > 0 &&
           balance ? this.sellOrder.amount <= balance.available : false;
  }

  async placeBuyOrder() {
    if (!this.canPlaceBuyOrder() || !this.selectedCrypto) return;

    try {
      const order = await this.walletService.createBuyOrder(
        this.selectedCrypto.symbol,
        this.buyOrder.amount,
        this.buyOrder.price
      );

      // Reset form
      this.buyOrder.amount = 0;
      this.buyOrder.total = 0;

      // Refresh orders
      this.loadRecentOrders();

      // Show success message (in a real app)
      console.log('Buy order placed successfully:', order);
    } catch (error) {
      console.error('Error placing buy order:', error);
      // Show error message (in a real app)
    }
  }

  async placeSellOrder() {
    if (!this.canPlaceSellOrder() || !this.selectedCrypto) return;

    try {
      const order = await this.walletService.createSellOrder(
        this.selectedCrypto.symbol,
        this.sellOrder.amount,
        this.sellOrder.price
      );

      // Reset form
      this.sellOrder.amount = 0;
      this.sellOrder.total = 0;

      // Refresh orders
      this.loadRecentOrders();

      // Show success message (in a real app)
      console.log('Sell order placed successfully:', order);
    } catch (error) {
      console.error('Error placing sell order:', error);
      // Show error message (in a real app)
    }
  }

  getOrderTypeColor(type: Transaction['type']): string {
    switch (type) {
      case 'buy': return '#10b981';
      case 'sell': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getOrderTypeIcon(type: Transaction['type']): string {
    switch (type) {
      case 'buy': return '🛒';
      case 'sell': return '💰';
      default: return '🔄';
    }
  }

  getFearGreedColor(): string {
    return this.cryptoDataService.getFearGreedColor(this.marketData?.fearGreedIndex || 0);
  }

  getFearGreedLabel(): string {
    return this.cryptoDataService.getFearGreedLabel(this.marketData?.fearGreedIndex || 0);
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

  trackBySymbol(index: number, crypto: CryptoCurrency): string {
    return crypto.symbol;
  }
}
