import express from 'express';
import portfolioRouter from './portfolio.js';
import quoteRouter from './quote.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use('/api/portfolios', portfolioRouter);
app.use('/api/quotes', quoteRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
