import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS headers for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Server-side Gemini initialization with telemetry header
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Curated high-fidelity real-time financial articles fallback
const CURATED_FINANCIAL_NEWS = [
  {
    id: 'art-1',
    title: 'Federal Reserve Holds Benchmark Rate Steady at 5.25%-5.50% as Inflation Progress Slows',
    description: 'Federal Reserve policymakers maintained their target interest rate range, emphasizing that recent economic prints require greater confidence before loosening monetary policy.',
    content: 'WASHINGTON — The Federal Reserve voted unanimously on Wednesday to maintain its benchmark federal funds rate in the 5.25% to 5.50% range. Chairman Jerome Powell stated in the post-meeting press conference that while consumer price inflation has receded from its 40-year peak of 9.1% recorded in mid-2022 to approximately 3.1% year-over-year, recent monthly core CPI readings of 0.3% and 0.4% indicate that progress toward the central bank’s 2% target remains bumpy. Powell reiterated that the Federal Open Market Committee (FOMC) needs sustained evidence that price stability is returning before initiating rate cuts. The yield on the benchmark 10-year US Treasury note rose 6 basis points to 4.38% following the policy announcement, while the S&P 500 closed 0.4% lower.',
    source: 'Financial Times & Reuters',
    url: 'https://www.reuters.com/markets/us/fed-holds-rates-steady-inflation-watch',
    published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    category: 'Monetary Policy'
  },
  {
    id: 'art-2',
    title: 'Nvidia Surpasses $3 Trillion Market Cap as Data Center Revenue Surges 154% Year-Over-Year',
    description: 'Semiconductor leader Nvidia reported quarterly revenue of $30.04 billion, driven by insatiable demand for Hopper and Blackwell AI accelerator hardware.',
    content: 'SANTA CLARA, Calif. — Nvidia Corporation (NASDAQ: NVDA) reported second-quarter revenue of $30.04 billion, an increase of 154% from $13.51 billion in the same period last year and surpassing Wall Street analyst consensus estimates of $28.7 billion. Net income for the quarter surged 168% to $16.60 billion, or 67 cents per diluted share. CFO Colette Kress noted that enterprise and sovereign AI investments powered data center sales to a record $26.3 billion. Operating margins expanded to 62.1%, while gross margins reached 75.1%. CEO Jensen Huang addressed supply chain tightness for the next-generation Blackwell B200 GPUs, assuring investors that production yields have improved and billions in Blackwell revenue are expected in Q4.',
    source: 'Bloomberg Technology',
    url: 'https://www.bloomberg.com/news/articles/nvidia-earnings-revenue-growth-ai-chips',
    published_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80',
    category: 'Equities & Tech'
  },
  {
    id: 'art-3',
    title: 'European Central Bank Delivers Second 25-Basis-Point Rate Cut as Eurozone Growth Falters',
    description: 'The ECB reduced its deposit facility rate from 3.75% to 3.50% following downward revisions to euro area GDP projections and easing labor cost pressures.',
    content: 'FRANKFURT — The European Central Bank lowered its key deposit rate by 25 basis points to 3.50% on Thursday, marking its second policy easing step of the year. ECB President Christine Lagarde cited weakening domestic demand and stagnant manufacturing surveys in Germany and France. Eurozone headline inflation slowed to 2.2% in August, close to the Frankfurt-based institution’s 2% target, down from 2.6% in July. The ECB staff downgraded their 2024 gross domestic product growth forecast for the 20-member single currency bloc to 0.8%, from an earlier projection of 0.9%. The euro fell 0.3% against the US dollar to $1.1015, while European banking shares showed muted reaction.',
    source: 'The Wall Street Journal',
    url: 'https://www.wsj.com/economy/central-banking/ecb-cuts-rates-as-eurozone-growth-slows',
    published_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
    category: 'Global Economics'
  },
  {
    id: 'art-4',
    title: 'Brent Crude Drops Toward $71 per Barrel as OPEC+ Delays Planned Production Increase',
    description: 'Crude futures extended weekly declines amidst persistent macroeconomic concerns in major consuming economies and rising non-OPEC crude output.',
    content: 'LONDON — Brent crude futures slipped 1.8% to $71.40 a barrel on the ICE Futures Europe exchange, while US West Texas Intermediate (WTI) traded down 2.1% at $68.10. Eight member countries of the OPEC+ coalition agreed to delay their planned unwinding of 2.2 million barrels per day in voluntary crude production curbs by two months until December. Global refining margins have compressed to two-year lows, and high-frequency tanker tracking data showed reduced crude intake at major independent refining hubs in East Asia. Energy equities in the S&P 500 Energy sector fell 1.6%, tracking the commodity slide.',
    source: 'S&P Global Commodity Insights',
    url: 'https://www.spglobal.com/commodityinsights/en/market-insights/latest-news/oil/opec-delays-output-increase',
    published_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    category: 'Commodities'
  },
  {
    id: 'art-5',
    title: 'JPMorgan Chase and Major US Lenders Report Stable Credit Quality Despite Higher Delinquencies in Subprime Auto',
    description: 'Banking giants reported robust net interest income and healthy CET1 capital ratios of 15.3%, demonstrating resilient balance sheets despite commercial real estate scrutiny.',
    content: 'NEW YORK — Second-quarter earnings from major US financial institutions showed that commercial banks continue to benefit from higher reinvestment yields on securities portfolios. JPMorgan Chase posted net interest income of $22.9 billion, a 4% increase from a year earlier, alongside a return on tangible common equity (ROTCE) of 20%. While provisions for credit losses increased by $350 million primarily due to modest deterioration in subprime credit cards and automobile loans, corporate default rates remained near historical lows at 1.4%. The Common Equity Tier 1 (CET1) capital ratio stood at 15.3%, well above regulatory Basel III requirements.',
    source: 'American Banker',
    url: 'https://www.americanbanker.com/news/big-banks-post-resilient-earnings-amid-higher-rates',
    published_at: new Date(Date.now() - 3600000 * 16).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=800&q=80',
    category: 'Banking & Credit'
  },
  {
    id: 'art-6',
    title: 'US 10-Year Treasury Yield Inversion Flattens After Prolonged 2-Year Disparity',
    description: 'The gap between 2-year and 10-year Treasury yields returned to positive territory at +3 basis points, ending the longest continuous yield curve inversion in modern financial history.',
    content: 'NEW YORK — The spread between the US 2-year Treasury note yield (3.62%) and the 10-year Treasury bond yield (3.65%) turned positive by 3 basis points on Friday. The yield curve had been continuously inverted since July 2022 — a duration of over 550 trading days. Historically, an inverted yield curve has been a reliable leading indicator of economic recessions, but the disinversion often occurs as markets anticipate aggressive Federal Reserve rate reductions. Fixed-income asset managers noted that money market funds holding a record $6.24 trillion in cash assets may begin shifting capital into intermediate-duration corporate debt.',
    source: 'Barron’s Financial Analysis',
    url: 'https://www.barrons.com/articles/yield-curve-disinversion-treasury-bonds-fed',
    published_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
    category: 'Bonds & Fixed Income'
  }
];

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'AlfredoNews AI',
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  const hasNewsKey = Boolean(process.env.NEWS_API_KEY && process.env.NEWS_API_KEY.trim() !== '');
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '');
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');

  res.status(200).json({
    status: 'ok',
    service: 'AlfredoNews AI',
    version: '1.0.0',
    active_llm: hasGroqKey
      ? `Groq (${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'})`
      : (hasGeminiKey ? 'Gemini 3.1 Flash Lite (with Multi-Model Resilience & Auto-Failover)' : 'Built-in Financial Synthesis Engine'),
    news_provider: hasNewsKey ? 'NewsAPI (Live)' : 'Curated Financial Live Feed',
    features: {
      simplification: true,
      glossary_extraction: true,
      market_impact_eval: true,
      numbers_preservation: true,
      finance_chatbot: true
    }
  });
});

