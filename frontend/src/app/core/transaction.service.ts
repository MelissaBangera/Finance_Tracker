import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type TxType = 'income' | 'expense';
export interface Transaction {
  _id: string;
  type: TxType;
  description: string;
  amount: number;
  date: string;
}
export interface TxQuery {
  type: '' | TxType;
  from: string;
  to: string;
  minAmount: string;
  maxAmount: string;
  sortBy: 'date' | 'amount' | 'type';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}
export interface TxList {
  data: Transaction[];
  page: number;
  pages: number;
  total: number;
  summary: { income: number; expense: number; balance: number };
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);

  list(q: TxQuery) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== '' && v !== null && v !== undefined) params = params.set(k, String(v));
    }
    return this.http.get<TxList>('/api/transactions', { params });
  }
  create(body: { type: TxType; description: string; amount: number }) {
    return this.http.post<{ transaction: Transaction }>('/api/transactions', body);
  }
  remove(id: string) {
    return this.http.delete<{ message: string }>(`/api/transactions/${id}`);
  }
}
