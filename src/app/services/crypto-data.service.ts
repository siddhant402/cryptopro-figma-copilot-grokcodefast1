import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CryptoCurrency {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
  icon: string;
}

export interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  fearGreedIndex: number;
}

export interface TradeOrder {
  id: string;
  userId: string;
  type: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  timestamp: Date;
  executedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CryptoDataService {
  private cryptocurrencies = new BehaviorSubject<CryptoCurrency[]>([]);
  private marketData = new BehaviorSubject<MarketData>({
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
    fearGreedIndex: 0
  });

  private tradeOrders = new BehaviorSubject<TradeOrder[]>([]);

  constructor() {
    this.initializeCryptoData();
    this.startRealTimeUpdates();
  }

  private initializeCryptoData() {
    const initialData: CryptoCurrency[] = [
      {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 43250.75,
        change24h: 1250.30,
        changePercent24h: 2.98,
        volume24h: 28500000000,
        marketCap: 845200000000,
        lastUpdated: new Date(),
        icon: '₿'
      },
      {
        id: 'ethereum',
        symbol: 'ETH',
        name: 'Ethereum',
        price: 2650.45,
        change24h: -85.20,
        changePercent24h: -3.11,
        volume24h: 12300000000,
        marketCap: 318700000000,
        lastUpdated: new Date(),
        icon: 'Ξ'
      },
      {
        id: 'cardano',
        symbol: 'ADA',
        name: 'Cardano',
        price: 0.45,
        change24h: 0.02,
        changePercent24h: 4.65,
        volume24h: 1200000000,
        marketCap: 15800000000,
        lastUpdated: new Date(),
        icon: '₳'
      },
      {
        id: 'polkadot',
        symbol: 'DOT',
        name: 'Polkadot',
        price: 6.85,
        change24h: 0.35,
        changePercent24h: 5.38,
        volume24h: 890000000,
        marketCap: 8900000000,
        lastUpdated: new Date(),
        icon: '●'
      },
      {
        id: 'solana',
        symbol: 'SOL',
        name: 'Solana',
        price: 98.32,
        change24h: 5.67,
        changePercent24h: 6.12,
        volume24h: 3200000000,
        marketCap: 45200000000,
        lastUpdated: new Date(),
        icon: '◎'
      },
      {
        id: 'chainlink',
        symbol: 'LINK',
        name: 'Chainlink',
        price: 14.85,
        change24h: -0.45,
        changePercent24h: -2.94,
        volume24h: 780000000,
        marketCap: 8900000000,
        lastUpdated: new Date(),
        icon: '🔗'
      }
    ];

    this.cryptocurrencies.next(initialData);
    this.updateMarketData(initialData);
  }

  private startRealTimeUpdates() {
    // Update prices every 5 seconds
    interval(5000).subscribe(() => {
      this.updatePrices();
    });

    // Update market data every 30 seconds
    interval(30000).subscribe(() => {
      this.updateMarketData(this.cryptocurrencies.value);
    });
  }

  private updatePrices() {
    const currentData = this.cryptocurrencies.value;
    const updatedData = currentData.map(crypto => ({
      ...crypto,
      price: this.generatePriceUpdate(crypto.price),
      change24h: this.generateChangeUpdate(crypto.change24h),
      changePercent24h: this.generatePercentUpdate(crypto.changePercent24h),
      lastUpdated: new Date()
    }));

    this.cryptocurrencies.next(updatedData);
  }

  private generatePriceUpdate(currentPrice: number): number {
    const volatility = 0.02; // 2% max change per update
    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
    return Math.max(0, currentPrice + change);
  }

  private generateChangeUpdate(currentChange: number): number {
    const change = (Math.random() - 0.5) * 100;
    return currentChange + change;
  }

  private generatePercentUpdate(currentPercent: number): number {
    const change = (Math.random() - 0.5) * 2;
    return currentPercent + change;
  }

  private updateMarketData(cryptoData: CryptoCurrency[]) {
    const totalMarketCap = cryptoData.reduce((sum, crypto) => sum + crypto.marketCap, 0);
    const totalVolume24h = cryptoData.reduce((sum, crypto) => sum + crypto.volume24h, 0);
    const btcData = cryptoData.find(crypto => crypto.symbol === 'BTC');
    const btcDominance = btcData ? (btcData.marketCap / totalMarketCap) * 100 : 0;

    const newMarketData: MarketData = {
      totalMarketCap,
      totalVolume24h,
      btcDominance,
      fearGreedIndex: this.generateFearGreedIndex()
    };

    this.marketData.next(newMarketData);
  }

  private generateFearGreedIndex(): number {
    // Generate a random fear & greed index between 0-100
    return Math.floor(Math.random() * 100);
  }

  // Public methods
  getCryptocurrencies(): Observable<CryptoCurrency[]> {
    return this.cryptocurrencies.asObservable();
  }

  getMarketData(): Observable<MarketData> {
    return this.marketData.asObservable();
  }

  getCryptocurrencyBySymbol(symbol: string): Observable<CryptoCurrency | undefined> {
    return this.cryptocurrencies.pipe(
      map(cryptos => cryptos.find(crypto => crypto.symbol === symbol))
    );
  }

  getTopCryptocurrencies(limit: number = 10): Observable<CryptoCurrency[]> {
    return this.cryptocurrencies.pipe(
      map(cryptos => cryptos.slice(0, limit))
    );
  }

  getGainers(): Observable<CryptoCurrency[]> {
    return this.cryptocurrencies.pipe(
      map(cryptos => [...cryptos].sort((a, b) => b.changePercent24h - a.changePercent24h))
    );
  }

  getLosers(): Observable<CryptoCurrency[]> {
    return this.cryptocurrencies.pipe(
      map(cryptos => [...cryptos].sort((a, b) => a.changePercent24h - b.changePercent24h))
    );
  }

  // Trading methods
  getTradeOrders(): Observable<TradeOrder[]> {
    return this.tradeOrders.asObservable();
  }

  createTradeOrder(order: Omit<TradeOrder, 'id' | 'timestamp' | 'status'>): Promise<TradeOrder> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newOrder: TradeOrder = {
          ...order,
          id: Date.now().toString(),
          timestamp: new Date(),
          status: 'pending'
        };

        const currentOrders = this.tradeOrders.value;
        this.tradeOrders.next([newOrder, ...currentOrders]);

        // Simulate order execution after 2-5 seconds
        setTimeout(() => {
          this.executeOrder(newOrder.id);
        }, Math.random() * 3000 + 2000);

        resolve(newOrder);
      }, 500); // Simulate API delay
    });
  }

  private executeOrder(orderId: string) {
    const currentOrders = this.tradeOrders.value;
    const updatedOrders = currentOrders.map(order =>
      order.id === orderId
        ? { ...order, status: 'completed' as const, executedAt: new Date() }
        : order
    );
    this.tradeOrders.next(updatedOrders);
  }

  cancelTradeOrder(orderId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const currentOrders = this.tradeOrders.value;
        const updatedOrders = currentOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'cancelled' as const }
            : order
        );
        this.tradeOrders.next(updatedOrders);
        resolve(true);
      }, 300);
    });
  }

  // Utility methods
  formatCurrency(amount: number): string {
    if (amount >= 1e12) {
      return `$${(amount / 1e12).toFixed(2)}T`;
    } else if (amount >= 1e9) {
      return `$${(amount / 1e9).toFixed(2)}B`;
    } else if (amount >= 1e6) {
      return `$${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
      return `$${(amount / 1e3).toFixed(2)}K`;
    }
    return `$${amount.toFixed(2)}`;
  }

  formatPercentage(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  getFearGreedLabel(index: number): string {
    if (index <= 25) return 'Extreme Fear';
    if (index <= 45) return 'Fear';
    if (index <= 55) return 'Neutral';
    if (index <= 75) return 'Greed';
    return 'Extreme Greed';
  }

  getFearGreedColor(index: number): string {
    if (index <= 25) return '#ef4444'; // Red
    if (index <= 45) return '#f97316'; // Orange
    if (index <= 55) return '#eab308'; // Yellow
    if (index <= 75) return '#22c55e'; // Green
    return '#10b981'; // Dark Green
  }
}
