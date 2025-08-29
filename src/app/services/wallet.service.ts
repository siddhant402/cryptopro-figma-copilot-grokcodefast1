import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CryptoDataService, CryptoCurrency } from './crypto-data.service';

export interface WalletBalance {
  symbol: string;
  amount: number;
  valueUSD: number;
  available: number;
  inOrders: number;
  icon: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'buy' | 'sell' | 'transfer';
  symbol: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  description: string;
}

export interface Portfolio {
  totalValue: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  balances: WalletBalance[];
  allocation: PortfolioAllocation[];
}

export interface PortfolioAllocation {
  symbol: string;
  percentage: number;
  value: number;
  color: string;
}

export interface DepositAddress {
  symbol: string;
  address: string;
  network: string;
  memo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private balances = new BehaviorSubject<WalletBalance[]>([]);
  private transactions = new BehaviorSubject<Transaction[]>([]);
  private depositAddresses = new BehaviorSubject<DepositAddress[]>([]);

  constructor(private cryptoDataService: CryptoDataService) {
    this.initializeWallet();
    this.initializeDepositAddresses();
  }

  private initializeWallet() {
    // Initialize with some demo balances
    const initialBalances: WalletBalance[] = [
      {
        symbol: 'BTC',
        amount: 0.54321,
        valueUSD: 0,
        available: 0.54321,
        inOrders: 0,
        icon: '₿'
      },
      {
        symbol: 'ETH',
        amount: 12.5,
        valueUSD: 0,
        available: 12.5,
        inOrders: 0,
        icon: 'Ξ'
      },
      {
        symbol: 'ADA',
        amount: 2500,
        valueUSD: 0,
        available: 2500,
        inOrders: 0,
        icon: '₳'
      },
      {
        symbol: 'DOT',
        amount: 150,
        valueUSD: 0,
        available: 150,
        inOrders: 0,
        icon: '●'
      },
      {
        symbol: 'SOL',
        amount: 25,
        valueUSD: 0,
        available: 25,
        inOrders: 0,
        icon: '◎'
      },
      {
        symbol: 'LINK',
        amount: 75,
        valueUSD: 0,
        available: 75,
        inOrders: 0,
        icon: '🔗'
      }
    ];

    this.balances.next(initialBalances);
    this.updateBalanceValues();
  }

  private initializeDepositAddresses() {
    const addresses: DepositAddress[] = [
      {
        symbol: 'BTC',
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        network: 'Bitcoin'
      },
      {
        symbol: 'ETH',
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        network: 'Ethereum (ERC20)'
      },
      {
        symbol: 'ADA',
        address: 'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a429mgz6j9z8m9m0d5qmjz8j9z8m9m0d5qmjz8j9z8m9m0d5qmjz8j9z8m9m0d5',
        network: 'Cardano'
      },
      {
        symbol: 'DOT',
        address: '13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB',
        network: 'Polkadot'
      },
      {
        symbol: 'SOL',
        address: '7xKXtg2CW87UeRQp8QQ1C7dHnTdjCVnSf2cK7m9c2qgk',
        network: 'Solana'
      },
      {
        symbol: 'LINK',
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        network: 'Ethereum (ERC20)'
      }
    ];

    this.depositAddresses.next(addresses);
  }

  private updateBalanceValues() {
    combineLatest([
      this.balances,
      this.cryptoDataService.getCryptocurrencies()
    ]).subscribe(([balances, cryptos]) => {
      const updatedBalances = balances.map(balance => {
        const crypto = cryptos.find(c => c.symbol === balance.symbol);
        return {
          ...balance,
          valueUSD: crypto ? balance.amount * crypto.price : 0
        };
      });
      this.balances.next(updatedBalances);
    });
  }

  // Public methods
  getBalances(): Observable<WalletBalance[]> {
    return this.balances.asObservable();
  }

  getBalance(symbol: string): Observable<WalletBalance | undefined> {
    return this.balances.pipe(
      map(balances => balances.find(b => b.symbol === symbol))
    );
  }