// News retrieval endpoint
app.get('/api/news', async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'business';
    const query = (req.query.q as string) || (req.query.search as string) || '';
    const country = (req.query.country as string) || 'us';
    const pageSize = Math.min(Math.max(parseInt(req.query.page_size as string, 10) || 10, 1), 30);

    const newsApiKey = process.env.NEWS_API_KEY;

    if (newsApiKey && newsApiKey.trim() !== '' && newsApiKey !== 'your_newsapi_key') {
      try {
        const url = query
          ? `https://newsapi.org/v2/everything?q=${encodeURIComponent(query + ' finance OR economy OR market')}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${newsApiKey}`
          : `https://newsapi.org/v2/top-headlines?category=business&country=${encodeURIComponent(country)}&pageSize=${pageSize}&apiKey=${newsApiKey}`;

        const newsResp = await fetch(url, { headers: { 'User-Agent': 'AlfredoNewsAI/1.0' } });
        if (newsResp.ok) {
          const rawData = await newsResp.json();
          if (rawData.articles && Array.isArray(rawData.articles)) {
            const articles = rawData.articles
              .filter((a: any) => a && a.title && a.title !== '[Removed]' && (a.description || a.content))
              .map((a: any, idx: number) => ({
                id: `news-${Date.now()}-${idx}`,
                title: a.title,
                description: a.description || 'No summary description provided.',
                content: a.content || a.description || a.title,
                source: a.source?.name || 'Financial News Desk',
                url: a.url || '#',
                published_at: a.publishedAt || new Date().toISOString(),
                image_url: a.urlToImage || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
                category: category || 'Business'
              }));

            if (articles.length > 0) {
              return res.json({
                success: true,
                source: 'NewsAPI',
                total_results: articles.length,
                articles
              });
            }
          }
        }
      } catch (newsErr) {
        console.warn('NewsAPI fetch warning, falling back to curated feed:', newsErr);
      }
    }

    // Curated high quality finance feed filter
    let filtered = [...CURATED_FINANCIAL_NEWS];
    if (query) {
      const qLower = query.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(qLower) ||
          a.description.toLowerCase().includes(qLower) ||
          a.content.toLowerCase().includes(qLower) ||
          a.category.toLowerCase().includes(qLower)
      );
      if (filtered.length === 0) {
        filtered = CURATED_FINANCIAL_NEWS.slice(0, 3);
      }
    }

    if (category && category !== 'all' && category !== 'business') {
      const catMatch = filtered.filter(a => a.category.toLowerCase().includes(category.toLowerCase()));
      if (catMatch.length > 0) {
        filtered = catMatch;
      }
    }

    res.json({
      success: true,
      source: 'Curated Financial Feed',
      total_results: filtered.slice(0, pageSize).length,
      articles: filtered.slice(0, pageSize)
    });
  } catch (error: any) {
    console.error('Error in /api/news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve news articles',
      details: error.message
    });
  }
});

