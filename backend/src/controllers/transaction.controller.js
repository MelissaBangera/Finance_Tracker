const Transaction = require('../models/Transaction');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const SORTABLE = ['date', 'amount', 'type'];

exports.list = wrap(async (req, res) => {
  const { type, from, to, minAmount, maxAmount, sortBy, order } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

  const filter = { user: req.user._id };
  if (type) filter.type = type;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999); // include the whole "to" day
      filter.date.$lte = end;
    }
  }
  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) filter.amount.$gte = Number(minAmount);
    if (maxAmount) filter.amount.$lte = Number(maxAmount);
  }

  const sortField = SORTABLE.includes(sortBy) ? sortBy : 'date';
  const sort = { [sortField]: order === 'asc' ? 1 : -1, _id: -1 };

  const [data, total, totals] = await Promise.all([
    Transaction.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Transaction.countDocuments(filter),
    Transaction.aggregate([{ $match: filter }, { $group: { _id: '$type', sum: { $sum: '$amount' } } }]),
  ]);

  const income = totals.find((t) => t._id === 'income')?.sum || 0;
  const expense = totals.find((t) => t._id === 'expense')?.sum || 0;

  res.json({
    data,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: { income, expense, balance: income - expense }, // reflects the active filters
  });
});

exports.create = wrap(async (req, res) => {
  const { type, description, amount, date } = req.body;
  const tx = await Transaction.create({ user: req.user._id, type, description, amount, date: date || undefined });
  res.status(201).json({ transaction: tx });
});

exports.remove = wrap(async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!tx) return res.status(404).json({ message: 'Transaction not found' });
  res.json({ message: 'Deleted' });
});