  getPortfolio(): Observable<Portfolio> {
    return combineLatest([
      this.balances,
      this.cryptoDataService.getCryptocurrencies()
    ]).pipe(
      map(([balances, cryptos]) => {
        const totalValue = balances.reduce((sum, balance) => sum + balance.valueUSD, 0);
        const totalChange24h = balances.reduce((sum, balance) => {
          const crypto = cryptos.find(c => c.symbol === balance.symbol);
          return sum + (crypto ? balance.amount * crypto.change24h : 0);
        }, 0);

        const totalChangePercent24h = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0;

        const allocation: PortfolioAllocation[] = balances
          .filter(balance => balance.valueUSD > 0)
          .map((balance, index) => ({
            symbol: balance.symbol,
            percentage: totalValue > 0 ? (balance.valueUSD / totalValue) * 100 : 0,
            value: balance.valueUSD,
            color: this.getAllocationColor(index)
          }))
          .sort((a, b) => b.value - a.value);

        return {
          totalValue,
          totalChange24h,
          totalChangePercent24h,
          balances,
          allocation
        };
      })
    );
  }

  getTransactions(limit?: number): Observable<Transaction[]> {
    return this.transactions.pipe(
      map(transactions => {
        const sorted = [...transactions].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return limit ? sorted.slice(0, limit) : sorted;
      })
    );
  }

  getTransactionsBySymbol(symbol: string): Observable<Transaction[]> {
    return this.transactions.pipe(
      map(transactions =>
        transactions
          .filter(tx => tx.symbol === symbol)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      )
    );
  }

  getDepositAddress(symbol: string): Observable<DepositAddress | undefined> {
    return this.depositAddresses.pipe(
      map(addresses => addresses.find(addr => addr.symbol === symbol))
    );
  }

  getDepositAddresses(): Observable<DepositAddress[]> {
    return this.depositAddresses.asObservable();
  }

  // Transaction methods
  async createDeposit(symbol: string, amount: number, fromAddress: string): Promise<Transaction> {
    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'deposit',
      symbol,
      amount,
      price: 0, // Will be updated when confirmed
      total: 0,
      fee: 0,
      status: 'pending',
      timestamp: new Date(),
      fromAddress,
      description: `Deposit ${amount} ${symbol}`
    };

    await this.addTransaction(transaction);

    // Simulate deposit confirmation after 30-60 seconds
    setTimeout(() => {
      this.confirmDeposit(transaction.id, amount);
    }, Math.random() * 30000 + 30000);