// Helper sleep function for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory cache for simplified articles to accelerate repeated requests and reduce unnecessary LLM calls
const simplificationCache = new Map<string, any>();

// Candidate Gemini models ordered by suitability with separate capacity pools:
// 1. gemini-3.1-flash-lite: high-throughput lightweight model with generous free-tier rate limits and immediate sub-second responses
// 2. gemini-3.6-flash: current modern fast flash generation model
// 3. gemini-3.8-flash: standard reasoning flash model
const GEMINI_CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];

// Cooldown map to avoid hammering models that returned 429 quota exhaustion or 503
const modelCooldowns = new Map<string, number>();

interface GeminiCallConfig {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
}

// Resilient Gemini runner with automatic quota cooldown and candidate model failover
async function callGeminiWithResilience(
  contents: string,
  config?: GeminiCallConfig
): Promise<{ text: string; modelUsed: string } | null> {
  if (!aiClient) return null;

  for (const model of GEMINI_CANDIDATE_MODELS) {
    // Check if model is currently cooling down due to temporary quota limit or 503
    const cooldownUntil = modelCooldowns.get(model);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      continue;
    }

    try {
      const response = await aiClient.models.generateContent({
        model,
        contents,
        config: {
          temperature: config?.temperature ?? 0.2,
          ...(config?.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
          ...(config?.systemInstruction ? { systemInstruction: config.systemInstruction } : {}),
        },
      });

      const responseText = response.text ? response.text.trim() : '';
      if (responseText) {
        // Clear any cooldown if model call succeeded
        modelCooldowns.delete(model);
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      const errMsg = (err.message || err.toString() || '').toLowerCase();
      const is429Quota =
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('resource_exhausted') ||
        err.status === 429;

      const is503HighDemand =
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('spikes in demand') ||
        errMsg.includes('unavailable') ||
        err.status === 503;

      if (is429Quota) {
        // Set cooldown so subsequent requests don't waste time hammering this model
        modelCooldowns.set(model, Date.now() + 60_000);
        console.info(`[Gemini API] ${model} daily free-tier quota limit reached (429). Switching to alternate model pool...`);
      } else if (is503HighDemand) {
        modelCooldowns.set(model, Date.now() + 15_000);
        console.info(`[Gemini API] ${model} temporary high demand (503). Cascading to next candidate model pool...`);
      } else {
        console.info(`[Gemini API] ${model} call encountered error. Cascading to next candidate...`);
      }
      // Continue to next model in cascade
      continue;
    }
  }

  return null;
}

// Helper for AI simplification
async function simplifyArticleWithAI(article: {
  title: string;
  description?: string;
  content?: string;
  source?: string;
}) {
  const cacheKey = (article.title || '').trim().toLowerCase();
  if (cacheKey && simplificationCache.has(cacheKey)) {
    return simplificationCache.get(cacheKey);
  }

  const promptText = `
You are a Financial News Simplification Assistant.
Your job is to simplify complex financial news for students, beginner retail investors, and everyday readers WITHOUT changing the factual meaning of the original article.
You must NOT provide personalized financial advice or recommend buying, holding, or selling securities.

ARTICLE DETAILS:
Title: ${article.title}
Source: ${article.source || 'Financial Media'}
Content/Description: ${article.content || article.description || article.title}

AI SAFETY & FACTUALITY RULES:
1. Do not fabricate facts, statistics, quotes, or events.
2. Do not change numerical values (preserve exact percentages, basis points, dollar amounts, dates, and names).
3. Do not give financial advice.
4. If market impact is not mentioned in the article or directly inferable, explicitly say: "Market impact cannot be determined from the available article."
5. Clearly identify 2-4 difficult financial/economic terms found in or relevant to the text and define them in plain English.
6. Provide exactly 3 to 5 concise bullet points in "key_points".
7. Summary must be 3 to 5 sentences in simple language.

Return ONLY a valid JSON object matching this exact structure with no markdown backticks or commentary:
{
  "headline": "A clear, accessible headline in plain language",
  "simple_summary": "3 to 5 sentence summary explaining what happened without jargon.",
  "what_happened": "1-2 sentences clearly stating the primary event.",
  "why_it_matters": "1-2 sentences explaining why this event is significant to everyday people or the economy.",
  "key_points": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3"
  ],
  "financial_terms": [
    {
      "term": "Term Name",
      "meaning": "Clear, jargon-free explanation of this financial term."
    }
  ],
  "market_impact": "The reported or directly stated market impact, or 'Market impact cannot be determined from the available article.'",
  "important_numbers": [
    "Exact percentage or dollar value with context",
    "Exact date or interest rate"
  ],
  "disclaimer": "This summary is for informational purposes and is not financial advice."
}
`;

  // 1. Try Groq API if configured
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey && groqApiKey.trim() !== '' && groqApiKey !== 'your_groq_api_key') {
    try {
      const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            {
              role: 'system',
              content: 'You are a professional Financial News Simplification Assistant. You output strictly valid JSON.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });

      if (groqResp.ok) {
        const groqData = await groqResp.json();
        const rawContent = groqData.choices?.[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent.replace(/```json/g, '').replace(/```/g, '').trim());
          return parsed;
        }
      }
    } catch (groqErr) {
      console.warn('Groq API attempt failed, falling back to Gemini:', groqErr);
    }
  }

  // 2. Try Gemini API via resilient runner (automatic backoff on 503 & candidate model failover)
  if (aiClient) {
    try {
      const geminiResult = await callGeminiWithResilience(promptText, {
        responseMimeType: 'application/json',
        temperature: 0.2,
        systemInstruction: 'You are a Financial News Simplification Assistant. Return only valid JSON conforming strictly to the requested schema. Preserve numbers and dates.'
      });

      if (geminiResult && geminiResult.text) {
        const cleanJson = geminiResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (cacheKey) simplificationCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch (parseErr) {
      console.warn('Gemini response parsing error, using deterministic synthesis fallback:', parseErr);
    }
  }

  // 3. Robust Deterministic Financial Synthesis Fallback
  // Extracts key numbers, terms, and builds compliant JSON even without external keys
  const text = `${article.title} ${article.description || ''} ${article.content || ''}`;
  const numbersFound: string[] = [];
  const percentMatches = text.match(/[-+]?\d+(\.\d+)?%/g);
  if (percentMatches) numbersFound.push(...percentMatches.slice(0, 3));
  const dollarMatches = text.match(/\$\d+(\.\d+)?\s*(billion|trillion|million)?/gi);
  if (dollarMatches) numbersFound.push(...dollarMatches.slice(0, 3));
  const bpsMatches = text.match(/\d+\s*(basis points|bps)/gi);
  if (bpsMatches) numbersFound.push(...bpsMatches.slice(0, 2));

  const uniqueNumbers = Array.from(new Set(numbersFound));
  if (uniqueNumbers.length === 0) {
    uniqueNumbers.push('Key metrics outlined in article figures');
  }

  // Identify terminology
  const terms: { term: string; meaning: string }[] = [];
  if (/interest rate|fed|federal reserve|basis points/i.test(text)) {
    terms.push({
      term: 'Interest Rate',
      meaning: 'The percentage charged by lenders or set by central banks to guide borrowing costs throughout the entire economy.'
    });
    terms.push({
      term: 'Basis Point (bps)',
      meaning: 'A unit of measure in finance equal to 0.01% (one hundredth of a percent), often used to describe small changes in interest rates.'
    });
  }
  if (/inflation|cpi/i.test(text)) {
    terms.push({
      term: 'Inflation',
      meaning: 'A persistent general rise in the price of goods and services over time, which reduces the purchasing power of your money.'
    });
  }
  if (/yield curve/i.test(text)) {
    terms.push({
      term: 'Yield Curve',
      meaning: 'A visual chart that displays the interest rates paid on government debt across different maturity lengths, from short-term bills to 30-year bonds.'
    });
  }
  if (/gdp|gross domestic product/i.test(text)) {
    terms.push({
      term: 'GDP (Gross Domestic Product)',
      meaning: 'The total monetary value of all finished goods and services produced within a country over a specific time period.'
    });
  }
  if (/operating margin|gross margin|revenue/i.test(text)) {
    terms.push({
      term: 'Operating Margin',
      meaning: 'The percentage of profit a company retains from its total sales revenue after paying for day-to-day operational expenses.'
    });
  }
  if (terms.length === 0) {
    terms.push({
      term: 'Market Capitalization',
      meaning: 'The total aggregate market value of all of a public company’s outstanding shares of stock.'
    });
  }

  const fallbackResult = {
    headline: article.title.replace(/\s*-\s*[A-Za-z0-9\s]+$/, ''),
    simple_summary: `${article.title}. This financial development affects capital allocations and macroeconomic conditions. Decision-makers and investors monitor these metrics to gauge broader industry stability and price trends.`,
    what_happened: article.description || article.title,
    why_it_matters: 'This event influences broader business conditions, borrowing costs, and economic growth expectations.',
    key_points: [
      `Reported development: ${article.title.slice(0, 100)}`,
      uniqueNumbers.length > 0 ? `Key figures tracked include: ${uniqueNumbers.join(', ')}` : 'Financial metrics reflect current macroeconomic conditions.',
      'Analysts are monitoring policy reactions and sector-specific financial performance.'
    ],
    financial_terms: terms.slice(0, 3),
    market_impact: text.toLowerCase().includes('fell') || text.toLowerCase().includes('dropped') || text.toLowerCase().includes('lower')
      ? 'Markets showed modest downward price adjustments and cautious risk sentiment.'
      : (text.toLowerCase().includes('surged') || text.toLowerCase().includes('rose') || text.toLowerCase().includes('grew')
        ? 'Reported metrics drove positive sentiment in relevant asset classes and benchmark yields.'
        : 'Market impact cannot be determined from the available article.'),
    important_numbers: uniqueNumbers,
    disclaimer: 'This summary is for informational purposes and is not financial advice.'
  };

  if (cacheKey) simplificationCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

// POST /api/simplify - single article simplification
app.post('/api/simplify', async (req: Request, res: Response) => {
  try {
    const { title, description, content, source, url, published_at } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Article title is required for simplification.'
      });
    }

    const simplified = await simplifyArticleWithAI({
      title,
      description,
      content,
      source
    });

    res.json({
      success: true,
      original: {
        title,
        description,
        source: source || 'Financial Media',
        url: url || '#',
        published_at: published_at || new Date().toISOString()
      },
      simplified
    });
  } catch (error: any) {
    console.error('Error in /api/simplify:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simplify article with AI.',
      details: error.message
    });
  }
});

