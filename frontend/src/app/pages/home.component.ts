import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Transaction, TransactionService, TxList, TxQuery } from '../core/transaction.service';
import { errMsg } from '../core/util';

const DEFAULT_FILTERS = { type: '' as TxQuery['type'], from: '', to: '', minAmount: '', maxAmount: '' };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="container py-4">
      <div class="row g-4">
        <!-- Add transaction + balance -->
        <div class="col-lg-4">
          <section class="panel mb-4" aria-label="Balance">
            <div class="muted small">{{ filtersActive ? 'Balance for current filters' : 'Balance' }}</div>
            <div class="balance-figure num my-2" [class.expense]="summary.balance < 0">{{ summary.balance | currency }}</div>
            <div class="d-flex gap-4 num">
              <div><span class="tx-mark income"></span><span class="muted small">In</span> <strong class="income">{{ summary.income | currency }}</strong></div>
              <div><span class="tx-mark expense"></span><span class="muted small">Out</span> <strong class="expense">{{ summary.expense | currency }}</strong></div>
            </div>
          </section>

          <section class="panel" aria-label="Add transaction">
            <h2 class="h5 fw-bold mb-3">Add a transaction</h2>
            <form [formGroup]="form" (ngSubmit)="add()" novalidate>
              <div class="btn-group type-toggle w-100 mb-3" role="group" aria-label="Type">
                <input type="radio" class="btn-check" id="t-income" value="income" formControlName="type" />
                <label class="btn btn-outline-income" for="t-income">Income</label>
                <input type="radio" class="btn-check" id="t-expense" value="expense" formControlName="type" />
                <label class="btn btn-outline-expense" for="t-expense">Expense</label>
              </div>
              <div class="mb-3">
                <label class="form-label" for="description">Description</label>
                <input id="description" class="form-control" maxlength="120" formControlName="description"
                  [class.is-invalid]="bad('description')" />
                <div class="invalid-feedback">Add a short description.</div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="amount">Amount</label>
                <input id="amount" type="number" step="0.01" min="0.01" inputmode="decimal" class="form-control" formControlName="amount"
                  [class.is-invalid]="bad('amount')" />
                <div class="invalid-feedback">Enter an amount greater than 0.</div>
              </div>
              @if (formError) { <div class="alert alert-danger py-2" role="alert">{{ formError }}</div> }
              <button class="btn btn-primary w-100" [disabled]="saving">{{ saving ? 'Adding...' : 'Add transaction' }}</button>
            </form>
          </section>
        </div>

        <!-- Recent transactions -->
        <div class="col-lg-8">
          <section class="panel" aria-label="Recent transactions">
            <h2 class="h5 fw-bold mb-3">Recent transactions</h2>

            <form class="row g-2 mb-3" (ngSubmit)="applyFilters()">
              <div class="col-6 col-md-3">
                <label class="form-label" for="f-type">Type</label>
                <select id="f-type" class="form-select" name="type" [(ngModel)]="filters.type">
                  <option value="">All</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label" for="f-from">From</label>
                <input id="f-from" type="date" class="form-control" name="from" [(ngModel)]="filters.from" />
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label" for="f-to">To</label>
                <input id="f-to" type="date" class="form-control" name="to" [(ngModel)]="filters.to" />
              </div>
              <div class="col-6 col-md-3"></div>
              <div class="col-6 col-md-3">
                <label class="form-label" for="f-min">Min amount</label>
                <input id="f-min" type="number" min="0" class="form-control" name="minAmount" [(ngModel)]="filters.minAmount" />
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label" for="f-max">Max amount</label>
                <input id="f-max" type="number" min="0" class="form-control" name="maxAmount" [(ngModel)]="filters.maxAmount" />
              </div>
              <div class="col-12 col-md-6 d-flex align-items-end gap-2">
                <button class="btn btn-primary flex-fill">Apply filters</button>
                <button type="button" class="btn btn-outline-primary flex-fill" (click)="resetFilters()">Clear</button>
              </div>
            </form>

            <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
              <label class="form-label mb-0" for="sortBy">Sort by</label>
              <select id="sortBy" class="form-select form-select-sm w-auto" [(ngModel)]="query.sortBy" (ngModelChange)="goTo(1)">
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="type">Type</option>
              </select>
              <select class="form-select form-select-sm w-auto" aria-label="Order" [(ngModel)]="query.order" (ngModelChange)="goTo(1)">
                <option value="desc">High to low / newest</option>
                <option value="asc">Low to high / oldest</option>
              </select>
              <span class="ms-auto muted small">{{ total }} {{ total === 1 ? 'result' : 'results' }}</span>
            </div>

            @if (listError) { <div class="alert alert-danger py-2" role="alert">{{ listError }}</div> }

            @if (loading && !items.length) {
              <p class="muted py-4 text-center mb-0">Loading...</p>
            } @else if (!items.length) {
              <p class="muted py-4 text-center mb-0">
                {{ filtersActive ? 'No transactions match these filters.' : 'No transactions yet. Add your first one on the left.' }}
              </p>
            } @else {
              <div [style.opacity]="loading ? 0.6 : 1">
                @for (t of items; track t._id) {
                  <div class="tx-row">
                    <div class="text-truncate">
                      <span class="tx-mark" [class.income]="t.type === 'income'" [class.expense]="t.type === 'expense'"></span>
                      <span class="fw-semibold">{{ t.description }}</span>
                      <div class="muted small ms-3">{{ t.type === 'income' ? 'Income' : 'Expense' }} on {{ t.date | date: 'mediumDate' }}</div>
                    </div>
                    <div class="text-end num">
                      <div class="fw-bold" [class.income]="t.type === 'income'" [class.expense]="t.type === 'expense'">
                        {{ t.type === 'income' ? '+' : '-' }}{{ t.amount | currency }}
                      </div>
                      <button class="btn btn-link btn-sm p-0 text-danger" (click)="remove(t)" [attr.aria-label]="'Delete ' + t.description">Delete</button>
                    </div>
                  </div>
                }
              </div>
            }

            @if (pages > 1) {
              <nav class="d-flex justify-content-between align-items-center mt-3" aria-label="Pagination">
                <button class="btn btn-outline-primary btn-sm" [disabled]="query.page <= 1" (click)="goTo(query.page - 1)">Previous</button>
                <span class="muted small">Page {{ query.page }} of {{ pages }}</span>
                <button class="btn btn-outline-primary btn-sm" [disabled]="query.page >= pages" (click)="goTo(query.page + 1)">Next</button>
              </nav>
            }
          </section>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private api = inject(TransactionService);
  private fb = inject(FormBuilder);

  items: Transaction[] = [];
  summary: TxList['summary'] = { income: 0, expense: 0, balance: 0 };
  total = 0;
  pages = 1;
  loading = false;
  saving = false;
  listError = '';
  formError = '';

  filters = { ...DEFAULT_FILTERS };
  query: TxQuery = { ...DEFAULT_FILTERS, sortBy: 'date', order: 'desc', page: 1, limit: 8 };

  form = this.fb.nonNullable.group({
    type: ['expense' as 'income' | 'expense', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  get filtersActive() {
    const f = this.query;
    return !!(f.type || f.from || f.to || f.minAmount || f.maxAmount);
  }

  ngOnInit() {
    this.load();
  }

  bad(name: 'description' | 'amount') {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  load() {
    this.loading = true;
    this.listError = '';
    this.api.list(this.query).subscribe({
      next: (r) => {
        this.items = r.data;
        this.summary = r.summary;
        this.total = r.total;
        this.pages = r.pages;
        // If the last item on a page was deleted, step back a page
        if (r.page > r.pages) return this.goTo(r.pages);
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.listError = errMsg(e); },
    });
  }

  goTo(page: number) {
    this.query = { ...this.query, page };
    this.load();
  }

  applyFilters() {
    if (this.filters.from && this.filters.to && this.filters.from > this.filters.to) {
      this.listError = '"From" date must be before "To" date.';
      return;
    }
    this.query = { ...this.query, ...this.filters, page: 1 };
    this.load();
  }

  resetFilters() {
    this.filters = { ...DEFAULT_FILTERS };
    this.query = { ...this.query, ...DEFAULT_FILTERS, page: 1 };
    this.load();
  }

  add() {
    this.formError = '';
    if (this.form.invalid) return this.form.markAllAsTouched();
    const { type, description, amount } = this.form.getRawValue();
    this.saving = true;
    this.api.create({ type, description: description.trim(), amount: Number(amount) }).subscribe({
      next: () => {
        this.saving = false;
        this.form.reset({ type, description: '', amount: null });
        this.goTo(1);
      },
      error: (e) => { this.saving = false; this.formError = errMsg(e); },
    });
  }

  remove(t: Transaction) {
    if (!confirm(`Delete "${t.description}"?`)) return;
    this.api.remove(t._id).subscribe({ next: () => this.load(), error: (e) => (this.listError = errMsg(e)) });
  }
}
