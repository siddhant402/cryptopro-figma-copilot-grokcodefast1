import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  icon: string;
}

interface TradeOrder {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  timestamp: Date;
}

@Component({
  selector: 'app-trading-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="trading-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h1>Trading Dashboard</h1>
        <div class="header-actions">
          <button class="refresh-btn" (click)="refreshData()">
            <i class="refresh-icon"></i>
            Refresh
          </button>
          <div class="balance-card">
            <span class="balance-label">Portfolio Balance</span>
            <span class="balance-amount">$12,543.67</span>
          </div>
        </div>
      </div>

      <!-- Market Overview -->
      <div class="market-overview">
        <h2>Market Overview</h2>
        <div class="crypto-grid">
          <div
            class="crypto-card"
            *ngFor="let crypto of cryptoData"
            [class]="crypto.change >= 0 ? 'positive' : 'negative'">
            <div class="crypto-header">
              <div class="crypto-info">
                <span class="crypto-icon">{{ crypto.icon }}</span>
                <div>
                  <h3>{{ crypto.symbol }}</h3>
                  <p>{{ crypto.name }}</p>
                </div>
              </div>
              <div class="crypto-price">
                <span class="price">\${{ crypto.price.toFixed(2) }}</span>
                <span class="change" [class]="crypto.change >= 0 ? 'positive' : 'negative'">
                  {{ crypto.change >= 0 ? '+' : '' }}\${{ crypto.change.toFixed(2) }}
                  ({{ crypto.changePercent >= 0 ? '+' : '' }}{{ crypto.changePercent.toFixed(2) }}%)
                </span>
              </div>
            </div>
            <div class="crypto-stats">
              <div class="stat">
                <span class="stat-label">Volume</span>
                <span class="stat-value">{{ crypto.volume }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Market Cap</span>
                <span class="stat-value">{{ crypto.marketCap }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trading Interface -->
      <div class="trading-interface">
        <div class="trading-panel">
          <h2>Quick Trade</h2>
          <div class="trade-form">
            <div class="form-row">
              <div class="form-group">
                <label>Trading Pair</label>
                <select class="form-select" [(ngModel)]="selectedPair">
                  <option *ngFor="let crypto of cryptoData" [value]="crypto.symbol">
                    {{ crypto.symbol }} - {{ crypto.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Order Type</label>
                <select class="form-select" [(ngModel)]="orderType">
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="tradeAmount"
                  placeholder="Enter amount">
              </div>
              <div class="form-group">
                <label>Price (USD)</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="tradePrice"
                  placeholder="Enter price">
              </div>
            </div>

            <div class="trade-summary">
              <div class="summary-row">
                <span>Total Value:</span>
                <span>\${{ (tradeAmount * tradePrice).toFixed(2) }}</span>
              </div>
              <div class="summary-row">
                <span>Fee (0.1%):</span>
                <span>\${{ (tradeAmount * tradePrice * 0.001).toFixed(2) }}</span>
              </div>
            </div>

            <button
              class="trade-btn"
              [class]="orderType === 'buy' ? 'buy-btn' : 'sell-btn'"
              (click)="executeTrade()"
              [disabled]="!tradeAmount || !tradePrice">
              {{ orderType === 'buy' ? 'Buy' : 'Sell' }} {{ selectedPair }}
            </button>
          </div>
        </div>

        <!-- Recent Orders -->
        <div class="orders-panel">
          <h2>Recent Orders</h2>
          <div class="orders-list">
            <div
              class="order-item"
              *ngFor="let order of recentOrders"
              [class]="order.type">
              <div class="order-info">
                <span class="order-type">{{ order.type.toUpperCase() }}</span>
                <span class="order-symbol">{{ order.symbol }}</span>
              </div>
              <div class="order-details">
                <span class="order-amount">{{ order.amount }} @ \${{ order.price }}</span>
                <span class="order-status" [class]="order.status">{{ order.status }}</span>
              </div>
              <div class="order-time">
                {{ order.timestamp | date:'short' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Portfolio Chart Placeholder -->
      <div class="portfolio-chart">
        <h2>Portfolio Performance</h2>
        <div class="chart-placeholder">
          <div class="chart-icon">📊</div>
          <p>Portfolio chart will be displayed here</p>
          <small>Integration with charting library coming soon</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trading-dashboard {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: 100vh;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      background: white;
      padding: 2rem;
      border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .dashboard-header h1 {
      color: #1e3a8a;
      font-size: 2rem;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.3s ease;
    }

    .refresh-btn:hover {
      background: #5a67d8;
    }

    .balance-card {
      background: linear-gradient(45deg, #667eea, #764ba2);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      text-align: center;
    }

    .balance-label {
      display: block;
      font-size: 0.8rem;
      opacity: 0.9;
      margin-bottom: 0.25rem;
    }

    .balance-amount {
      font-size: 1.2rem;
      font-weight: 700;
    }

    .market-overview, .trading-interface, .portfolio-chart {
      background: white;
      border-radius: 15px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .market-overview h2, .trading-interface h2, .portfolio-chart h2 {
      color: #1e3a8a;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }

    .crypto-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .crypto-card {
      border: 1px solid #e9ecef;
      border-radius: 10px;
      padding: 1.5rem;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .crypto-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
    }

    .crypto-card.positive {
      border-left: 4px solid #10b981;
    }

    .crypto-card.negative {
      border-left: 4px solid #ef4444;
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
      font-size: 2rem;
    }

    .crypto-info h3 {
      margin: 0;
      color: #1e3a8a;
      font-size: 1.1rem;
    }

    .crypto-info p {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .crypto-price {
      text-align: right;
    }

    .price {
      display: block;
      font-size: 1.2rem;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 0.25rem;
    }

    .change {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .change.positive {
      color: #10b981;
    }

    .change.negative {
      color: #ef4444;
    }

    .crypto-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }

    .stat-label {
      color: #6c757d;
      margin-right: 0.5rem;
    }

    .trading-interface {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }

    .trade-form {
      margin-bottom: 2rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      flex: 1;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #1e3a8a;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .form-select, .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-select:focus, .form-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .trade-summary {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .trade-btn {
      width: 100%;
      padding: 1rem;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.3s ease;
    }

    .buy-btn {
      background: linear-gradient(45deg, #10b981, #059669);
      color: white;
    }

    .sell-btn {
      background: linear-gradient(45deg, #ef4444, #dc2626);
      color: white;
    }

    .trade-btn:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .trade-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .orders-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .order-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      transition: background 0.3s ease;
    }

    .order-item:hover {
      background: #f8f9fa;
    }

    .order-item.buy {
      border-left: 4px solid #10b981;
    }

    .order-item.sell {
      border-left: 4px solid #ef4444;
    }

    .order-info {
      display: flex;
      flex-direction: column;
    }

    .order-type {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      text-align: center;
      margin-bottom: 0.25rem;
    }

    .order-item.buy .order-type {
      background: #10b981;
      color: white;
    }

    .order-item.sell .order-type {
      background: #ef4444;
      color: white;
    }

    .order-symbol {
      font-weight: 600;
      color: #1e3a8a;
    }

    .order-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .order-amount {
      font-size: 0.9rem;
      color: #6c757d;
      margin-bottom: 0.25rem;
    }

    .order-status {
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .order-status.pending {
      background: #fbbf24;
      color: white;
    }

    .order-status.completed {
      background: #10b981;
      color: white;
    }

    .order-status.cancelled {
      background: #ef4444;
      color: white;
    }

    .order-time {
      font-size: 0.8rem;
      color: #6c757d;
    }

    .chart-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      background: #f8f9fa;
      border-radius: 10px;
      border: 2px dashed #e9ecef;
    }

    .chart-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .chart-placeholder p {
      color: #6c757d;
      margin-bottom: 0.5rem;
    }

    .chart-placeholder small {
      color: #adb5bd;
    }

    @media (max-width: 768px) {
      .trading-dashboard {
        padding: 1rem;
      }

      .dashboard-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .header-actions {
        flex-direction: column;
        width: 100%;
      }

      .balance-card {
        width: 100%;
      }

      .crypto-grid {
        grid-template-columns: 1fr;
      }

      .trading-interface {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .form-row {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  `]
})
export class TradingDashboardComponent implements OnInit {
  cryptoData: CryptoData[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 43250.75,
      change: 1250.30,
      changePercent: 2.98,
      volume: '28.5B',
      marketCap: '845.2B',
      icon: '₿'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 2650.45,
      change: -85.20,
      changePercent: -3.11,
      volume: '12.3B',
      marketCap: '318.7B',
      icon: 'Ξ'
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      price: 0.45,
      change: 0.02,
      changePercent: 4.65,
      volume: '1.2B',
      marketCap: '15.8B',
      icon: '₳'
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      price: 6.85,
      change: 0.35,
      changePercent: 5.38,
      volume: '890M',
      marketCap: '8.9B',
      icon: '●'
    }
  ];

  recentOrders: TradeOrder[] = [
    {
      id: '1',
      type: 'buy',
      symbol: 'BTC',
      amount: 0.05,
      price: 43100.00,
      total: 2155.00,
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      id: '2',
      type: 'sell',
      symbol: 'ETH',
      amount: 2.5,
      price: 2680.00,
      total: 6700.00,
      status: 'pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
    },
    {
      id: '3',
      type: 'buy',
      symbol: 'ADA',
      amount: 1000,
      price: 0.44,
      total: 440.00,
      status: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    }
  ];

  selectedPair = 'BTC';
  orderType: 'buy' | 'sell' = 'buy';
  tradeAmount = 0;
  tradePrice = 0;

  ngOnInit() {
    // Initialize component
    this.updatePrices();
  }

  refreshData() {
    this.updatePrices();
    console.log('Data refreshed');
  }

  updatePrices() {
    // Simulate real-time price updates
    this.cryptoData.forEach(crypto => {
      const randomChange = (Math.random() - 0.5) * 100;
      crypto.price += randomChange;
      crypto.change = randomChange;
      crypto.changePercent = (randomChange / crypto.price) * 100;
    });
  }

  executeTrade() {
    if (this.tradeAmount && this.tradePrice) {
      const newOrder: TradeOrder = {
        id: Date.now().toString(),
        type: this.orderType,
        symbol: this.selectedPair,
        amount: this.tradeAmount,
        price: this.tradePrice,
        total: this.tradeAmount * this.tradePrice,
        status: 'pending',
        timestamp: new Date()
      };

      this.recentOrders.unshift(newOrder);

      // Reset form
      this.tradeAmount = 0;
      this.tradePrice = 0;

      console.log('Trade executed:', newOrder);
    }
  }
}