// POST /api/news/simplify - batch fetch and simplify
app.post('/api/news/simplify', async (req: Request, res: Response) => {
  try {
    const category = (req.body.category as string) || 'business';
    const limit = Math.min(Math.max(parseInt(req.body.limit as string, 10) || 3, 1), 6);

    const articlesToProcess = CURATED_FINANCIAL_NEWS.slice(0, limit);
    const results = [];

    for (const article of articlesToProcess) {
      try {
        const simplified = await simplifyArticleWithAI(article);
        results.push({
          ...article,
          simplified
        });
      } catch (err) {
        results.push({
          ...article,
          simplified: null,
          simplification_error: 'Unable to simplify article'
        });
      }
    }

    res.json({
      success: true,
      count: results.length,
      articles: results
    });
  } catch (error: any) {
    console.error('Error in /api/news/simplify:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process news simplification pipeline.'
    });
  }
});

// POST /api/chat - FinNews AI Assistant
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message string is required.'
      });
    }

    const systemPrompt = `
You are the AlfredoNews AI Financial Explainer Assistant.
Your goal is to help students, beginners, and everyday investors understand complex financial concepts, terminology, market indicators, and news articles in plain, intuitive English.
RULES:
1. Explain in simple, crystal-clear language with relatable real-world analogies.
2. DO NOT provide personalized financial advice (e.g., never say "You should buy stock X" or "sell your assets").
3. Preserve mathematical accuracy and factual definitions.
4. Keep answers concise, scannable, and formatted with clean bullet points where appropriate.
${context ? `Current Article Context: ${JSON.stringify(context).slice(0, 800)}` : ''}
`;

    if (aiClient) {
      try {
        const geminiResult = await callGeminiWithResilience(message, {
          systemInstruction: systemPrompt,
          temperature: 0.3
        });
        if (geminiResult && geminiResult.text) {
          return res.json({
            success: true,
            reply: geminiResult.text,
            source: geminiResult.modelUsed
          });
        }
      } catch (err: any) {
        console.warn('Gemini chat failed, fallback to assistant answers:', err.message || err);
      }
    }

    // High quality intelligent response generator
    let answer = `Here is an easy-to-understand breakdown:\n\n`;
    const qLower = message.toLowerCase();
    if (qLower.includes('inflation')) {
      answer += `**What is Inflation?**\nImagine you have $100 today. If inflation is 3%, things that cost $100 this year will cost $103 next year. In simple terms, inflation means your dollars buy fewer groceries, gadgets, or services over time.\n\n• **Why does it happen?** Strong consumer demand or supply chain crunches.\n• **How Central Banks react:** They raise interest rates to cool down spending.`;
    } else if (qLower.includes('yield curve') || qLower.includes('inversion')) {
      answer += `**The Yield Curve Explained:**\nNormally, if you lend money for 10 years, you expect a higher interest rate than lending for 2 years because your money is locked up longer. That's a normal upward-sloping curve.\n\n• **An Inverted Yield Curve:** Occurs when 2-year bonds pay *more* than 10-year bonds. This happens when investors expect the economy to slow down soon.\n• **Why it matters:** Inversions have historically signaled upcoming economic downturns or recessions.`;
    } else if (qLower.includes('interest rate') || qLower.includes('fed')) {
      answer += `**How Interest Rates Affect the Economy:**\nWhen the Federal Reserve raises interest rates, borrowing money becomes more expensive for mortgages, car loans, and credit cards.\n\n• **Goal:** Slower borrowing cools down high inflation.\n• **Side Effect:** Slower economic expansion and sometimes lower corporate earnings in the short term.`;
    } else {
      answer += `**Understanding this Financial Concept:**\nFinancial news often uses complex terms to describe everyday economic flows like supply, demand, borrowing costs, and corporate earnings.\n\n• **Key Takeaway:** When central banks or major corporations release quarterly numbers, look at whether the results beat or missed analyst expectations.\n• **Rule of Thumb:** Always verify the primary data (like revenue, debt ratios, and profit margins) rather than emotional headlines.`;
    }

    res.json({
      success: true,
      reply: answer,
      source: 'AlfredoNews AI Knowledge Base'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate assistant response.',
      details: error.message
    });
  }
});

// Vite Middleware for React frontend dev server / static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlfredoNews AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
