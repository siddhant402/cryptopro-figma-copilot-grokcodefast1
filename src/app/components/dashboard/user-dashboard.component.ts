import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { CryptoDataService, CryptoCurrency } from '../../services/crypto-data.service';
import { WalletService, Portfolio, Transaction, WalletBalance } from '../../services/wallet.service';
import { AuthService, User, AuthState } from '../../services/auth.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">Dashboard</h1>
          <p class="dashboard-subtitle">Welcome back, {{ user?.firstName || 'Trader' }}!</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="refreshData()">
            <span class="icon">🔄</span>
            Refresh
          </button>
        </div>
      </div>

      <!-- Portfolio Overview -->
      <div class="portfolio-overview" *ngIf="portfolio">
        <div class="overview-card total-value">
          <div class="card-header">
            <h3>Total Portfolio Value</h3>
            <span class="last-updated">Updated {{ lastUpdated | date:'shortTime' }}</span>
          </div>
          <div class="card-value">
            <span class="value">{{ formatCurrency(portfolio.totalValue) }}</span>
            <span class="change" [class.positive]="portfolio.totalChangePercent24h >= 0"
                  [class.negative]="portfolio.totalChangePercent24h < 0">
              {{ formatPercentage(portfolio.totalChangePercent24h) }}
            </span>
          </div>
        </div>

        <div class="overview-card day-change">
          <div class="card-header">
            <h3>24h Change</h3>
          </div>
          <div class="card-value">
            <span class="value">{{ formatCurrency(portfolio.totalChange24h) }}</span>
            <span class="change" [class.positive]="portfolio.totalChangePercent24h >= 0"
                  [class.negative]="portfolio.totalChangePercent24h < 0">
              {{ formatPercentage(portfolio.totalChangePercent24h) }}
            </span>
          </div>
        </div>

        <div class="overview-card assets-count">
          <div class="card-header">
            <h3>Assets</h3>
          </div>
          <div class="card-value">
            <span class="value">{{ getActiveAssetsCount() }}</span>
            <span class="label">Active</span>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Portfolio Allocation -->
        <div class="dashboard-section portfolio-allocation">
          <div class="section-header">
            <h3>Portfolio Allocation</h3>
            <button class="btn-secondary" (click)="toggleAllocationView()">
              {{ showAllocationAsChart ? 'List View' : 'Chart View' }}
            </button>
          </div>

          <div class="allocation-content" *ngIf="portfolio">
            <!-- Chart View -->
            <div class="allocation-chart" *ngIf="showAllocationAsChart">
              <div class="chart-container">
                <svg class="pie-chart" viewBox="0 0 200 200">
                  <g *ngFor="let item of portfolio.allocation; let i = index">
                    <path [attr.d]="getPieSlicePath(item.percentage, i)"
                          [attr.fill]="item.color"
                          [attr.stroke]="item.color"
                          stroke-width="2"
                          class="pie-slice"
                          (mouseenter)="hoveredAllocation = item"
                          (mouseleave)="hoveredAllocation = null">
                    </path>
                  </g>
                  <circle cx="100" cy="100" r="60" fill="white" opacity="0.9"/>
                  <text x="100" y="95" text-anchor="middle" class="chart-center-text">
                    {{ portfolio.allocation.length }}
                  </text>
                  <text x="100" y="110" text-anchor="middle" class="chart-center-label">
                    Assets
                  </text>
                </svg>

                <div class="chart-tooltip" *ngIf="hoveredAllocation">
                  <div class="tooltip-symbol">{{ hoveredAllocation.symbol }}</div>
                  <div class="tooltip-value">{{ formatCurrency(hoveredAllocation.value) }}</div>
                  <div class="tooltip-percentage">{{ hoveredAllocation.percentage.toFixed(1) }}%</div>
                </div>
              </div>
            </div>

            <!-- List View -->
            <div class="allocation-list" *ngIf="!showAllocationAsChart">
              <div class="allocation-item" *ngFor="let item of portfolio.allocation">
                <div class="item-info">
                  <div class="item-symbol" [style.color]="item.color">{{ item.symbol }}</div>
                  <div class="item-value">{{ formatCurrency(item.value) }}</div>
                </div>
                <div class="item-percentage">
                  <div class="percentage-bar">
                    <div class="percentage-fill" [style.width.%]="item.percentage" [style.background-color]="item.color"></div>
                  </div>
                  <span class="percentage-text">{{ item.percentage.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Balance Details -->
        <div class="dashboard-section balance-details">
          <div class="section-header">
            <h3>Balance Details</h3>
            <button class="btn-secondary" (click)="showAllBalances = !showAllBalances">
              {{ showAllBalances ? 'Show Top 5' : 'Show All' }}
            </button>
          </div>

          <div class="balance-list">
            <div class="balance-item" *ngFor="let balance of displayedBalances">
              <div class="balance-info">
                <div class="balance-icon">{{ balance.icon }}</div>
                <div class="balance-details">
                  <div class="balance-symbol">{{ balance.symbol }}</div>
                  <div class="balance-amount">{{ formatCrypto(balance.amount, balance.symbol) }}</div>
                </div>
              </div>
              <div class="balance-value">
                <div class="value-usd">{{ formatCurrency(balance.valueUSD) }}</div>
                <div class="value-change" *ngIf="getBalanceChange(balance.symbol) as change">
                  <span [class.positive]="change >= 0" [class.negative]="change < 0">
                    {{ formatPercentage(change) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="dashboard-section recent-transactions">
          <div class="section-header">
            <h3>Recent Transactions</h3>
            <button class="btn-secondary" routerLink="/transactions">
              View All
            </button>
          </div>

          <div class="transactions-list">
            <div class="transaction-item" *ngFor="let transaction of recentTransactions">
              <div class="transaction-icon" [style.background-color]="getTransactionTypeColor(transaction.type)">
                <span>{{ getTransactionTypeIcon(transaction.type) }}</span>
              </div>
              <div class="transaction-info">
                <div class="transaction-description">{{ transaction.description }}</div>
                <div class="transaction-meta">
                  <span class="transaction-date">{{ transaction.timestamp | date:'short' }}</span>
                  <span class="transaction-status" [style.color]="walletService.getTransactionStatusColor(transaction.status)">
                    {{ walletService.getTransactionStatusText(transaction.status) }}
                  </span>
                </div>
              </div>
              <div class="transaction-amount">
                <div class="amount-value" [class.positive]="isPositiveTransaction(transaction)"
                      [class.negative]="!isPositiveTransaction(transaction)">
                  {{ getTransactionAmountDisplay(transaction) }}
                </div>
                <div class="amount-symbol">{{ transaction.symbol }}</div>
              </div>
            </div>

            <div class="no-transactions" *ngIf="recentTransactions.length === 0">
              <div class="no-data-icon">📊</div>
              <p>No transactions yet</p>
              <button class="btn-primary" routerLink="/trade">Start Trading</button>
            </div>
          </div>
        </div>

        <!-- Market Overview -->
        <div class="dashboard-section market-overview">
          <div class="section-header">
            <h3>Market Overview</h3>
            <button class="btn-secondary" routerLink="/market">
              View Market
            </button>
          </div>

          <div class="market-stats">
            <div class="market-stat">
              <div class="stat-label">Fear & Greed Index</div>
              <div class="stat-value" [style.color]="getFearGreedColor()">
                {{ marketData?.fearGreedIndex || 0 }}/100
              </div>
              <div class="stat-description">{{ getFearGreedLabel() }}</div>
            </div>

            <div class="market-stat">
              <div class="stat-label">BTC Dominance</div>
              <div class="stat-value">{{ marketData?.btcDominance?.toFixed(1) || 0 }}%</div>
              <div class="stat-description">Market share</div>
            </div>

            <div class="market-stat">
              <div class="stat-label">24h Volume</div>
              <div class="stat-value">{{ formatCurrency(marketData?.totalVolume24h || 0) }}</div>
              <div class="stat-description">Total volume</div>
            </div>
          </div>

          <div class="top-cryptos">
            <h4>Top Performers</h4>
            <div class="crypto-list">
              <div class="crypto-item" *ngFor="let crypto of topCryptos">
                <div class="crypto-info">
                  <span class="crypto-icon">{{ crypto.icon }}</span>
                  <span class="crypto-symbol">{{ crypto.symbol }}</span>
                </div>
                <div class="crypto-price">
                  <span class="price">{{ formatCurrency(crypto.price) }}</span>
                  <span class="change" [class.positive]="crypto.changePercent24h >= 0"
                        [class.negative]="crypto.changePercent24h < 0">
                    {{ formatPercentage(crypto.changePercent24h) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      background: var(--bg-primary);
      min-height: 100vh;
    }

    .dashboard-header {
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

    .portfolio-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .overview-card {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      transition: all 0.2s;
    }

    .overview-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-header h3 {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .last-updated {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .card-value {
      display: flex;
      align-items: baseline;
      gap: 1rem;
    }

    .card-value .value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .card-value .change {
      font-size: 1rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .card-value .change.positive {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .card-value .change.negative {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .assets-count .value {
      font-size: 2.5rem;
      color: var(--primary-color);
    }

    .assets-count .label {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-left: 0.5rem;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .dashboard-section {
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

    /* Portfolio Allocation */
    .allocation-chart {
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }

    .chart-container {
      position: relative;
      width: 200px;
      height: 200px;
    }

    .pie-chart {
      width: 100%;
      height: 100%;
    }

    .pie-slice {
      cursor: pointer;
      transition: all 0.2s;
    }

    .pie-slice:hover {
      opacity: 0.8;
    }

    .chart-center-text {
      font-size: 1.5rem;
      font-weight: 700;
      fill: var(--text-primary);
    }

    .chart-center-label {
      font-size: 0.8rem;
      fill: var(--text-secondary);
    }

    .chart-tooltip {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;
      min-width: 120px;
    }

    .tooltip-symbol {
      font-weight: 600;
      color: var(--text-primary);
    }

    .tooltip-value {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .tooltip-percentage {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .allocation-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .allocation-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
    }

    .item-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .item-symbol {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .item-value {
      color: var(--text-secondary);
    }

    .item-percentage {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 120px;
    }

    .percentage-bar {
      width: 80px;
      height: 8px;
      background: var(--bg-hover);
      border-radius: 4px;
      overflow: hidden;
    }

    .percentage-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .percentage-text {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-secondary);
      min-width: 35px;
      text-align: right;
    }

    /* Balance Details */
    .balance-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .balance-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
      transition: all 0.2s;
    }

    .balance-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .balance-info {
      display: flex;
      align-items: center;
      gap: 1rem;
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
    }

    .balance-amount {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .balance-value {
      text-align: right;
    }

    .value-usd {
      font-weight: 600;
      color: var(--text-primary);
    }

    .value-change {
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }

    .value-change .positive {
      color: #10b981;
    }

    .value-change .negative {
      color: #ef4444;
    }

    /* Recent Transactions */
    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .transaction-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
      transition: all 0.2s;
    }

    .transaction-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .transaction-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.2rem;
    }

    .transaction-info {
      flex: 1;
    }

    .transaction-description {
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .transaction-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .transaction-amount {
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

    .amount-symbol {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .no-transactions {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .no-data-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    /* Market Overview */
    .market-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .market-stat {
      text-align: center;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .stat-description {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .top-cryptos {
      margin-top: 1rem;
    }

    .top-cryptos h4 {
      margin: 0 0 1rem 0;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .crypto-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .crypto-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
    }

    .crypto-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .crypto-icon {
      font-size: 1.2rem;
    }

    .crypto-symbol {
      font-weight: 500;
      color: var(--text-primary);
    }

    .crypto-price {
      text-align: right;
    }

    .crypto-price .price {
      display: block;
      font-weight: 600;
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

    /* Responsive Design */
    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .portfolio-overview {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .market-stats {
        grid-template-columns: 1fr;
      }

      .allocation-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .item-percentage {
        width: 100%;
      }
    }
  `]
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  user: User | null = null;
  portfolio: Portfolio | null = null;
  recentTransactions: Transaction[] = [];
  displayedBalances: WalletBalance[] = [];
  marketData: any = null;
  topCryptos: CryptoCurrency[] = [];
  lastUpdated = new Date();

  showAllocationAsChart = true;
  showAllBalances = false;
  hoveredAllocation: any = null;

  constructor(
    private cryptoDataService: CryptoDataService,
    public walletService: WalletService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData() {
    // Load user data
    this.authService.getAuthState().pipe(takeUntil(this.destroy$)).subscribe((state: AuthState) => {
      this.user = state.user;
    });

    // Load portfolio data
    this.walletService.getPortfolio().pipe(takeUntil(this.destroy$)).subscribe((portfolio: Portfolio) => {
      this.portfolio = portfolio;
      this.updateDisplayedBalances();
    });

    // Load recent transactions
    this.walletService.getTransactions(5).pipe(takeUntil(this.destroy$)).subscribe((transactions: Transaction[]) => {
      this.recentTransactions = transactions;
    });

    // Load market data
    this.cryptoDataService.getMarketData().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.marketData = data;
    });

    // Load top cryptocurrencies
    this.cryptoDataService.getTopCryptocurrencies(5).pipe(takeUntil(this.destroy$)).subscribe((cryptos: CryptoCurrency[]) => {
      this.topCryptos = cryptos;
    });
  }

  private setupRealTimeUpdates() {
    // Update timestamp every minute
    setInterval(() => {
      this.lastUpdated = new Date();
    }, 60000);
  }

  private updateDisplayedBalances() {
    if (!this.portfolio) return;

    this.displayedBalances = this.showAllBalances
      ? this.portfolio.balances.filter((b: WalletBalance) => b.amount > 0)
      : this.portfolio.balances.filter((b: WalletBalance) => b.amount > 0).slice(0, 5);
  }

  getActiveAssetsCount(): number {
    return this.portfolio?.balances?.filter(b => b.amount > 0)?.length || 0;
  }

  toggleAllocationView() {
    this.showAllocationAsChart = !this.showAllocationAsChart;
  }

  refreshData() {
    this.loadDashboardData();
    this.lastUpdated = new Date();
  }

  getPieSlicePath(percentage: number, index: number): string {
    if (!this.portfolio) return '';

    const totalItems = this.portfolio.allocation.length;
    const anglePerPercent = 360 / 100;
    const startAngle = index * (360 / totalItems) - 90; // Start from top
    const endAngle = startAngle + (percentage * anglePerPercent);

    const centerX = 100;
    const centerY = 100;
    const radius = 80;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = percentage > 50 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  getBalanceChange(symbol: string): number | null {
    if (!this.topCryptos.length) return null;
    const crypto = this.topCryptos.find(c => c.symbol === symbol);
    return crypto ? crypto.changePercent24h : null;
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

  isPositiveTransaction(transaction: Transaction): boolean {
    return transaction.type === 'buy' || transaction.type === 'deposit';
  }

  getTransactionAmountDisplay(transaction: Transaction): string {
    const sign = this.isPositiveTransaction(transaction) ? '+' : '-';
    return `${sign}${this.formatCrypto(transaction.amount, transaction.symbol)}`;
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
}