    return transaction;
  }

  async createWithdrawal(symbol: string, amount: number, toAddress: string): Promise<Transaction> {
    const balance = this.balances.value.find(b => b.symbol === symbol);
    if (!balance || balance.available < amount) {
      throw new Error('Insufficient balance');
    }

    const fee = this.calculateWithdrawalFee(symbol, amount);
    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'withdrawal',
      symbol,
      amount,
      price: 0,
      total: amount,
      fee,
      status: 'pending',
      timestamp: new Date(),
      toAddress,
      description: `Withdraw ${amount} ${symbol} to ${toAddress}`
    };

    await this.addTransaction(transaction);

    // Update balance immediately (reserved for withdrawal)
    this.updateBalance(symbol, -amount, 'available');
    this.updateBalance(symbol, amount, 'inOrders');

    // Simulate withdrawal processing after 10-30 seconds
    setTimeout(() => {
      this.confirmWithdrawal(transaction.id);
    }, Math.random() * 20000 + 10000);

    return transaction;
  }

  async createBuyOrder(symbol: string, amount: number, price: number): Promise<Transaction> {
    const total = amount * price;
    const fee = total * 0.001; // 0.1% trading fee

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'buy',
      symbol,
      amount,
      price,
      total,
      fee,
      status: 'pending',
      timestamp: new Date(),
      description: `Buy ${amount} ${symbol} at $${price}`
    };

    await this.addTransaction(transaction);

    // Simulate order execution after 2-5 seconds
    setTimeout(() => {
      this.confirmBuyOrder(transaction.id, symbol, amount);
    }, Math.random() * 3000 + 2000);

    return transaction;
  }

  async createSellOrder(symbol: string, amount: number, price: number): Promise<Transaction> {
    const balance = this.balances.value.find(b => b.symbol === symbol);
    if (!balance || balance.available < amount) {
      throw new Error('Insufficient balance');
    }

    const total = amount * price;
    const fee = total * 0.001; // 0.1% trading fee

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'sell',
      symbol,
      amount,
      price,
      total,
      fee,
      status: 'pending',
      timestamp: new Date(),
      description: `Sell ${amount} ${symbol} at $${price}`
    };

    await this.addTransaction(transaction);

    // Update balance immediately (reserved for order)
    this.updateBalance(symbol, -amount, 'available');
    this.updateBalance(symbol, amount, 'inOrders');

    // Simulate order execution after 2-5 seconds
    setTimeout(() => {
      this.confirmSellOrder(transaction.id, symbol, amount);
    }, Math.random() * 3000 + 2000);

    return transaction;
  }

  // Private helper methods
  private async addTransaction(transaction: Transaction): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const currentTransactions = this.transactions.value;
        this.transactions.next([transaction, ...currentTransactions]);
        resolve();
      }, 100); // Simulate API delay
    });
  }

  private confirmDeposit(transactionId: string, amount: number) {
    const currentTransactions = this.transactions.value;
    const updatedTransactions = currentTransactions.map(tx =>
      tx.id === transactionId
        ? { ...tx, status: 'completed' as const }
        : tx
    );
    this.transactions.next(updatedTransactions);

    // Update balance
    const transaction = updatedTransactions.find(tx => tx.id === transactionId);
    if (transaction) {
      this.updateBalance(transaction.symbol, amount, 'available');
    }
  }

  private confirmWithdrawal(transactionId: string) {
    const currentTransactions = this.transactions.value;
    const updatedTransactions = currentTransactions.map(tx =>
      tx.id === transactionId
        ? { ...tx, status: 'completed' as const }
        : tx
    );
    this.transactions.next(updatedTransactions);

    // Update balance (remove from inOrders)
    const transaction = updatedTransactions.find(tx => tx.id === transactionId);
    if (transaction) {
      this.updateBalance(transaction.symbol, -transaction.amount, 'inOrders');
    }
  }

  private confirmBuyOrder(transactionId: string, symbol: string, amount: number) {
    const currentTransactions = this.transactions.value;
    const updatedTransactions = currentTransactions.map(tx =>
      tx.id === transactionId
        ? { ...tx, status: 'completed' as const }
        : tx
    );
    this.transactions.next(updatedTransactions);

    // Update balance
    this.updateBalance(symbol, amount, 'available');
  }

  private confirmSellOrder(transactionId: string, symbol: string, amount: number) {
    const currentTransactions = this.transactions.value;
    const updatedTransactions = currentTransactions.map(tx =>
      tx.id === transactionId
        ? { ...tx, status: 'completed' as const }
        : tx
    );
    this.transactions.next(updatedTransactions);

    // Update balance (remove from inOrders)
    this.updateBalance(symbol, -amount, 'inOrders');
  }

  private updateBalance(symbol: string, amount: number, type: 'available' | 'inOrders') {
    const currentBalances = this.balances.value;
    const updatedBalances = currentBalances.map(balance => {
      if (balance.symbol === symbol) {
        return {
          ...balance,
          [type]: Math.max(0, balance[type] + amount)
        };
      }
      return balance;
    });
    this.balances.next(updatedBalances);
  }

  private calculateWithdrawalFee(symbol: string, amount: number): number {
    // Mock fee calculation - in real app, this would vary by network and amount
    const feeRates: { [key: string]: number } = {
      'BTC': 0.0005,
      'ETH': 0.005,
      'ADA': 1,
      'DOT': 0.1,
      'SOL': 0.01,
      'LINK': 5
    };

    return feeRates[symbol] || 0.001 * amount;
  }

  // Public utility methods
  getWithdrawalFee(symbol: string, amount: number): number {
    return this.calculateWithdrawalFee(symbol, amount);
  }

  private generateTransactionId(): string {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getAllocationColor(index: number): string {
    const colors = [
      '#3b82f6', // Blue
      '#ef4444', // Red
      '#10b981', // Green
      '#f59e0b', // Yellow
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#84cc16', // Lime
      '#ec4899', // Pink
      '#6b7280'  // Gray
    ];
    return colors[index % colors.length];
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return this.cryptoDataService.formatCurrency(amount);
  }

  formatCrypto(amount: number, symbol: string): string {
    if (amount >= 1e6) {
      return `${(amount / 1e6).toFixed(2)}M ${symbol}`;
    } else if (amount >= 1e3) {
      return `${(amount / 1e3).toFixed(2)}K ${symbol}`;
    }
    return `${amount.toFixed(6)} ${symbol}`;
  }

  getTransactionStatusColor(status: Transaction['status']): string {
    switch (status) {
      case 'completed': return '#10b981'; // Green
      case 'pending': return '#f59e0b'; // Yellow
      case 'failed': return '#ef4444'; // Red
      case 'cancelled': return '#6b7280'; // Gray
      default: return '#6b7280';
    }
  }

  getTransactionStatusText(status: Transaction['status']): string {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  }
}
